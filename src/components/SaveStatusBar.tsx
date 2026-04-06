'use client';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SaveStatusBar({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  const config = {
    saving: { text: '保存中...', bg: 'bg-blue-50', color: 'text-blue-600' },
    saved: { text: '✓ 保存済み', bg: 'bg-green-50', color: 'text-green-600' },
    error: { text: '⚠ 保存エラー', bg: 'bg-red-50', color: 'text-red-600' },
  }[status];

  return (
    <div className={`fixed top-[env(safe-area-inset-top)] left-0 right-0 z-50 ${config.bg} ${config.color} text-center text-xs py-1.5 font-medium transition-all`}>
      {config.text}
    </div>
  );
}
