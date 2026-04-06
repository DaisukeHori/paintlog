'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaintLog, turnsToDisplay } from '@/lib/types';
import { format } from 'date-fns';
import DraftBanner from '@/components/DraftBanner';

export default function LogsPage() {
  const [logs, setLogs] = useState<PaintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data } = await supabase
      .from('paint_logs')
      .select('*')
      .order('painted_at', { ascending: false })
      .limit(50);
    setLogs((data as PaintLog[]) || []);
    setLoading(false);
  }

  const filtered = logs.filter(
    (l) =>
      !filter ||
      l.paint_type?.includes(filter) ||
      l.paint_product?.includes(filter) ||
      l.comment?.includes(filter)
  );

  return (
    <div>
      {/* ヘッダー */}
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-[env(safe-area-inset-top)] pb-2">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-lg font-medium">塗装記録</h1>
          <span className="text-xs text-gray-400">{logs.length}件</span>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="検索..."
          className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm touch-manipulation focus:outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* リスト */}
      <DraftBanner />
      <div className="px-4 pt-2 space-y-2">
        {loading && (
          <div className="text-center text-gray-400 py-12">読み込み中...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">🎨</div>
            <div>記録がありません</div>
            <button
              onClick={() => router.push('/logs/new')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm touch-manipulation"
            >
              最初の記録を作成
            </button>
          </div>
        )}
        {filtered.map((log) => (
          <button
            key={log.id}
            onClick={() => router.push(`/logs/${log.id}`)}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left touch-manipulation active:bg-gray-50"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="font-medium text-sm">
                {log.paint_type || '種類未設定'}
              </div>
              <div className="text-[10px] text-gray-400">
                {format(new Date(log.painted_at), 'M/d HH:mm')}
              </div>
            </div>
            {log.paint_product && (
              <div className="text-xs text-gray-500 mb-1.5">{log.paint_product}</div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
              {log.ambient_temp !== null && <span>{log.ambient_temp}℃</span>}
              {log.ambient_humidity !== null && <span>{log.ambient_humidity}%</span>}
              {log.air_pressure !== null && <span>{log.air_pressure}MPa</span>}
              {log.throttle_turns !== null && (
                <span>絞り{turnsToDisplay(log.throttle_turns)}</span>
              )}
              {log.film_thickness !== null && <span>{log.film_thickness}μm</span>}
              {log.coat_count !== null && <span>{log.coat_count}コート</span>}
            </div>
            {log.defects.length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {log.defects.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {log.photo_urls.length > 0 && (
              <div className="flex gap-1 mt-2">
                {log.photo_urls.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ))}
                {log.photo_urls.length > 3 && (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    +{log.photo_urls.length - 3}
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
