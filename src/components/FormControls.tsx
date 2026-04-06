'use client';

import { DEFECT_OPTIONS } from '@/lib/types';

// 不具合 — タップで重症度 ×1→×2→×3→×4→×5→0
interface DefectChipsProps {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}

const SEVERITY_COLORS = [
  '', // 0 unused
  'bg-amber-50 border-amber-300 text-amber-700',     // ×1 軽微
  'bg-orange-50 border-orange-300 text-orange-700',   // ×2
  'bg-red-50 border-red-300 text-red-700',            // ×3
  'bg-red-100 border-red-400 text-red-800',           // ×4
  'bg-red-200 border-red-500 text-red-900 font-bold', // ×5 最悪
];

export function DefectChips({ value, onChange }: DefectChipsProps) {
  const cycle = (d: string) => {
    const current = value[d] || 0;
    const next = current >= 5 ? 0 : current + 1;
    const updated = { ...value };
    if (next === 0) { delete updated[d]; } else { updated[d] = next; }
    onChange(updated);
  };

  const totalCount = Object.values(value).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-500">不具合（タップで重症度UP）</span>
        {totalCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
            計{totalCount}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFECT_OPTIONS.map((d) => {
          const severity = value[d] || 0;
          return (
            <button key={d} onClick={() => cycle(d)}
              className={`px-3 py-2.5 rounded-full text-sm touch-manipulation border min-h-[44px] transition-all ${
                severity > 0 ? SEVERITY_COLORS[severity] : 'bg-white border-stone-200 text-stone-400'
              }`}>
              {d}
              {severity > 0 && <span className="ml-1 font-bold">×{severity}</span>}
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-stone-400 mt-1.5">
        {totalCount === 0 ? '選択なし = 不具合なし' : 'タップで×1→×5、もう一回で解除'}
      </div>
    </div>
  );
}

// コート数セレクタ
interface CoatSelectorProps {
  value: number | null;
  onChange: (v: number) => void;
  pinned?: boolean;
  onPin?: () => void;
}

export function CoatSelector({ value, onChange, pinned, onPin }: CoatSelectorProps) {
  const options = [1, 2, 3, 4, 5, 6];
  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-stone-500">コート数</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned ? 'bg-purple-100 text-purple-600' : 'text-stone-400'
            }`}
          >
            📌
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`min-w-[48px] h-[48px] rounded-xl flex items-center justify-center text-base font-medium touch-manipulation border ${
              value === n
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-stone-200 text-stone-500'
            }`}
          >
            {n === 6 ? '6+' : n}
          </button>
        ))}
      </div>
    </div>
  );
}

// スライダー入力
interface SliderInputProps {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  pinned?: boolean;
  onPin?: () => void;
}

export function SliderInput({
  label,
  unit,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  pinned,
  onPin,
}: SliderInputProps) {
  const current = value ?? min;
  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-stone-500">{label}</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned ? 'bg-purple-100 text-purple-600' : 'text-stone-400'
            }`}
          >
            📌
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-3 touch-manipulation accent-blue-600"
          style={{ WebkitAppearance: 'none', height: '12px' }}
        />
        <div className="min-w-[60px] text-right">
          <span className="text-xl font-medium tabular-nums">{current}</span>
          <span className="text-xs text-stone-400 ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}
