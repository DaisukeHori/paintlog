'use client';

import { useRef, useEffect, useCallback } from 'react';
import { turnsToDisplay } from '@/lib/types';

interface TurnsInputProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
  pinned?: boolean;
  onPin?: () => void;
}

export default function TurnsInput({
  label,
  value,
  onChange,
  max = 5,
  pinned,
  onPin,
}: TurnsInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = value ?? 0;

  const adjust = useCallback(
    (d: number) => {
      const next = Math.round((current + d) * 4) / 4;
      if (next >= 0 && next <= max) onChange(next);
    },
    [current, max, onChange]
  );

  const startHold = (d: number) => {
    adjust(d);
    intervalRef.current = setInterval(() => adjust(d), 200);
  };

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopHold(), []);

  // ビジュアル：フルドット＋端数ドット
  const fullDots = Math.floor(current);
  const frac = current - fullDots;

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-stone-500">{label}</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned
                ? 'bg-purple-100 text-purple-600'
                : 'text-stone-400 hover:bg-stone-100'
            }`}
          >
            📌
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="min-w-[48px] h-[48px] rounded-xl bg-stone-100 active:bg-gray-200 flex items-center justify-center text-2xl select-none touch-manipulation"
          onPointerDown={() => startHold(-0.25)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
        >
          −
        </button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-medium">
            {turnsToDisplay(current)}
          </div>
          <div className="text-[11px] text-stone-400">回転</div>
        </div>
        <button
          className="min-w-[48px] h-[48px] rounded-xl bg-stone-100 active:bg-gray-200 flex items-center justify-center text-2xl select-none touch-manipulation"
          onPointerDown={() => startHold(0.25)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
        >
          +
        </button>
      </div>
      {/* ドットビジュアル */}
      <div className="flex gap-1 mt-2 items-center">
        {Array.from({ length: fullDots }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full bg-purple-600 border-2 border-purple-600"
          />
        ))}
        {frac > 0 && (
          <div
            className="w-5 h-5 rounded-full border-2 border-purple-600"
            style={{
              background: `conic-gradient(#7c3aed 0deg ${frac * 360}deg, transparent ${frac * 360}deg 360deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
