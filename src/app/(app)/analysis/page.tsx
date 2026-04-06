'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaintLog } from '@/lib/types';
import { AiChat, MonthlyReport } from '@/components/AiFeatures';
import { SuccessPatterns } from '@/components/SuccessPatterns';
import { AnalysisExplainer } from '@/components/AnalysisExplainer';

export default function AnalysisPage() {
  const [logs, setLogs] = useState<PaintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'data' | 'howto'>('data');
  const trendRef = useRef<HTMLCanvasElement>(null);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const defectPieRef = useRef<HTMLCanvasElement>(null);
  const pressureRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await createClient().from('paint_logs').select('*').order('painted_at', { ascending: true }).limit(200);
      setLogs((data as PaintLog[]) || []);
      setLoading(false);
    })();
  }, []);

  // 統計データ
  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    // 歩留まり計算
    const yields = logs.map((l) => {
      const bs = (l as any).batch_size || 20;
      const dc = (l as any).defect_count || 0;
      return bs > 0 ? ((bs - dc) / bs) * 100 : 100;
    });
    const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
    const thicknesses = logs.filter((l) => l.film_thickness !== null).map((l) => l.film_thickness!);
    const avgThickness = thicknesses.length > 0 ? thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length : 0;
    // 総バッチ枚数と総NG
    const totalBatch = logs.reduce((s, l) => s + ((l as any).batch_size || 20), 0);
    const totalNG = logs.reduce((s, l) => s + ((l as any).defect_count || 0), 0);
    // 不具合タイプ集計
    const defectCounts: Record<string, number> = {};
    logs.forEach((l) => Object.entries(l.defects || {}).forEach(([d, count]) => { defectCounts[d] = (defectCounts[d] || 0) + (count as number); }));
    // 週ごとの歩留まり平均
    const weeklyMap: Record<string, { yields: number[] }> = {};
    logs.forEach((l, i) => {
      const d = new Date(l.painted_at);
      const key = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}w`;
      if (!weeklyMap[key]) weeklyMap[key] = { yields: [] };
      weeklyMap[key].yields.push(yields[i]);
    });
    return { total: logs.length, avgYield: Math.round(avgYield * 10) / 10, totalBatch, totalNG, avgThickness: Math.round(avgThickness), defectCounts, weeklyMap };
  }, [logs]);

  // Chart.js描画
  useEffect(() => {
    if (!stats || logs.length === 0) return;
    let charts: any[] = [];
    import('chart.js/auto').then(({ default: Chart }) => {
      // 1. 歩留まり推移（棒グラフ）
      if (trendRef.current) {
        const weeks = Object.keys(stats.weeklyMap);
        const rates = weeks.map((w) => {
          const ys = stats.weeklyMap[w].yields;
          return Math.round(ys.reduce((a: number, b: number) => a + b, 0) / ys.length);
        });
        charts.push(new Chart(trendRef.current, {
          type: 'bar',
          data: {
            labels: weeks,
            datasets: [{
              label: '歩留まり %',
              data: rates,
              backgroundColor: rates.map((r) => r >= 95 ? '#16A34A80' : r >= 80 ? '#B8860B60' : '#C5303080'),
              borderRadius: 6,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v: any) => v + '%' } } } },
        }));
      }

      // 2. 温度×湿度 散布図（歩留まり上位/下位で色分け）
      if (scatterRef.current) {
        // 動的閾値: 上位25%を「高歩留まり」
        const yieldsSorted = logs.map(l => {
          const bs = (l as any).batch_size || 20; const dc = (l as any).defect_count || 0;
          return bs > 0 ? ((bs - dc) / bs) : 1;
        }).sort((a, b) => a - b);
        const threshold = yieldsSorted[Math.floor(yieldsSorted.length * 0.75)] ?? 0.5;

        const highYield = logs.filter((l) => {
          const bs = (l as any).batch_size || 20; const dc = (l as any).defect_count || 0;
          return l.ambient_temp !== null && l.ambient_humidity !== null && ((bs - dc) / bs) >= threshold;
        });
        const lowYield = logs.filter((l) => {
          const bs = (l as any).batch_size || 20; const dc = (l as any).defect_count || 0;
          return l.ambient_temp !== null && l.ambient_humidity !== null && ((bs - dc) / bs) < threshold;
        });
        const thPct = Math.round(threshold * 100);
        charts.push(new Chart(scatterRef.current, {
          type: 'scatter',
          data: {
            datasets: [
              { label: `歩留${thPct}%↑`, data: highYield.map((l) => ({ x: l.ambient_temp, y: l.ambient_humidity })), backgroundColor: '#16A34A90', pointRadius: 6 },
              { label: `歩留${thPct}%↓`, data: lowYield.map((l) => ({ x: l.ambient_temp, y: l.ambient_humidity })), backgroundColor: '#C5303090', pointRadius: 6, pointStyle: 'crossRot' },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: '気温 ℃' } }, y: { title: { display: true, text: '湿度 %' } } } },
        }));
      }

      // 3. 不具合タイプ（ドーナツ）
      if (defectPieRef.current && Object.keys(stats.defectCounts).length > 0) {
        const labels = Object.keys(stats.defectCounts);
        const values = Object.values(stats.defectCounts);
        const colors = ['#C53030', '#D35322', '#B8860B', '#7C3AED', '#2563EB', '#0D9488', '#1A8A5C', '#6B6B6B'];
        charts.push(new Chart(defectPieRef.current, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '55%' },
        }));
      }

      // 4. エア圧分布（ヒストグラム風バー）
      if (pressureRef.current) {
        const pressures = logs.filter((l) => l.air_pressure !== null).map((l) => l.air_pressure!);
        if (pressures.length > 0) {
          const bins: Record<string, number> = {};
          pressures.forEach((p) => { const k = (Math.round(p * 20) / 20).toFixed(2); bins[k] = (bins[k] || 0) + 1; });
          const sortedKeys = Object.keys(bins).sort();
          charts.push(new Chart(pressureRef.current, {
            type: 'bar',
            data: { labels: sortedKeys.map((k) => k + ' MPa'), datasets: [{ label: '回数', data: sortedKeys.map((k) => bins[k]), backgroundColor: '#D3532260', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
          }));
        }
      }
    });
    return () => { charts.forEach((c) => c.destroy()); };
  }, [stats, logs]);

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--pl-text-3)' }}>読み込み中...</div>;
  if (logs.length === 0) return (
    <div className="text-center py-20" style={{ color: 'var(--pl-text-3)' }}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--pl-accent-soft)' }}>📊</div>
      データがありません。記録を作成すると分析できます。
    </div>
  );

  return (
    <div>
      <div className="sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)]" style={{ background: 'rgba(246,245,241,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="py-3"><h1 className="text-lg font-bold">分析</h1></div>
        <div className="flex gap-1 p-1 rounded-xl mb-2" style={{ background: 'var(--pl-surface-2)' }}>
          {([['data', 'データ分析'], ['howto', '分析の仕組み']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === t ? 'var(--pl-surface)' : 'transparent',
                color: tab === t ? 'var(--pl-accent)' : 'var(--pl-text-3)',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'howto' ? (
        <div className="px-4 pb-8">
          <AnalysisExplainer />
        </div>
      ) : (
      <div className="px-4 space-y-3 pb-8">
        {/* サマリー */}
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <div className="pl-stat">
              <div className="pl-stat-value" style={{ color: stats.avgYield >= 95 ? 'var(--pl-success)' : stats.avgYield >= 80 ? 'var(--pl-warn)' : 'var(--pl-danger)' }}>
                {stats.avgYield}%
              </div>
              <div className="pl-stat-label">平均歩留まり</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value">{stats.total}</div>
              <div className="pl-stat-label">バッチ数</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value">{stats.totalBatch}<span className="text-sm text-stone-400">枚</span></div>
              <div className="pl-stat-label">総塗装枚数</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value" style={{ color: 'var(--pl-danger)' }}>{stats.totalNG}<span className="text-sm text-stone-400">枚</span></div>
              <div className="pl-stat-label">総NG枚数</div>
            </div>
          </div>
        )}

        {/* 成功パターン発見 */}
        <SuccessPatterns />

        {/* 歩留まり推移 */}
        <div className="pl-card">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>歩留まり推移（週次平均）</div>
          <div style={{ position: 'relative', height: '200px' }}><canvas ref={trendRef} /></div>
        </div>

        {/* 温度×湿度 散布図 */}
        <div className="pl-card">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pl-text-2)' }}>環境条件マップ</div>
          <div className="text-[10px] mb-2" style={{ color: 'var(--pl-text-3)' }}>🟢 上位25% / ❌ 下位 — あなたのデータから好条件ゾーンを可視化</div>
          <div style={{ position: 'relative', height: '240px' }}><canvas ref={scatterRef} /></div>
        </div>

        {/* 不具合タイプ分布 */}
        {stats && Object.keys(stats.defectCounts).length > 0 && (
          <div className="pl-card">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>不具合タイプ別NG枚数</div>
            <div style={{ position: 'relative', height: '200px' }}><canvas ref={defectPieRef} /></div>
          </div>
        )}

        {/* エア圧分布 */}
        <div className="pl-card">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>エア圧の使用分布</div>
          <div style={{ position: 'relative', height: '180px' }}><canvas ref={pressureRef} /></div>
        </div>

        {/* AI機能 */}
        <AiChat />
        <MonthlyReport />
      </div>
      )}
    </div>
  );
}
