'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBlankLog } from '@/lib/autosave';

export default function NewLogPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const id = await createBlankLog();
      if (id) {
        router.replace(`/logs/${id}`);
      } else {
        router.replace('/logs');
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-3xl mb-2 animate-pulse">🎨</div>
        <div className="text-sm">新規記録を作成中...</div>
      </div>
    </div>
  );
}
