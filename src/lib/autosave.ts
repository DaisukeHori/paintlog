'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaintLogInput } from '@/lib/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * DB上の既存レコードに対する自動保存フック
 * logIdがnullの間（下書き状態）はDB保存しない
 */
export function useAutoSave(logId: string | null) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const save = useCallback(
    (fields: Partial<PaintLogInput>) => {
      if (!logId) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      setStatus('saving');
      timerRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('paint_logs')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', logId);
          if (error) {
            console.error('自動保存エラー:', error);
            setStatus('error');
          } else {
            setStatus('saved');
            setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
          }
        } catch {
          setStatus('error');
        }
      }, 500);
    },
    [logId, supabase]
  );

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { save, status };
}
