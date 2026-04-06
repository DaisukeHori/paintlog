'use client';

import { useRef, useCallback, useEffect } from 'react';

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
  /** Custom color function: receives value, returns CSS color string */
  colorFn?: (v: number) => string;
}

export default function StepperInput({
  label, unit, value, onChange,
  step = 1, min = -20, max = 100, decimals = 0,
  presets, pinned, onPin,
  showBar, barColor = '#D35322', barMax,
  warningThreshold, dangerThreshold, colorFn,
}: StepperInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderMax = barMax ?? max;

  const adjust = useCallback((d: number) => {
    const current = value ?? 0;
    const next = Math.round((current + d) * 1000) / 1000;
    if (next >= min && next <= max) onChange(next);
  }, [value, min, max, onChange]);

  const startHold = (d: number) => { adjust(d); intervalRef.current = setInterval(() => adjust(d), 150); };
  const stopHold = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  useEffect(() => () => stopHold(), []);

  const displayVal = value !== null && value !== undefined
    ? decimals > 0 ? value.toFixed(decimals) : String(value) : '--';

  // Track color
  let trackColor = barColor;
  if (value !== null) {
    if (colorFn) {
      trackColor = colorFn(value);
    } else if (dangerThreshold && value > dangerThreshold) {
      trackColor = '#C53030';
    } else if (warningThreshold && value > warningThreshold) {
      trackColor = '#B8860B';
    }
  }

  const pct = value !== null ? Math.max(0, Math.min(100, ((value - min) / (sliderMax - min)) * 100)) : 0;

  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-xs text-stone-500 font-medium">{label}</span>
        {pinned !== undefined && (
          <button onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${pinned ? 'bg-purple-100 text-purple-600' : 'text-stone-400'}`}>
            📌
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        <button className="min-w-[44px] h-[44px] rounded-xl bg-stone-100 active:bg-stone-200 flex items-center justify-center text-xl select-none touch-manipulation font-medium"
          onPointerDown={() => startHold(-step)} onPointerUp={stopHold} onPointerLeave={stopHold}>−</button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-semibold tabular-nums" style={colorFn && value !== null ? { color: trackColor } : undefined}>{displayVal}</span>
          <span className="text-xs text-stone-400 ml-1">{unit}</span>
        </div>
        <button className="min-w-[44px] h-[44px] rounded-xl bg-stone-100 active:bg-stone-200 flex items-center justify-center text-xl select-none touch-manipulation font-medium"
          onPointerDown={() => startHold(step)} onPointerUp={stopHold} onPointerLeave={stopHold}>+</button>
      </div>

      {/* Slider track */}
      <div className="mt-2 relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${pct}%`, backgroundColor: trackColor }} />
        </div>
        <input type="range" min={min} max={sliderMax} step={step}
          value={value ?? min}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(decimals > 0 ? Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals) : v);
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer touch-manipulation" style={{ height: '24px', margin: 0 }} />
        <div className="absolute -bottom-0.5 inset-x-0 flex justify-between text-[9px] text-stone-300 px-0.5">
          <span>{decimals > 0 ? min.toFixed(decimals) : min}</span>
          <span>{decimals > 0 ? sliderMax.toFixed(decimals) : sliderMax}</span>
        </div>
      </div>

      {/* Presets */}
      {presets && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {presets.map((p) => (
            <button key={p} onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs touch-manipulation ${
                value === p ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-stone-50 text-stone-500 border border-stone-200'
              }`}>
              {decimals > 0 ? p.toFixed(decimals) : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
