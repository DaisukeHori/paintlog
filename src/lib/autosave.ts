'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaintLogInput } from '@/lib/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(logId: string | null) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const save = useCallback(
    (fields: Partial<PaintLogInput>) => {
      if (!logId) return;
      // 前回のタイマーをクリア
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
            // 3秒後にidleに戻す
            setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
          }
        } catch {
          setStatus('error');
        }
      }, 500);
    },
    [logId, supabase]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { save, status };
}

// 新規レコード作成（空）→ IDを返す
export async function createBlankLog(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // デフォルト値とピン値を取得
  const { data: defaults } = await supabase
    .from('user_defaults')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: lastLog } = await supabase
    .from('paint_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('painted_at', { ascending: false })
    .limit(1)
    .single();

  const pinned = defaults?.pinned_fields || {};
  const useLastValue = defaults?.use_last_value !== false;

  // 初期値を構築
  const initial: Record<string, unknown> = {
    user_id: user.id,
    painted_at: new Date().toISOString(),
    defects: [],
    photo_urls: [],
    video_urls: [],
    custom_fields: {},
  };

  // ピン値を適用
  Object.entries(pinned).forEach(([k, v]) => {
    initial[k] = v;
  });

  // ピンされていない項目は前回値
  const lastValueFields = [
    'ambient_temp', 'ambient_humidity', 'booth_temp', 'workpiece_temp', 'paint_temp',
    'paint_type', 'paint_product', 'dilution_ratio', 'paint_lot',
    'air_pressure', 'throttle_turns', 'needle_turns', 'gun_type', 'gun_distance',
    'coat_count', 'surface_prep', 'drying_method', 'film_thickness', 'fan_power',
  ];
  if (lastLog && useLastValue) {
    lastValueFields.forEach((k) => {
      if (!(k in pinned) && (lastLog as any)[k] !== null) {
        initial[k] = (lastLog as any)[k];
      }
    });
  }

  const { data, error } = await supabase
    .from('paint_logs')
    .insert(initial)
    .select('id')
    .single();

  if (error) {
    console.error('作成エラー:', error);
    return null;
  }
  return data.id;
}
