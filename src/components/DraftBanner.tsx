'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadDraft, clearDraft, Draft } from '@/lib/draft';
import { formatLocalDate } from '@/lib/date-utils';

export default function DraftBanner() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const router = useRouter();
  useEffect(() => { setDraft(loadDraft()); }, []);
  if (!draft || draft.dbId) return null;
  return (
    <div className="mx-4 mb-3 pl-card" style={{ background: 'var(--pl-warn-soft)', border: '1px solid rgba(184,134,11,0.15)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--pl-warn)' }}>下書きがあります</div>
          <div className="text-[11px]" style={{ color: 'var(--pl-text-3)' }}>
            {draft.form.paint_type || '種類未設定'} · {formatLocalDate(new Date(draft.createdAt).toISOString())}作成
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { clearDraft(); setDraft(null); }} className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-500 touch-manipulation">破棄</button>
          <button onClick={() => router.push('/logs/new')} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white touch-manipulation" style={{ background: 'var(--pl-warn)' }}>続ける</button>
        </div>
      </div>
    </div>
  );
}
