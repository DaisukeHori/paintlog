'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaintLog } from '@/lib/types';

export default function AnalysisPage() {
  const [logs, setLogs] = useState<PaintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);
  const chartRef3 = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('paint_logs').select('*').order('painted_at', { ascending: true }).limit(200)
      .then(({ data }) => { setLogs((data as PaintLog[]) || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (loading || logs.length === 0) return;
    loadCharts();
  }, [loading, logs]);

  async function loadCharts() {
    const ChartJS = (await import('chart.js/auto')).default;

    // 1. 気温 vs 膜厚 散布図
    const scatter = logs.filter((l) => l.ambient_temp !== null && l.film_thickness !== null);
    if (chartRef1.current && scatter.length > 0) {
      new ChartJS(chartRef1.current, {
        type: 'scatter',
        data: {
          datasets: [{
            label: '気温 vs 膜厚',
            data: scatter.map((l) => ({ x: l.ambient_temp!, y: l.film_thickness! })),
            backgroundColor: 'rgba(37,99,235,0.6)',
            pointRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { x: { title: { display: true, text: '気温 (℃)' } }, y: { title: { display: true, text: '膜厚 (μm)' } } },
          plugins: { legend: { display: false } },
        },
      });
    }

    // 2. 不具合発生率
    const defectCounts: Record<string, number> = {};
    logs.forEach((l) => l.defects.forEach((d) => { defectCounts[d] = (defectCounts[d] || 0) + 1; }));
    const defectLabels = Object.keys(defectCounts);
    if (chartRef2.current && defectLabels.length > 0) {
      new ChartJS(chartRef2.current, {
        type: 'bar',
        data: {
          labels: defectLabels,
          datasets: [{
            label: '発生回数',
            data: defectLabels.map((d) => defectCounts[d]),
            backgroundColor: 'rgba(239,68,68,0.6)',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    }

    // 3. エア圧の推移
    const pressureData = logs.filter((l) => l.air_pressure !== null);
    if (chartRef3.current && pressureData.length > 0) {
      new ChartJS(chartRef3.current, {
        type: 'line',
        data: {
          labels: pressureData.map((l) => new Date(l.painted_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'エア圧 (MPa)',
            data: pressureData.map((l) => l.air_pressure),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13,148,136,0.1)',
            fill: true, tension: 0.3, pointRadius: 4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { title: { display: true, text: 'MPa' } } },
        },
      });
    }
  }

  const totalLogs = logs.length;
  const defectFree = logs.filter((l) => l.defects.length === 0).length;
  const avgThickness = logs.filter((l) => l.film_thickness !== null).reduce((s, l) => s + (l.film_thickness || 0), 0)
    / (logs.filter((l) => l.film_thickness !== null).length || 1);

  return (
    <div>
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-[env(safe-area-inset-top)]">
        <div className="py-3"><h1 className="text-lg font-medium">分析</h1></div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          データがありません。記録を作成すると分析できます。
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-8">
          {/* サマリー */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-medium">{totalLogs}</div>
              <div className="text-[10px] text-gray-500">総記録数</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-medium text-green-600">
                {totalLogs > 0 ? Math.round((defectFree / totalLogs) * 100) : 0}%
              </div>
              <div className="text-[10px] text-gray-500">不具合なし率</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-medium">{Math.round(avgThickness)}</div>
              <div className="text-[10px] text-gray-500">平均膜厚μm</div>
            </div>
          </div>

          {/* チャート1 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 font-medium mb-2">気温 vs 膜厚</div>
            <div style={{ position: 'relative', height: '220px' }}>
              <canvas ref={chartRef1} />
            </div>
          </div>

          {/* チャート2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 font-medium mb-2">不具合発生回数</div>
            <div style={{ position: 'relative', height: '200px' }}>
              <canvas ref={chartRef2} />
            </div>
          </div>

          {/* チャート3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 font-medium mb-2">エア圧の推移</div>
            <div style={{ position: 'relative', height: '200px' }}>
              <canvas ref={chartRef3} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
