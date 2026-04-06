'use client';

import { DEFECT_OPTIONS } from '@/lib/types';

// 不具合 — タップでNG枚数カウントアップ（MAX=バッチ枚数）
interface DefectChipsProps {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  batchSize?: number;
}

export function DefectChips({ value, onChange, batchSize = 20 }: DefectChipsProps) {
  const cycle = (d: string) => {
    const current = value[d] || 0;
    const next = current >= batchSize ? 0 : current + 1;
    const updated = { ...value };
    if (next === 0) { delete updated[d]; } else { updated[d] = next; }
    onChange(updated);
  };

  // 長押しで+5
  const handleHold = (d: string) => {
    const current = value[d] || 0;
    const next = Math.min(current + 5, batchSize);
    const updated = { ...value };
    if (next === 0) { delete updated[d]; } else { updated[d] = next; }
    onChange(updated);
  };

  const totalNG = Object.values(value).reduce((a, b) => Math.max(a, b), 0); // 最大NG（重複ありうるので）
  const uniqueNG = Object.values(value).reduce((a, b) => a + b, 0); // 延べNG

  // 色: NG枚数 / バッチ枚数 の比率で
  const getColor = (count: number) => {
    const ratio = count / batchSize;
    if (ratio === 0) return 'bg-white border-stone-200 text-stone-400';
    if (ratio <= 0.1) return 'bg-amber-50 border-amber-300 text-amber-700';
    if (ratio <= 0.2) return 'bg-orange-50 border-orange-300 text-orange-700';
    if (ratio <= 0.4) return 'bg-red-50 border-red-300 text-red-700';
    return 'bg-red-100 border-red-400 text-red-800 font-bold';
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-500">不具合タイプ別NG枚数</span>
        {uniqueNG > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
            延べ{uniqueNG}枚
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFECT_OPTIONS.map((d) => {
          const count = value[d] || 0;
          return (
            <button key={d} onClick={() => cycle(d)}
              onContextMenu={(e) => { e.preventDefault(); handleHold(d); }}
              className={`px-3 py-2.5 rounded-full text-sm touch-manipulation border min-h-[44px] transition-all ${getColor(count)}`}>
              {d}
              {count > 0 && <span className="ml-1 font-bold">{count}枚</span>}
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-stone-400 mt-1.5">
        {uniqueNG === 0 ? 'タップでNG枚数をカウント（不具合なし=タップしない）' : `タップで+1、${batchSize}枚でリセット`}
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
