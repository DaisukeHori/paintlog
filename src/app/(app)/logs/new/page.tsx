'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNewDraft, loadDraft, Draft } from '@/lib/draft';
import LogEditor from '@/components/LogEditor';

export default function NewLogPage() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 既存の下書きがあればそれを使う
      const existing = loadDraft();
      if (existing && !existing.dbId) {
        setDraft(existing);
      } else {
        const newDraft = await createNewDraft();
        setDraft(newDraft);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">🎨</div>
          <div className="text-sm">準備中...</div>
        </div>
      </div>
    );
  }

  return (
    <LogEditor
      initialDraft={draft}
      onPromotedToDb={(id) => {
        // DB保存完了 → URLをIDベースに切り替え（ブラウザ履歴は置き換え）
        router.replace(`/logs/${id}`);
      }}
    />
  );
}
