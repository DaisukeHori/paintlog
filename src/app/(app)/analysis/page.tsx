'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaintLog } from '@/lib/types';
import { AiChat, MonthlyReport } from '@/components/AiFeatures';

export default function AnalysisPage() {
  const [logs, setLogs] = useState<PaintLog[]>([]);
  const [loading, setLoading] = useState(true);
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
    const defectFree = logs.filter((l) => l.defects.length === 0).length;
    const thicknesses = logs.filter((l) => l.film_thickness !== null).map((l) => l.film_thickness!);
    const avgThickness = thicknesses.length > 0 ? thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length : 0;
    // 不具合タイプ集計
    const defectCounts: Record<string, number> = {};
    logs.forEach((l) => l.defects.forEach((d) => { defectCounts[d] = (defectCounts[d] || 0) + 1; }));
    // 週ごとの不具合率
    const weeklyMap: Record<string, { total: number; defects: number }> = {};
    logs.forEach((l) => {
      const d = new Date(l.painted_at);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      const key = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}w`;
      if (!weeklyMap[key]) weeklyMap[key] = { total: 0, defects: 0 };
      weeklyMap[key].total++;
      if (l.defects.length > 0) weeklyMap[key].defects++;
    });
    return { total: logs.length, defectFree, defectRate: Math.round((1 - defectFree / logs.length) * 100), avgThickness: Math.round(avgThickness), defectCounts, weeklyMap };
  }, [logs]);

  // Chart.js描画
  useEffect(() => {
    if (!stats || logs.length === 0) return;
    let charts: any[] = [];
    import('chart.js/auto').then(({ default: Chart }) => {
      // 1. 不具合率推移（棒グラフ）
      if (trendRef.current) {
        const weeks = Object.keys(stats.weeklyMap);
        const rates = weeks.map((w) => Math.round((stats.weeklyMap[w].defects / stats.weeklyMap[w].total) * 100));
        charts.push(new Chart(trendRef.current, {
          type: 'bar',
          data: {
            labels: weeks,
            datasets: [{
              label: '不具合率 %',
              data: rates,
              backgroundColor: rates.map((r) => r > 30 ? '#C5303080' : r > 15 ? '#B8860B60' : '#1A8A5C60'),
              borderRadius: 6,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { max: 100, ticks: { callback: (v: any) => v + '%' } } } },
        }));
      }

      // 2. 温度×湿度 散布図（不具合あり/なしで色分け）
      if (scatterRef.current) {
        const ok = logs.filter((l) => l.ambient_temp !== null && l.ambient_humidity !== null && l.defects.length === 0);
        const ng = logs.filter((l) => l.ambient_temp !== null && l.ambient_humidity !== null && l.defects.length > 0);
        charts.push(new Chart(scatterRef.current, {
          type: 'scatter',
          data: {
            datasets: [
              { label: '成功', data: ok.map((l) => ({ x: l.ambient_temp, y: l.ambient_humidity })), backgroundColor: '#1A8A5C90', pointRadius: 6 },
              { label: '不具合あり', data: ng.map((l) => ({ x: l.ambient_temp, y: l.ambient_humidity })), backgroundColor: '#C5303090', pointRadius: 6, pointStyle: 'crossRot' },
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
      </div>

      <div className="px-4 space-y-3 pb-8">
        {/* サマリー */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="pl-stat">
              <div className="pl-stat-value">{stats.total}</div>
              <div className="pl-stat-label">総記録数</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value" style={{ color: stats.defectRate > 30 ? 'var(--pl-danger)' : stats.defectRate > 15 ? 'var(--pl-warn)' : 'var(--pl-success)' }}>
                {stats.defectRate}%
              </div>
              <div className="pl-stat-label">不具合率</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-value">{stats.avgThickness}</div>
              <div className="pl-stat-label">平均膜厚 μm</div>
            </div>
          </div>
        )}

        {/* 不具合率推移 */}
        <div className="pl-card">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>不具合率の推移（週次）</div>
          <div style={{ position: 'relative', height: '200px' }}><canvas ref={trendRef} /></div>
        </div>

        {/* 温度×湿度 散布図 */}
        <div className="pl-card">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pl-text-2)' }}>環境条件マップ</div>
          <div className="text-[10px] mb-2" style={{ color: 'var(--pl-text-3)' }}>🟢 成功 / ❌ 不具合あり — 安全な条件ゾーンを可視化</div>
          <div style={{ position: 'relative', height: '240px' }}><canvas ref={scatterRef} /></div>
        </div>

        {/* 不具合タイプ分布 */}
        {stats && Object.keys(stats.defectCounts).length > 0 && (
          <div className="pl-card">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-2)' }}>不具合タイプ別分布</div>
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
    </div>
  );
}
