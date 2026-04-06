'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadDraft, clearDraft, Draft } from '@/lib/draft';
import { format } from 'date-fns';

export default function DraftBanner() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const router = useRouter();

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  if (!draft || draft.dbId) return null;

  return (
    <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-amber-700 mb-0.5">
            下書きがあります
          </div>
          <div className="text-[11px] text-amber-600">
            {draft.form.paint_type || '種類未設定'}
            {' · '}
            {format(new Date(draft.createdAt), 'M/d HH:mm')}作成
            {draft.touchedFields.length > 0 && ` · ${draft.touchedFields.length}項目入力済み`}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { clearDraft(); setDraft(null); }}
            className="px-3 py-1.5 text-xs text-amber-600 border border-amber-300 rounded-lg touch-manipulation"
          >
            破棄
          </button>
          <button
            onClick={() => router.push('/logs/new')}
            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg touch-manipulation"
          >
            続ける
          </button>
        </div>
      </div>
    </div>
  );
}
