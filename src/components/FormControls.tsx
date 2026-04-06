'use client';

import { DEFECT_OPTIONS } from '@/lib/types';

// 不具合トグルチップ
interface DefectChipsProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function DefectChips({ value, onChange }: DefectChipsProps) {
  const toggle = (d: string) => {
    if (value.includes(d)) {
      onChange(value.filter((v) => v !== d));
    } else {
      onChange([...value, d]);
    }
  };

  return (
    <div>
      <span className="text-xs text-gray-500 mb-1 block">不具合（タップで選択）</span>
      <div className="flex flex-wrap gap-2">
        {DEFECT_OPTIONS.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              className={`px-4 py-2.5 rounded-full text-sm touch-manipulation border ${
                on
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        選択なし = 不具合なし
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
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-gray-500">コート数</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned ? 'bg-purple-100 text-purple-700' : 'text-gray-300'
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
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600'
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
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned ? 'bg-purple-100 text-purple-700' : 'text-gray-300'
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
          <span className="text-xs text-gray-400 ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}
