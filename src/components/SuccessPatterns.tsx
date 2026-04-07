'use client';

import { useState, useEffect, useRef } from 'react';
import { FEATURES } from '@/lib/clustering';
import type { PatternResult } from '@/lib/clustering';

const CLUSTER_COLORS = ['#2563EB', '#D35322', '#16A34A', '#7C3AED'];
const CLUSTER_BG = ['rgba(37,99,235,0.08)', 'rgba(211,83,34,0.08)', 'rgba(22,163,74,0.08)', 'rgba(124,58,237,0.08)'];
const CLUSTER_NAMES = ['パターンA', 'パターンB', 'パターンC', 'パターンD'];

export function SuccessPatterns() {
  const [result, setResult] = useState<(PatternResult & { aiInterpretation?: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const radarRef = useRef<HTMLCanvasElement>(null);
  const importanceRef = useRef<HTMLCanvasElement>(null);

  async function analyze() {
    setLoading(true); setError('');
    const res = await fetch('/api/ai/patterns', { method: 'POST' });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setResult(data);
    setLoading(false);
  }

  // Chart.js描画
  useEffect(() => {
    if (!result) return;
    let charts: any[] = [];
    import('chart.js/auto').then(({ default: Chart }) => {
      // レーダーチャート: 各クラスタのプロファイル
      if (radarRef.current) {
        const labels = FEATURES.map(f => f.label);
        // 各クラスタのセントロイドを正規化（0-1）
        const allRanges = FEATURES.map((_, fi) => {
          const allVals = result.clusters.flatMap(c => [c.ranges[fi].min, c.ranges[fi].max]);
          return { min: Math.min(...allVals), max: Math.max(...allVals) };
        });
        const datasets = result.clusters.map((cluster, ci) => ({
          label: `${CLUSTER_NAMES[ci]} (${cluster.size}件, 成功率${cluster.successRate}%)`,
          data: cluster.rawCentroid.map((v, fi) => {
            const range = allRanges[fi].max - allRanges[fi].min;
            return range === 0 ? 0.5 : (v - allRanges[fi].min) / range;
          }),
          backgroundColor: `${CLUSTER_COLORS[ci]}20`,
          borderColor: CLUSTER_COLORS[ci],
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: CLUSTER_COLORS[ci],
        }));
        charts.push(new Chart(radarRef.current, {
          type: 'radar',
          data: { labels, datasets },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { min: 0, max: 1, ticks: { display: false }, grid: { color: '#E0DED8' }, pointLabels: { font: { size: 10 } } } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
          },
        }));
      }

      // 特徴量重要度バー
      if (importanceRef.current) {
        const sorted = [...result.featureImportance].sort((a, b) => b.score - a.score);
        charts.push(new Chart(importanceRef.current, {
          type: 'bar',
          data: {
            labels: sorted.map(f => f.label),
            datasets: [{
              label: '影響度',
              data: sorted.map(f => f.score),
              backgroundColor: sorted.map(f => f.score > 60 ? '#C53030' : f.score > 30 ? '#D35322' : '#0D9488'),
              borderRadius: 4,
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { max: 100, ticks: { callback: (v: any) => v + '%' } } },
          },
        }));
      }
    });
    return () => { charts.forEach(c => c.destroy()); };
  }, [result]);

  return (
    <div className="pl-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">🔬 成功パターン発見</div>
          <div className="text-[10px]" style={{ color: 'var(--pl-text-3)' }}>データから高歩留まりの条件パターンを自動発見（上位25%を基準）</div>
        </div>
        <button onClick={analyze} disabled={loading}
          className="px-4 py-2 text-xs font-semibold rounded-lg touch-manipulation text-white" style={{ background: loading ? 'var(--pl-text-3)' : 'var(--pl-accent)' }}>
          {loading ? '分析中...' : '分析実行'}
        </button>
      </div>

      {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }}>{error}</div>}

      {result && (
        <div className="space-y-4 mt-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="pl-stat">
              <div className="pl-stat-value" style={{ color: 'var(--pl-success)' }}>{result.highYieldAvg}%</div>
              <div className="pl-stat-label">上位群の平均歩留</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value" style={{ color: 'var(--pl-danger)' }}>{result.lowYieldAvg}%</div>
              <div className="pl-stat-label">下位群の平均歩留</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value">{result.totalHighYield}<span className="text-sm text-stone-400">件</span></div>
              <div className="pl-stat-label">上位（{result.yieldThreshold}%↑）</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value">{result.clusters.length}</div>
              <div className="pl-stat-label">パターン数</div>
            </div>
          </div>

          {/* AI Interpretation */}
          {result.aiInterpretation && (
            <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: 'var(--pl-purple-soft)', color: 'var(--pl-text)' }}>
              <span className="font-semibold" style={{ color: 'var(--pl-purple)' }}>🤖 AI解釈: </span>
              {result.aiInterpretation}
            </div>
          )}

          {/* Radar chart */}
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pl-text-2)' }}>パターン比較（レーダー）</div>
            <div style={{ position: 'relative', height: '280px' }}><canvas ref={radarRef} /></div>
          </div>

          {/* Cluster recipe cards */}
          <div className="space-y-2">
            {result.clusters.map((cluster, ci) => (
              <div key={cluster.id} className="rounded-xl p-3 border" style={{ background: CLUSTER_BG[ci], borderColor: `${CLUSTER_COLORS[ci]}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[ci] }} />
                    <span className="text-sm font-semibold">{CLUSTER_NAMES[ci]}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: CLUSTER_COLORS[ci] }}>
                      {cluster.size}件
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: cluster.avgYield >= 70 ? 'var(--pl-success)' : cluster.avgYield >= 50 ? 'var(--pl-warn)' : 'var(--pl-danger)' }}>
                    平均歩留{cluster.avgYield}%
                  </span>
                </div>
                <div className="text-[11px] mb-2" style={{ color: 'var(--pl-text-2)' }}>{cluster.description}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {cluster.ranges.map(r => (
                    <div key={r.key} className="flex justify-between text-[10px]">
                      <span style={{ color: 'var(--pl-text-3)' }}>{r.label}</span>
                      <span className="font-medium tabular-nums">
                        {r.key === 'air_pressure' ? `${r.min.toFixed(2)}〜${r.max.toFixed(2)}` : `${Math.round(r.min)}〜${Math.round(r.max)}`}
                        <span className="text-stone-400 ml-0.5">{r.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Feature importance */}
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pl-text-2)' }}>歩留まりを左右する要因（重要度）</div>
            <div className="text-[10px] mb-1" style={{ color: 'var(--pl-text-3)' }}>高いほど高歩留・低歩留の差が大きい項目</div>
            <div style={{ position: 'relative', height: '180px' }}><canvas ref={importanceRef} /></div>
          </div>

          {/* Success vs Failure comparison */}
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>高歩留まり時 vs 低歩留まり時の平均比較</div>
            <div className="space-y-1">
              {result.successVsFailure.map(f => {
                const absDiff = Math.abs(f.diff);
                const isSignificant = result.featureImportance.find(fi => fi.key === f.key)?.score ?? 0;
                return (
                  <div key={f.key} className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded-lg bg-white border border-stone-100">
                    <span className="w-14 text-stone-400 flex-shrink-0">{f.label}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="font-medium" style={{ color: 'var(--pl-success)' }}>{f.successAvg}{f.unit}</span>
                      <span className="text-stone-300">→</span>
                      <span className="font-medium" style={{ color: 'var(--pl-danger)' }}>{f.failureAvg}{f.unit}</span>
                    </div>
                    {isSignificant > 30 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{
                        background: f.diff > 0 ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
                        color: f.diff > 0 ? 'var(--pl-success)' : 'var(--pl-danger)',
                      }}>
                        {f.diff > 0 ? '↑' : '↓'}{f.key === 'air_pressure' ? absDiff.toFixed(2) : Math.round(absDiff)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
