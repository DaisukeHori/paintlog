'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaintLog, turnsToDisplay } from '@/lib/types';
import { formatLocalDate } from '@/lib/date-utils';
import DraftBanner from '@/components/DraftBanner';

export default function LogsPage() {
  const [logs, setLogs] = useState<PaintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => { loadLogs(); }, []);
  async function loadLogs() {
    const { data } = await supabase.from('paint_logs').select('*').order('painted_at', { ascending: false }).limit(100);
    setLogs((data as PaintLog[]) || []); setLoading(false);
  }
  const filtered = logs.filter((l) => !filter || l.paint_type?.includes(filter) || l.paint_product?.includes(filter) || l.comment?.includes(filter));

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] pb-3" style={{ background: 'rgba(246,245,241,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between py-3">
          <h1 className="text-lg font-bold">塗装記録</h1>
          <div className="flex items-center gap-2">
            <span className="pl-badge" style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>{logs.length}件</span>
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--pl-border)' }}>
              <button onClick={() => setViewMode('grid')}
                className="px-2.5 py-1.5 text-xs font-semibold touch-manipulation"
                style={{ background: viewMode === 'grid' ? 'var(--pl-accent)' : 'var(--pl-surface)', color: viewMode === 'grid' ? 'white' : 'var(--pl-text-3)' }}>
                ▦
              </button>
              <button onClick={() => setViewMode('list')}
                className="px-2.5 py-1.5 text-xs font-semibold touch-manipulation"
                style={{ background: viewMode === 'list' ? 'var(--pl-accent)' : 'var(--pl-surface)', color: viewMode === 'list' ? 'white' : 'var(--pl-text-3)' }}>
                ☰
              </button>
            </div>
          </div>
        </div>
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="塗料名・品番で検索..." className="pl-input" style={{ minHeight: '44px' }} />
      </div>

      <DraftBanner />

      <div className="px-4 pb-4">
        {loading && <div className="text-center py-16 pl-pulse" style={{ color: 'var(--pl-text-3)' }}>読み込み中...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--pl-text-3)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--pl-accent-soft)' }}>🎨</div>
            <div className="mb-4 text-sm">まだ記録がありません</div>
            <button onClick={() => router.push('/logs/new')} className="pl-btn pl-btn-primary" style={{ width: 'auto', padding: '0 32px', display: 'inline-flex' }}>最初の記録を作成</button>
          </div>
        )}

        {/* Grid view (Mercari-style photo cards) */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {filtered.map((log, i) => (
              <button key={log.id} onClick={() => router.push(`/logs/${log.id}`)}
                className="text-left touch-manipulation active:scale-[0.97] transition-transform rounded-2xl overflow-hidden pl-fade-in"
                style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-border)', animationDelay: `${i * 0.03}s` }}>
                {/* Media area: 写真 > 動画サムネイル > プレースホルダー */}
                <div className="relative aspect-square overflow-hidden" style={{ background: 'var(--pl-surface-2)' }}>
                  {log.photo_urls.length > 0 ? (
                    <img src={log.photo_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : log.video_urls.length > 0 ? (
                    <div className="w-full h-full relative">
                      <video src={log.video_urls[0]} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                          <span className="text-white text-lg ml-0.5">▶</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <span className="text-3xl opacity-30">🎨</span>
                      <span className="text-[10px]" style={{ color: 'var(--pl-text-3)' }}>メディアなし</span>
                    </div>
                  )}
                  {/* Media count badge */}
                  {(log.photo_urls.length + log.video_urls.length) > 1 && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex gap-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
                      {log.photo_urls.length > 0 && <span>📷{log.photo_urls.length}</span>}
                      {log.video_urls.length > 0 && <span>🎬{log.video_urls.length}</span>}
                    </div>
                  )}
                  {/* Yield badge */}
                  {(() => {
                    const bs = (log as any).batch_size || 20;
                    const dc = (log as any).defect_count || 0;
                    const yr = bs > 0 ? Math.round(((bs - dc) / bs) * 100) : 100;
                    const c = yr >= 95 ? '#16A34A' : yr >= 80 ? '#B8860B' : '#C53030';
                    return (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: c }}>
                        歩留{yr}%
                      </div>
                    );
                  })()}
                </div>
                {/* Info area */}
                <div className="p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-xs truncate flex-1">{log.paint_type || '種類未設定'}</div>
                    <div className="text-[10px] font-medium ml-1 flex-shrink-0" style={{ color: 'var(--pl-accent)' }}>
                      {formatLocalDate(log.painted_at)}
                    </div>
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--pl-text-2)' }}>
                    {log.paint_product || ''}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-medium" style={{ color: 'var(--pl-text-3)' }}>
                    {log.ambient_temp !== null && <span style={{ color: 'var(--pl-blue)' }}>{log.ambient_temp}℃</span>}
                    {log.air_pressure !== null && <span style={{ color: 'var(--pl-accent)' }}>{log.air_pressure}MPa</span>}
                    {log.film_thickness !== null && <span>{log.film_thickness}μm</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* List view (original style) */}
        {viewMode === 'list' && (
          <div className="space-y-2 pt-2">
            {filtered.map((log, i) => (
              <button key={log.id} onClick={() => router.push(`/logs/${log.id}`)}
                className="w-full pl-card text-left touch-manipulation active:scale-[0.99] transition-transform pl-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="flex gap-3">
                  {/* Thumbnail: 写真 > 動画 > プレースホルダー */}
                  {log.photo_urls.length > 0 ? (
                    <img src={log.photo_urls[0]} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" style={{ border: '1px solid var(--pl-border)' }} />
                  ) : log.video_urls.length > 0 ? (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 relative overflow-hidden" style={{ border: '1px solid var(--pl-border)' }}>
                      <video src={log.video_urls[0]} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-sm bg-black/50 rounded-full w-6 h-6 flex items-center justify-center ml-0.5">▶</span></div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--pl-surface-2)' }}>
                      <span className="text-xl opacity-30">🎨</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-0.5">
                      <div className="font-semibold text-sm truncate">{log.paint_type || '種類未設定'}</div>
                      <div className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--pl-text-3)' }}>{formatLocalDate(log.painted_at)}</div>
                    </div>
                    {log.paint_product && <div className="text-xs truncate" style={{ color: 'var(--pl-text-2)' }}>{log.paint_product}</div>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium mt-1" style={{ color: 'var(--pl-text-3)' }}>
                      {log.ambient_temp !== null && <span style={{ color: 'var(--pl-blue)' }}>{log.ambient_temp}℃</span>}
                      {log.ambient_humidity !== null && <span style={{ color: 'var(--pl-teal)' }}>{log.ambient_humidity}%</span>}
                      {log.air_pressure !== null && <span style={{ color: 'var(--pl-accent)' }}>{log.air_pressure}MPa</span>}
                      {log.film_thickness !== null && <span>{log.film_thickness}μm</span>}
                      {log.coat_count !== null && <span>{log.coat_count}コート</span>}
                    </div>
                    {Object.keys(log.defects || {}).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(() => {
                          const bs = (log as any).batch_size || 20;
                          const dc = (log as any).defect_count || 0;
                          const yr = bs > 0 ? Math.round(((bs - dc) / bs) * 100) : 100;
                          const c = yr >= 95 ? 'var(--pl-success)' : yr >= 80 ? 'var(--pl-warn)' : 'var(--pl-danger)';
                          const bg = yr >= 95 ? 'var(--pl-success-soft)' : yr >= 80 ? 'var(--pl-warn-soft)' : 'var(--pl-danger-soft)';
                          return <span className="pl-badge" style={{ background: bg, color: c, fontSize: '10px' }}>歩留{yr}% ({dc}/{bs})</span>;
                        })()}
                        {Object.entries(log.defects || {}).map(([d, cnt]) => <span key={d} className="pl-badge" style={{ background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', fontSize: '10px' }}>{d}{cnt as number}枚</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
