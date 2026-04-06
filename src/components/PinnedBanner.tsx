'use client';

import { useState } from 'react';

interface PinnedBannerProps {
  pinnedFields: Record<string, unknown>;
  fieldLabels: Record<string, string>;
}

export default function PinnedBanner({ pinnedFields, fieldLabels }: PinnedBannerProps) {
  const [visible, setVisible] = useState(true);
  const entries = Object.entries(pinnedFields);

  if (!visible || entries.length === 0) return null;

  return (
    <div className="mx-4 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl relative">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-purple-400 rounded-full hover:bg-purple-100 touch-manipulation"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">📌</span>
        <span className="text-xs font-medium text-purple-600">
          固定値を適用しました
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([key, val]) => (
          <span key={key} className="text-[11px] text-purple-600">
            {fieldLabels[key] || key}: <span className="font-medium">{String(val)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
