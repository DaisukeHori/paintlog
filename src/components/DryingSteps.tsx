'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DryingStep } from '@/lib/types';

interface DryingStepsProps {
  steps: DryingStep[];
  onChange: (steps: DryingStep[]) => void;
  suggestions: string[];
  onMethodChange: (value: string) => void;
  onDeleteSuggestion: (value: string) => void;
}

// 時間表示ヘルパー
function formatTime(min: number | null): string {
  if (min === null || min === undefined) return '--';
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }
  return `${min}分`;
}

// ミニステッパー（温度・時間・インターバル用）
function MiniStepper({ label, value, onChange, unit, step = 1, min = 0, max = 2880, presets }: {
  label: string; value: number | null; onChange: (v: number) => void; unit: string;
  step?: number; min?: number; max?: number; presets?: { v: number; l: string }[];
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adjust = useCallback((d: number) => {
    const cur = value ?? 0;
    const dynStep = unit === '分' && cur >= 60 && d > 0 ? 60 : unit === '分' && cur > 60 && d < 0 ? 60 : step;
    onChange(Math.max(min, Math.min(max, cur + (d > 0 ? dynStep : -dynStep))));
  }, [value, step, min, max, onChange, unit]);
  const start = (d: number) => { adjust(d); intervalRef.current = setInterval(() => adjust(d), 150); };
  const stop = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  useEffect(() => () => stop(), []);

  const displayVal = unit === '分' ? formatTime(value) : (value !== null ? String(value) : '--');

  return (
    <div>
      <div className="text-[10px] text-stone-400 mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-base select-none touch-manipulation"
          onPointerDown={() => start(-1)} onPointerUp={stop} onPointerLeave={stop}>−</button>
        <div className="flex-1 text-center text-sm font-semibold tabular-nums">{displayVal}
          {unit !== '分' && <span className="text-[10px] text-stone-400 ml-0.5">{unit}</span>}
        </div>
        <button className="w-9 h-9 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-base select-none touch-manipulation"
          onPointerDown={() => start(1)} onPointerUp={stop} onPointerLeave={stop}>+</button>
      </div>
      {presets && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {presets.map(p => (
            <button key={p.v} onClick={() => onChange(p.v)}
              className={`px-2 py-1 rounded text-[10px] touch-manipulation ${
                value === p.v ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-stone-50 text-stone-500 border border-stone-200'
              }`}>{p.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const TIME_PRESETS = [
  { v: 10, l: '10分' }, { v: 30, l: '30分' }, { v: 60, l: '1h' },
  { v: 120, l: '2h' }, { v: 720, l: '12h' }, { v: 1440, l: '24h' },
];
const INTERVAL_PRESETS = [
  { v: 3, l: '3分' }, { v: 5, l: '5分' }, { v: 10, l: '10分' }, { v: 30, l: '30分' }, { v: 60, l: '1h' },
];
const TEMP_PRESETS = [{ v: 60, l: '60' }, { v: 80, l: '80' }, { v: 120, l: '120' }, { v: 140, l: '140' }];

export default function DryingSteps({ steps, onChange, suggestions, onMethodChange, onDeleteSuggestion }: DryingStepsProps) {
  const [showSuggest, setShowSuggest] = useState<number | null>(null);

  const updateStep = (idx: number, partial: Partial<DryingStep>) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...partial } : s);
    onChange(next);
  };

  const addStep = () => {
    onChange([...steps, { method: '', temp: null, time: null, interval: 5 }]);
  };

  const removeStep = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx));
  };

  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500 font-medium">乾燥工程</span>
          <button onClick={addStep}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation text-white"
            style={{ background: 'var(--pl-accent)' }}>
            + 乾燥ステップ追加
          </button>
        </div>
        <div className="text-[10px] text-stone-400 mt-1">乾燥工程を追加してください</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx}>
          {/* インターバル（2ステップ目以降） */}
          {idx > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 mb-2 rounded-lg" style={{ background: 'var(--pl-purple-soft)' }}>
              <span className="text-[10px] font-medium" style={{ color: 'var(--pl-purple)' }}>インターバル</span>
              <div className="flex-1">
                <MiniStepper label="" value={step.interval} onChange={(v) => updateStep(idx, { interval: v })} unit="分" presets={INTERVAL_PRESETS} />
              </div>
            </div>
          )}

          {/* 乾燥ステップ */}
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-stone-500 font-medium">乾燥{idx + 1}</span>
              <button onClick={() => removeStep(idx)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-red-400 hover:bg-red-50 touch-manipulation">✕</button>
            </div>

            {/* 乾燥方法（オートコンプリート） */}
            <div className="relative mb-2">
              <input type="text" value={step.method}
                onChange={(e) => { updateStep(idx, { method: e.target.value }); onMethodChange(e.target.value); setShowSuggest(idx); }}
                onFocus={() => setShowSuggest(idx)}
                onBlur={() => setTimeout(() => setShowSuggest(null), 200)}
                placeholder="自然乾燥・強制乾燥・赤外線..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
              {showSuggest === idx && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-stone-200 max-h-32 overflow-y-auto">
                  {suggestions.filter(s => !step.method || s.includes(step.method)).map(s => (
                    <button key={s} onMouseDown={() => { updateStep(idx, { method: s }); setShowSuggest(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex justify-between">
                      <span>{s}</span>
                      <button onMouseDown={(e) => { e.stopPropagation(); onDeleteSuggestion(s); }}
                        className="text-stone-300 text-xs">✕</button>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 温度 + 時間 */}
            <div className="grid grid-cols-2 gap-3">
              <MiniStepper label="温度" value={step.temp} onChange={(v) => updateStep(idx, { temp: v })} unit="℃" step={5} min={20} max={200} presets={TEMP_PRESETS} />
              <MiniStepper label="時間" value={step.time} onChange={(v) => updateStep(idx, { time: v })} unit="分" presets={TIME_PRESETS} />
            </div>
          </div>
        </div>
      ))}

      {/* 追加ボタン */}
      <button onClick={addStep}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-stone-200 text-xs text-stone-400 font-medium touch-manipulation active:border-orange-300">
        + 乾燥ステップ追加
      </button>
    </div>
  );
}
