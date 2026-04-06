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

const AI_FEATURES = [
  { key: 'photo', label: '写真不具合検出', desc: '出来上がり写真をAIが分析', needsVision: true },
  { key: 'risk', label: 'リスク判定', desc: '環境条件から不具合リスクを予測', needsVision: false },
  { key: 'recommend', label: '最適設定レコメンド', desc: '過去の成功パターンから推奨', needsVision: false },
  { key: 'query', label: '自然言語検索', desc: 'データを日本語で問い合わせ', needsVision: false },
  { key: 'video', label: '動画分析', desc: '噴霧技術をフレーム解析', needsVision: true },
  { key: 'report', label: '月次レポート', desc: '月間の品質サマリーを自動生成', needsVision: false },
];

interface ModelInfo {
  id: string;
  label: string;
  price: string;
  tier: string;
  vision: boolean;
}

export default function SettingsPage() {
  const [pinned, setPinned] = useState<Record<string, unknown>>({});
  const [useLastValue, setUseLastValue] = useState(true);
  const [modelPrefs, setModelPrefs] = useState<Record<string, string>>({
    photo: 'gpt-5.4', risk: 'gpt-5.4-mini', recommend: 'gpt-5.4-mini',
    query: 'gpt-5.4-mini', video: 'gpt-5.4', report: 'gpt-5.4-mini',
  });
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_defaults').select('*').eq('user_id', user.id).single();
    if (data) {
      setPinned(data.pinned_fields || {});
      setUseLastValue(data.use_last_value ?? true);
      if (data.model_preferences) setModelPrefs((prev) => ({ ...prev, ...data.model_preferences }));
    }
    // モデル一覧取得
    try {
      const res = await fetch('/api/ai/models');
      const { models } = await res.json();
      setAvailableModels(models || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function saveAll(updates: { pinned_fields?: Record<string, unknown>; use_last_value?: boolean; model_preferences?: Record<string, string> }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_defaults').upsert({
      user_id: user.id,
      pinned_fields: updates.pinned_fields ?? pinned,
      use_last_value: updates.use_last_value ?? useLastValue,
      model_preferences: updates.model_preferences ?? modelPrefs,
    }, { onConflict: 'user_id' });
  }

  async function removePin(key: string) {
    const next = { ...pinned }; delete next[key]; setPinned(next);
    await saveAll({ pinned_fields: next });
  }

  async function toggleUseLastValue() {
    const next = !useLastValue; setUseLastValue(next);
    await saveAll({ use_last_value: next });
  }

  async function clearAllPins() {
    if (!confirm('全ての固定値をクリアしますか？')) return;
    setPinned({}); await saveAll({ pinned_fields: {} });
  }

  async function setModel(featureKey: string, modelId: string) {
    const next = { ...modelPrefs, [featureKey]: modelId };
    setModelPrefs(next);
    await saveAll({ model_preferences: next });
  }

  async function handleLogout() {
    await supabase.auth.signOut(); router.push('/login');
  }

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;

  const pinnedEntries = Object.entries(pinned);
  const tierColors: Record<string, string> = {
    premium: 'bg-purple-50 text-purple-700',
    flagship: 'bg-blue-50 text-blue-700',
    balanced: 'bg-teal-50 text-teal-700',
    economy: 'bg-green-50 text-green-700',
    legacy: 'bg-gray-100 text-gray-600',
    'legacy-economy': 'bg-gray-100 text-gray-500',
    coding: 'bg-amber-50 text-amber-700',
    'coding-economy': 'bg-amber-50 text-amber-600',
    'coding-nano': 'bg-amber-50 text-amber-500',
  };

  return (
    <div>
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-[env(safe-area-inset-top)]">
        <div className="py-3"><h1 className="text-lg font-medium">設定</h1></div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* AIモデル設定 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="font-medium text-sm mb-3">🤖 AI分析モデル設定</div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500 mb-3">
            各AI機能で使用するモデルを選択できます。高精度モデルは高コスト、軽量モデルは低コスト・高速です。
          </div>

          <div className="space-y-3">
            {AI_FEATURES.map((feat) => {
              const currentModel = modelPrefs[feat.key];
              const filteredModels = feat.needsVision
                ? availableModels.filter((m) => m.vision)
                : availableModels;

              return (
                <div key={feat.key} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="text-sm font-medium">{feat.label}</div>
                      <div className="text-[11px] text-gray-400">{feat.desc}</div>
                    </div>
                    {feat.needsVision && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Vision</span>
                    )}
                  </div>
                  <select
                    value={currentModel}
                    onChange={(e) => setModel(feat.key, e.target.value)}
                    className="w-full h-[44px] px-3 rounded-xl border border-gray-200 text-sm touch-manipulation bg-white appearance-none"
                  >
                    {filteredModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.price}/MTok
                      </option>
                    ))}
                    {filteredModels.length === 0 && (
                      <option value={currentModel}>{currentModel}</option>
                    )}
                  </select>
                  {/* 選択中モデルのバッジ */}
                  {availableModels.find((m) => m.id === currentModel) && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${tierColors[availableModels.find((m) => m.id === currentModel)?.tier || ''] || 'bg-gray-100 text-gray-500'}`}>
                        {availableModels.find((m) => m.id === currentModel)?.tier}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {availableModels.find((m) => m.id === currentModel)?.price}/MTok
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* デフォルト値設定 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm">📌 デフォルト値</div>
            {pinnedEntries.length > 0 && (
              <button onClick={clearAllPins} className="text-xs text-red-500 touch-manipulation">全クリア</button>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500 mb-3">
            固定値 → 毎回この値で開始 / 前回値 → 直近の入力を引き継ぎ
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm">ピンなし項目に前回値を適用</span>
            <button onClick={toggleUseLastValue}
              className={`w-11 h-6 rounded-full relative transition-colors ${useLastValue ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${useLastValue ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
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
                <button onClick={() => removePin(key)}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 touch-manipulation">✕</button>
              </div>
            ))
          )}
        </div>

        {/* ログアウト */}
        <button onClick={handleLogout}
          className="w-full py-3 bg-white rounded-xl border border-gray-200 text-red-500 text-sm touch-manipulation">
          ログアウト
        </button>
      </div>
    </div>
  );
}
