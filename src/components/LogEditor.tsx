'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaintLog, PaintLogInput } from '@/lib/types';
import { useAutoSave } from '@/lib/autosave';
import { Draft, saveDraft, clearDraft, promoteDraftToDb } from '@/lib/draft';
import { toLocalDatetimeValue, fromLocalDatetimeValue } from '@/lib/date-utils';
import PinnedBanner from '@/components/PinnedBanner';
import FavoritesBar from '@/components/FavoritesBar';
import StepperInput from '@/components/StepperInput';
import TurnsInput from '@/components/TurnsInput';
import AutocompleteInput from '@/components/AutocompleteInput';
import { DefectChips, CoatSelector, SliderInput } from '@/components/FormControls';
import FileUpload from '@/components/FileUpload';
import { RiskAlert, AiRecommend, PhotoAnalysis, VideoAnalysis } from '@/components/AiFeatures';

const FIELD_LABELS: Record<string, string> = {
  ambient_temp: '気温', ambient_humidity: '湿度', booth_temp: 'ブース気温',
  workpiece_temp: 'ワーク温度', paint_temp: '塗料温度', paint_type: '塗装種類',
  paint_product: '塗料品番', dilution_ratio: '希釈率', viscosity_seconds: '粘度（滴下秒）', air_pressure: 'エア圧',
  throttle_turns: '絞り', needle_turns: 'ニードル', gun_type: 'ガン種類',
  gun_distance: 'ガン距離', coat_count: 'コート数', film_thickness: '膜厚',
  fan_power: 'ファン出力', batch_size: 'バッチ枚数', defect_count: 'NG枚数', surface_prep: '下地処理', drying_method: '乾燥方法', drying_temp: '乾燥温度', drying_time: '乾燥時間',
};

interface LogEditorProps {
  // 下書きモード: initialDraft を渡す
  initialDraft?: Draft;
  onPromotedToDb?: (id: string) => void;
  // DBモード: existingLogId を渡す
  existingLogId?: string;
}

export default function LogEditor({ initialDraft, onPromotedToDb, existingLogId }: LogEditorProps) {
  const [form, setForm] = useState<PaintLogInput | null>(null);
  const [dbId, setDbId] = useState<string | null>(existingLogId || null);
  const [draft, setDraft] = useState<Draft | null>(initialDraft || null);
  const [pinnedFields, setPinnedFields] = useState<Record<string, unknown>>({});
  const [recentLogs, setRecentLogs] = useState<PaintLog[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [openCat, setOpenCat] = useState<number>(1);
  const [isNew, setIsNew] = useState(!!initialDraft);
  const promotingRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();
  const { save: dbSave, status: dbStatus } = useAutoSave(dbId);

  // 保存ステータス: 常に自動保存（UI非表示）

  useEffect(() => {
    if (initialDraft) {
      setForm(initialDraft.form);
      setPinnedFields(initialDraft.pinnedFields);
    } else if (existingLogId) {
      loadFromDb(existingLogId);
    }
    loadRecent();
    loadSuggestions();
  }, []);

  async function loadFromDb(id: string) {
    const { data } = await supabase.from('paint_logs').select('*').eq('id', id).single();
    if (!data) { router.replace('/logs'); return; }
    const log = data as PaintLog;
    const { id: _, created_at, updated_at, user_id, ...rest } = log;
    setForm(rest);
    // ピン値も読み込む
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: defaults } = await supabase.from('user_defaults').select('*').eq('user_id', user.id).single();
      setPinnedFields(defaults?.pinned_fields || {});
    }
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('paint_logs').select('*')
      .order('painted_at', { ascending: false }).limit(3);
    setRecentLogs((data as PaintLog[]) || []);
  }

  async function loadSuggestions() {
    const { data } = await supabase
      .from('text_suggestions').select('*').eq('deleted', false).order('use_count', { ascending: false });
    const map: Record<string, string[]> = {};
    (data || []).forEach((s: any) => {
      if (!map[s.field_name]) map[s.field_name] = [];
      map[s.field_name].push(s.value);
    });
    setSuggestions(map);
  }

  // --- フィールド変更のコア処理 ---
  const set = useCallback(<K extends keyof PaintLogInput>(key: K, val: PaintLogInput[K]) => {
    setForm((f) => f ? { ...f, [key]: val } : f);

    if (dbId) {
      // DBモード: 自動保存
      dbSave({ [key]: val } as Partial<PaintLogInput>);
    } else if (draft) {
      // 下書きモード: localStorage保存 + touched追跡
      const updated = {
        ...draft,
        form: { ...draft.form, [key]: val },
        touchedFields: draft.touchedFields.includes(String(key))
          ? draft.touchedFields
          : [...draft.touchedFields, String(key)],
      };
      setDraft(updated);
      saveDraft(updated);

      // 初回手動操作 → DB昇格
      if (!promotingRef.current && updated.touchedFields.length === 1) {
        promotingRef.current = true;
        (async () => {
          const id = await promoteDraftToDb(updated);
          if (id) {
            setDbId(id);
            clearDraft();
            onPromotedToDb?.(id);
          }
          promotingRef.current = false;
        })();
      }
    }
  }, [dbId, draft, dbSave, onPromotedToDb]);

  // 確定ボタン（デフォルト値のまま保存したい場合）
  async function handleConfirm() {
    if (dbId) {
      // 既にDB保存済み → 一覧に戻る
      router.push('/logs');
      return;
    }
    if (draft) {
      const id = await promoteDraftToDb(draft);
      if (id) {
        clearDraft();
        router.push('/logs');
      }
    }
  }

  // テキスト系サジェスト保存
  const saveSuggestion = useCallback(async (fieldName: string, value: string) => {
    if (!value.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('text_suggestions').upsert({
      user_id: user.id, field_name: fieldName, value: value.trim(),
      use_count: 1, last_used_at: new Date().toISOString(), deleted: false,
    }, { onConflict: 'user_id,field_name,value' });
  }, [supabase]);

  const setTextAndSuggest = useCallback((key: keyof PaintLogInput, fieldName: string, value: string) => {
    set(key, value as any);
    if (value.length >= 2) saveSuggestion(fieldName, value);
  }, [set, saveSuggestion]);

  async function deleteSuggestion(fieldName: string, value: string) {
    await supabase.from('text_suggestions').update({ deleted: true }).match({ field_name: fieldName, value });
    setSuggestions((s) => ({ ...s, [fieldName]: (s[fieldName] || []).filter((v) => v !== value) }));
  }

  async function togglePin(key: string) {
    const newPinned = { ...pinnedFields };
    if (key in newPinned) { delete newPinned[key]; }
    else { newPinned[key] = form ? (form as any)[key] : null; }
    setPinnedFields(newPinned);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_defaults').upsert(
      { user_id: user.id, pinned_fields: newPinned, use_last_value: true },
      { onConflict: 'user_id' }
    );
  }

  function prefillFromLog(log: PaintLog) {
    if (!form) return;
    const skipKeys = ['painted_at', 'photo_urls', 'video_urls', 'custom_fields'];
    Object.keys(form).forEach((k) => {
      if (skipKeys.includes(k)) return;
      if ((log as any)[k] !== null && (log as any)[k] !== undefined) {
        set(k as keyof PaintLogInput, (log as any)[k]);
      }
    });
  }

  async function handleDelete() {
    if (!confirm('この記録を削除しますか？')) return;
    if (dbId) {
      await supabase.from('paint_logs').delete().eq('id', dbId);
    }
    clearDraft();
    router.push('/logs');
  }

  if (!form) return <div className="min-h-screen flex items-center justify-center text-stone-400">読み込み中...</div>;

  function summary(catId: number): string {
    if (!form) return '';
    switch (catId) {
      case 1: return [form.ambient_temp !== null ? `${form.ambient_temp}℃` : '', form.ambient_humidity !== null ? `${form.ambient_humidity}%` : ''].filter(Boolean).join(' / ') || '未入力';
      case 2: return form.paint_type || '未入力';
      case 3: return form.air_pressure !== null ? `${form.air_pressure}MPa` : '未入力';
      case 4: {
        const bs = form.batch_size || 20;
        const dc = form.defect_count || 0;
        const yr = bs > 0 ? Math.round(((bs - dc) / bs) * 100) : 100;
        return `歩留${yr}% (${dc}/${bs}枚)`;
      }
      case 5: return `写真${form.photo_urls.length} 動画${form.video_urls.length}`;
      default: return '';
    }
  }

  const isDraft = !dbId;
  const catBadge: Record<number, string> = {
    1: 'bg-blue-900/30 text-blue-400', 2: 'bg-purple-900/30 text-purple-400',
    3: 'bg-teal-900/30 text-teal-400', 4: 'bg-amber-900/30 text-amber-400',
    5: 'bg-orange-900/30 text-orange-400',
  };

  return (
    <div>

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)]" style={{ background: 'rgba(246,245,241,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between py-3">
          <button onClick={() => router.push('/logs')} className="text-sm touch-manipulation min-w-[48px] min-h-[44px] flex items-center" style={{ color: 'var(--pl-accent)' }}>
            ← 一覧
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold">
              {isDraft && <span style={{ color: 'var(--pl-warn)' }} className="mr-1">下書き</span>}
              {form.paint_type || '新規記録'}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--pl-text-3)' }}>
              {isDraft ? '操作開始で自動保存' : '自動保存'}
            </div>
          </div>
          {dbId ? (
            <button onClick={handleDelete} className="text-xs touch-manipulation min-w-[48px] min-h-[44px] flex items-center justify-end" style={{ color: 'var(--pl-danger)' }}>削除</button>
          ) : (
            <button onClick={() => { clearDraft(); router.push('/logs'); }} className="text-xs touch-manipulation min-w-[48px] min-h-[44px] flex items-center justify-end" style={{ color: 'var(--pl-text-3)' }}>破棄</button>
          )}
        </div>
      </div>

      {/* ピン適用バナー（新規時のみ） */}
      {isNew && Object.keys(pinnedFields).length > 0 && (
        <PinnedBanner pinnedFields={pinnedFields} fieldLabels={FIELD_LABELS} />
      )}

      {/* お気に入りバー */}
      <FavoritesBar recentLogs={recentLogs} onSelect={prefillFromLog} />

      {/* AI最適設定ボタン */}
      {form.paint_type && (
        <div className="px-4 mb-2">
          <AiRecommend
            paintType={form.paint_type}
            conditions={{ ambient_temp: form.ambient_temp, ambient_humidity: form.ambient_humidity }}
            onApply={(settings) => {
              Object.entries(settings).forEach(([k, v]) => {
                set(k as keyof PaintLogInput, v as any);
              });
            }}
          />
        </div>
      )}

      {/* カテゴリカード群 */}
      <div className="px-4 space-y-2 pb-8">
        {[
          { id: 1, label: '環境条件', border: 'border-blue-200', content: (
            <>
              <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-500 mb-1 block">塗装日時</span>
                <div className="flex gap-2">
                  <button onClick={() => set('painted_at', new Date().toISOString())}
                    className="px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium touch-manipulation border border-blue-200 min-h-[44px]">現在時刻</button>
                  <input type="datetime-local" value={toLocalDatetimeValue(form.painted_at)}
                    onChange={(e) => set('painted_at', fromLocalDatetimeValue(e.target.value))}
                    className="flex-1 h-[44px] px-3 rounded-xl border border-stone-200 text-sm touch-manipulation" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StepperInput label="気温" unit="℃" value={form.ambient_temp} onChange={(v) => set('ambient_temp', v)} min={-10} max={50} showBar barMax={50} pinned={'ambient_temp' in pinnedFields} onPin={() => togglePin('ambient_temp')} />
                <StepperInput label="湿度" unit="%" value={form.ambient_humidity} onChange={(v) => set('ambient_humidity', v)} min={0} max={100} showBar barMax={100} barColor="#1D9E75" warningThreshold={70} dangerThreshold={85} pinned={'ambient_humidity' in pinnedFields} onPin={() => togglePin('ambient_humidity')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <StepperInput label="ブース気温" unit="℃" value={form.booth_temp} onChange={(v) => set('booth_temp', v)} min={-10} max={50} pinned={'booth_temp' in pinnedFields} onPin={() => togglePin('booth_temp')} />
                  <button onClick={() => set('booth_temp', form.ambient_temp)} className="mt-1 w-full text-xs text-stone-400 py-1.5 bg-stone-50 rounded-lg touch-manipulation min-h-[32px]">= 気温と同じ</button>
                </div>
                <StepperInput label="ワーク温度" unit="℃" value={form.workpiece_temp} onChange={(v) => set('workpiece_temp', v)} min={-10} max={80} pinned={'workpiece_temp' in pinnedFields} onPin={() => togglePin('workpiece_temp')} />
              </div>
              <div className="w-1/2">
                <StepperInput label="塗料温度" unit="℃" value={form.paint_temp} onChange={(v) => set('paint_temp', v)} min={-10} max={50} pinned={'paint_temp' in pinnedFields} onPin={() => togglePin('paint_temp')} />
              </div>
              <RiskAlert conditions={{
                ambient_temp: form.ambient_temp, ambient_humidity: form.ambient_humidity,
                booth_temp: form.booth_temp, workpiece_temp: form.workpiece_temp, paint_temp: form.paint_temp,
              }} />
            </>
          )},
          { id: 2, label: '塗料情報', border: 'border-purple-200', content: (
            <>
              <AutocompleteInput label="塗装種類" fieldName="paint_type" value={form.paint_type || ''} onChange={(v) => setTextAndSuggest('paint_type', 'paint_type', v)} suggestions={suggestions['paint_type'] || []} onDeleteSuggestion={(v) => deleteSuggestion('paint_type', v)} pinned={'paint_type' in pinnedFields} onPin={() => togglePin('paint_type')} />
              <AutocompleteInput label="塗料メーカー・品番" fieldName="paint_product" value={form.paint_product || ''} onChange={(v) => setTextAndSuggest('paint_product', 'paint_product', v)} suggestions={suggestions['paint_product'] || []} onDeleteSuggestion={(v) => deleteSuggestion('paint_product', v)} />
              <SliderInput label="希釈率" unit="%" value={form.dilution_ratio} onChange={(v) => set('dilution_ratio', v)} min={0} max={50} step={1} pinned={'dilution_ratio' in pinnedFields} onPin={() => togglePin('dilution_ratio')} />
              <StepperInput label="粘度（滴下秒）" unit="秒" value={form.viscosity_seconds} onChange={(v) => set('viscosity_seconds', v)} step={1} min={5} max={40} presets={[13, 15, 20, 25]} pinned={'viscosity_seconds' in pinnedFields} onPin={() => togglePin('viscosity_seconds')}
                colorFn={(v) => {
                  if (v <= 10) return '#2563EB';      // 青: かなり低粘度
                  if (v <= 15) return '#0D9488';      // ティール: 低粘度
                  if (v <= 20) return '#16A34A';      // 緑: 適正域
                  if (v <= 25) return '#B8860B';      // 黄: 中粘度
                  if (v <= 30) return '#D35322';      // オレンジ: やや高い
                  if (v <= 35) return '#C53030';      // 赤: 高粘度
                  return '#7F1D1D';                    // 濃赤: 非常に硬い
                }} />
              <AutocompleteInput label="ロット番号" fieldName="paint_lot" value={form.paint_lot || ''} onChange={(v) => setTextAndSuggest('paint_lot', 'paint_lot', v)} suggestions={suggestions['paint_lot'] || []} onDeleteSuggestion={(v) => deleteSuggestion('paint_lot', v)} placeholder="任意" />
            </>
          )},
          { id: 3, label: 'ガン設定', border: 'border-teal-200', content: (
            <>
              <StepperInput label="エア圧" unit="MPa" value={form.air_pressure} onChange={(v) => set('air_pressure', v)} step={0.01} min={0} max={0.5} decimals={2} presets={[0.15, 0.18, 0.20, 0.25, 0.30]} pinned={'air_pressure' in pinnedFields} onPin={() => togglePin('air_pressure')} />
              <div className="grid grid-cols-2 gap-3">
                <TurnsInput label="絞り（回転数）" value={form.throttle_turns} onChange={(v) => set('throttle_turns', v)} pinned={'throttle_turns' in pinnedFields} onPin={() => togglePin('throttle_turns')} />
                <TurnsInput label="ニードル（回転数）" value={form.needle_turns} onChange={(v) => set('needle_turns', v)} pinned={'needle_turns' in pinnedFields} onPin={() => togglePin('needle_turns')} />
              </div>
              <AutocompleteInput label="ガン種類・口径" fieldName="gun_type" value={form.gun_type || ''} onChange={(v) => setTextAndSuggest('gun_type', 'gun_type', v)} suggestions={suggestions['gun_type'] || []} onDeleteSuggestion={(v) => deleteSuggestion('gun_type', v)} />
              <StepperInput label="ガン距離" unit="cm" value={form.gun_distance} onChange={(v) => set('gun_distance', v)} step={1} min={5} max={50} presets={[15, 18, 20, 25]} pinned={'gun_distance' in pinnedFields} onPin={() => togglePin('gun_distance')} />
            </>
          )},
          { id: 4, label: '塗装工程', border: 'border-amber-200', content: (() => {
            const yieldRate = form.batch_size > 0 ? Math.round(((form.batch_size - form.defect_count) / form.batch_size) * 100) : 100;
            const yieldColor = yieldRate >= 95 ? 'var(--pl-success)' : yieldRate >= 80 ? 'var(--pl-warn)' : 'var(--pl-danger)';
            return (
            <>
              {/* バッチ歩留まり */}
              <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                <div className="text-xs text-stone-500 font-medium mb-2">バッチ歩留まり</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-stone-400 mb-1">バッチ枚数</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => set('batch_size', Math.max(1, (form.batch_size || 20) - 1))}
                        className="w-10 h-10 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-lg touch-manipulation">−</button>
                      <div className="flex-1 text-center text-xl font-semibold tabular-nums">{form.batch_size || 20}</div>
                      <button onClick={() => set('batch_size', Math.min(100, (form.batch_size || 20) + 1))}
                        className="w-10 h-10 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-lg touch-manipulation">+</button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-stone-400 mb-1">NG枚数</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => set('defect_count', Math.max(0, (form.defect_count || 0) - 1))}
                        className="w-10 h-10 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-lg touch-manipulation">−</button>
                      <div className="flex-1 text-center text-xl font-semibold tabular-nums" style={{ color: form.defect_count > 0 ? 'var(--pl-danger)' : undefined }}>{form.defect_count || 0}</div>
                      <button onClick={() => set('defect_count', Math.min(form.batch_size || 20, (form.defect_count || 0) + 1))}
                        className="w-10 h-10 rounded-lg bg-stone-100 active:bg-stone-200 flex items-center justify-center text-lg touch-manipulation">+</button>
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-[10px] text-stone-400 mb-1">歩留まり</div>
                    <div className="text-2xl font-bold tabular-nums" style={{ color: yieldColor }}>{yieldRate}%</div>
                  </div>
                </div>
                {/* 歩留まりバー */}
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${yieldRate}%`, backgroundColor: yieldColor }} />
                </div>
                <div className="flex justify-between text-[9px] text-stone-300 mt-0.5 px-0.5">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              <CoatSelector value={form.coat_count} onChange={(v) => set('coat_count', v)} pinned={'coat_count' in pinnedFields} onPin={() => togglePin('coat_count')} />
              <AutocompleteInput label="下地処理" fieldName="surface_prep" value={form.surface_prep || ''} onChange={(v) => setTextAndSuggest('surface_prep', 'surface_prep', v)} suggestions={suggestions['surface_prep'] || []} onDeleteSuggestion={(v) => deleteSuggestion('surface_prep', v)} />
              <AutocompleteInput label="乾燥方法" fieldName="drying_method" value={form.drying_method || ''} onChange={(v) => setTextAndSuggest('drying_method', 'drying_method', v)} suggestions={suggestions['drying_method'] || []} onDeleteSuggestion={(v) => deleteSuggestion('drying_method', v)} placeholder="自然乾燥・強制乾燥・赤外線..." />
              <div className="grid grid-cols-2 gap-3">
                <StepperInput label="乾燥温度" unit="℃" value={form.drying_temp} onChange={(v) => set('drying_temp', v)} step={5} min={20} max={200} presets={[60, 80, 120, 140]} pinned={'drying_temp' in pinnedFields} onPin={() => togglePin('drying_temp')} />
                <StepperInput label="乾燥時間" unit="分" value={form.drying_time} onChange={(v) => set('drying_time', v)} step={1} min={0} max={120} presets={[10, 20, 30, 60]} pinned={'drying_time' in pinnedFields} onPin={() => togglePin('drying_time')} />
              </div>
              <StepperInput label="膜厚" unit="μm" value={form.film_thickness} onChange={(v) => set('film_thickness', v)} step={1} min={0} max={200} presets={[15, 25, 35, 50, 80]} pinned={'film_thickness' in pinnedFields} onPin={() => togglePin('film_thickness')} />
              <SliderInput label="ファン出力" unit="%" value={form.fan_power} onChange={(v) => set('fan_power', v)} min={0} max={100} step={5} pinned={'fan_power' in pinnedFields} onPin={() => togglePin('fan_power')} />
              <DefectChips value={form.defects} onChange={(v) => {
                set('defects', v);
                // defect_countを自動更新（タイプ別の最大値 = 重複考慮の推定NG枚数）
                const maxPerType = Math.max(0, ...Object.values(v));
                const totalUnique = Object.values(v).reduce((a, b) => a + b, 0);
                set('defect_count', Math.min(totalUnique, form.batch_size || 20));
              }} batchSize={form.batch_size || 20} />
            </>
          ); })()},
          { id: 5, label: '記録・エビデンス', border: 'border-orange-200', content: (
            <>
              <FileUpload photos={form.photo_urls} videos={form.video_urls} onPhotosChange={(v) => set('photo_urls', v)} onVideosChange={(v) => set('video_urls', v)} />
              {form.photo_urls.length > 0 && (
                <div className="space-y-1">
                  {form.photo_urls.map((url, i) => (
                    <PhotoAnalysis key={i} photoUrl={url} />
                  ))}
                </div>
              )}
              {form.video_urls.length > 0 && (
                <VideoAnalysis frameUrls={form.video_urls} />
              )}
              <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-500 mb-1 block">コメント</span>
                <textarea value={form.comment || ''} onChange={(e) => set('comment', e.target.value)} placeholder="気づき・メモ・反省点" rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm touch-manipulation focus:outline-none focus:border-orange-600 resize-none" />
              </div>
            </>
          )},
        ].map((cat) => (
          <div key={cat.id} className="pl-cat">
            <button onClick={() => setOpenCat(openCat === cat.id ? 0 : cat.id)} className="pl-cat-header">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded ${catBadge[cat.id]}`}>{cat.id}</span>
                <span className="font-medium text-sm">{cat.label}</span>
                {openCat !== cat.id && <span className="text-xs text-stone-400 truncate max-w-[140px]">{summary(cat.id)}</span>}
              </div>
              <span className="text-stone-400 text-xs">{openCat === cat.id ? '▲' : '▼'}</span>
            </button>
            {openCat === cat.id && <div className="mx-2 mb-3 p-3 rounded-xl space-y-3" style={{ background: '#EAE7DE' }}>{cat.content}</div>}
          </div>
        ))}

        {/* 確定ボタン（下書きモード時のみ表示） */}
        {isDraft && (
          <button onClick={handleConfirm}
            className="pl-btn pl-btn-primary mt-4">
            ✓ この内容で記録を確定
          </button>
        )}
      </div>
    </div>
  );
}
