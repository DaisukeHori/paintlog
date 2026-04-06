'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface StepperInputProps {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  presets?: number[];
  pinned?: boolean;
  onPin?: () => void;
  showBar?: boolean;
  barColor?: string;
  barMax?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export default function StepperInput({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min = -20,
  max = 100,
  decimals = 0,
  presets,
  pinned,
  onPin,
  showBar,
  barColor = '#378ADD',
  barMax = 100,
  warningThreshold,
  dangerThreshold,
}: StepperInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adjust = useCallback(
    (d: number) => {
      const current = value ?? 0;
      const next = Math.round((current + d) * 1000) / 1000;
      if (next >= min && next <= max) onChange(next);
    },
    [value, min, max, onChange]
  );

  const startHold = (d: number) => {
    adjust(d);
    intervalRef.current = setInterval(() => adjust(d), 150);
  };

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  const displayVal =
    value !== null && value !== undefined
      ? decimals > 0
        ? value.toFixed(decimals)
        : String(value)
      : '--';

  let currentBarColor = barColor;
  if (dangerThreshold && value !== null && value > dangerThreshold) {
    currentBarColor = '#E24B4A';
  } else if (warningThreshold && value !== null && value > warningThreshold) {
    currentBarColor = '#EF9F27';
  }

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
            title={pinned ? 'デフォルト設定済み' : 'デフォルトに設定'}
          >
            📌
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="min-w-[48px] h-[48px] rounded-xl bg-stone-100 active:bg-gray-200 flex items-center justify-center text-2xl select-none touch-manipulation"
          onPointerDown={() => startHold(-step)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-medium tabular-nums">{displayVal}</span>
          <span className="text-xs text-stone-400 ml-1">{unit}</span>
        </div>
        <button
          className="min-w-[48px] h-[48px] rounded-xl bg-stone-100 active:bg-gray-200 flex items-center justify-center text-2xl select-none touch-manipulation"
          onPointerDown={() => startHold(step)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
        >
          +
        </button>
      </div>
      {showBar && value !== null && (
        <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${Math.max(0, Math.min(100, (value / barMax) * 100))}%`,
              backgroundColor: currentBarColor,
            }}
          />
        </div>
      )}
      {presets && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs touch-manipulation ${
                value === p
                  ? 'bg-blue-100 text-blue-600 border border-blue-300'
                  : 'bg-stone-50 text-stone-500 border border-stone-200'
              }`}
            >
              {decimals > 0 ? p.toFixed(decimals) : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
