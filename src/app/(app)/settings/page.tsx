'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const FIELD_LABELS: Record<string, string> = {
  ambient_temp: '気温 (℃)', ambient_humidity: '湿度 (%)', booth_temp: 'ブース気温 (℃)',
  workpiece_temp: 'ワーク温度 (℃)', paint_temp: '塗料温度 (℃)', paint_type: '塗装種類',
  paint_product: '塗料品番', dilution_ratio: '希釈率 (%)', air_pressure: 'エア圧 (MPa)',
  throttle_turns: '絞り (回転)', needle_turns: 'ニードル (回転)', gun_type: 'ガン種類',
  gun_distance: 'ガン距離 (cm)', coat_count: 'コート数', film_thickness: '膜厚 (μm)',
  fan_power: 'ファン出力 (%)', surface_prep: '下地処理', drying_method: '乾燥方法',
};

export default function SettingsPage() {
  const [pinned, setPinned] = useState<Record<string, unknown>>({});
  const [useLastValue, setUseLastValue] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { loadDefaults(); }, []);

  async function loadDefaults() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_defaults').select('*').eq('user_id', user.id).single();
    if (data) {
      setPinned(data.pinned_fields || {});
      setUseLastValue(data.use_last_value ?? true);
    }
    setLoading(false);
  }

  async function save(newPinned: Record<string, unknown>, newUseLastValue: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_defaults').upsert({
      user_id: user.id, pinned_fields: newPinned, use_last_value: newUseLastValue,
    }, { onConflict: 'user_id' });
  }

  async function removePin(key: string) {
    const next = { ...pinned };
    delete next[key];
    setPinned(next);
    await save(next, useLastValue);
  }

  async function toggleUseLastValue() {
    const next = !useLastValue;
    setUseLastValue(next);
    await save(pinned, next);
  }

  async function clearAllPins() {
    if (!confirm('全ての固定値をクリアしますか？')) return;
    setPinned({});
    await save({}, useLastValue);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;

  const pinnedEntries = Object.entries(pinned);

  return (
    <div>
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-[env(safe-area-inset-top)]">
        <div className="py-3"><h1 className="text-lg font-medium">設定</h1></div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* デフォルト値設定 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm">デフォルト値</div>
            {pinnedEntries.length > 0 && (
              <button onClick={clearAllPins} className="text-xs text-red-500 touch-manipulation">全クリア</button>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500 mb-3">
            📌 固定値 → 毎回この値で開始 / 前回値 → 直近の入力を引き継ぎ
          </div>

          {/* 前回値を使うスイッチ */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm">ピンなし項目に前回値を適用</span>
            <button
              onClick={toggleUseLastValue}
              className={`w-11 h-6 rounded-full relative transition-colors ${useLastValue ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${useLastValue ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* ピン済み一覧 */}
          {pinnedEntries.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">
              固定値はありません。記録作成画面で📌アイコンを押すと設定できます。
            </div>
          ) : (
            pinnedEntries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-100">
                <div>
                  <div className="text-sm">{FIELD_LABELS[key] || key}</div>
                  <div className="text-xs text-purple-600 font-medium">{String(val)}</div>
                </div>
                <button
                  onClick={() => removePin(key)}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 touch-manipulation"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-white rounded-xl border border-gray-200 text-red-500 text-sm touch-manipulation"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
