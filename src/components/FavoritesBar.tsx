'use client';

import { PaintLog, turnsToDisplay } from '@/lib/types';
import { format } from 'date-fns';

interface FavoritesBarProps {
  recentLogs: PaintLog[];
  onSelect: (log: PaintLog) => void;
}

export default function FavoritesBar({ recentLogs, onSelect }: FavoritesBarProps) {
  if (recentLogs.length === 0) return null;

  return (
    <div className="px-4 mb-3">
      <div className="text-xs text-gray-500 mb-1.5">直近の記録からコピー</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recentLogs.map((log) => (
          <button
            key={log.id}
            onClick={() => onSelect(log)}
            className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-left touch-manipulation active:border-blue-300 min-w-[160px]"
          >
            <div className="text-[10px] text-gray-400 mb-0.5">
              {format(new Date(log.painted_at), 'M/d HH:mm')}
            </div>
            <div className="text-xs font-medium truncate">
              {log.paint_type || '種類未設定'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {log.air_pressure ? `${log.air_pressure}MPa` : ''}
              {log.throttle_turns !== null ? ` / ${turnsToDisplay(log.throttle_turns)}T` : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
