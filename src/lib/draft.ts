/**
 * 下書き管理
 * - localStorageに下書きを保存（DBには書かない）
 * - ユーザーが1フィールドでも操作したらDBにinsert → 以降自動保存
 * - 確定ボタンでもDB保存可能
 * - 24時間経過した下書きは自動削除
 */

import { PaintLogInput } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

const DRAFT_KEY = 'paintlog_draft';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間

export interface Draft {
  form: PaintLogInput;
  touchedFields: string[];     // ユーザーが実際に操作したフィールド
  pinnedFields: Record<string, unknown>;
  createdAt: number;           // タイムスタンプ
  dbId: string | null;         // DBに保存済みならそのID
}

// --- localStorage操作 ---

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch { /* quota超過時は無視 */ }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: Draft = JSON.parse(raw);
    // 24時間超過チェック
    if (Date.now() - draft.createdAt > DRAFT_EXPIRY_MS) {
      clearDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function hasDraft(): boolean {
  return loadDraft() !== null;
}

// --- 新規下書き作成（DBには書かない） ---

export async function createNewDraft(): Promise<Draft> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // デフォルト値とピン値を取得
  let pinned: Record<string, unknown> = {};
  let lastLog: Record<string, unknown> | null = null;
  let useLastValue = true;

  if (user) {
    const { data: defaults } = await supabase
      .from('user_defaults')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: last } = await supabase
      .from('paint_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('painted_at', { ascending: false })
      .limit(1)
      .single();

    pinned = defaults?.pinned_fields || {};
    useLastValue = defaults?.use_last_value !== false;
    lastLog = last;
  }

  // 初期値を構築
  const form: PaintLogInput = {
    painted_at: new Date().toISOString(),
    ambient_temp: null, ambient_humidity: null, booth_temp: null,
    workpiece_temp: null, paint_temp: null,
    paint_type: null, paint_product: null, dilution_ratio: null, paint_lot: null,
    air_pressure: null, throttle_turns: null, needle_turns: null,
    gun_type: null, gun_distance: null,
    coat_count: null, surface_prep: null, drying_method: null,
    film_thickness: null, fan_power: null, defects: [],
    photo_urls: [], video_urls: [], comment: null,
    custom_fields: {},
  };

  // ピン値を適用
  Object.entries(pinned).forEach(([k, v]) => {
    (form as any)[k] = v;
  });

  // ピンされていない項目は前回値
  const lastValueFields = [
    'ambient_temp', 'ambient_humidity', 'booth_temp', 'workpiece_temp', 'paint_temp',
    'paint_type', 'paint_product', 'dilution_ratio', 'paint_lot',
    'air_pressure', 'throttle_turns', 'needle_turns', 'gun_type', 'gun_distance',
    'coat_count', 'surface_prep', 'drying_method', 'film_thickness', 'fan_power',
  ];
  if (lastLog && useLastValue) {
    lastValueFields.forEach((k) => {
      if (!(k in pinned) && (lastLog as any)[k] !== null) {
        (form as any)[k] = (lastLog as any)[k];
      }
    });
  }

  const draft: Draft = {
    form,
    touchedFields: [],
    pinnedFields: pinned,
    createdAt: Date.now(),
    dbId: null,
  };

  saveDraft(draft);
  return draft;
}

// --- 下書き→DB昇格（最初の手動操作時 or 確定時） ---

export async function promoteDraftToDb(draft: Draft): Promise<string | null> {
  if (draft.dbId) return draft.dbId; // 既にDB保存済み

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('paint_logs')
    .insert({ ...draft.form, user_id: user.id })
    .select('id')
    .single();

  if (error) {
    console.error('DB保存エラー:', error);
    return null;
  }

  draft.dbId = data.id;
  saveDraft(draft);
  return data.id;
}
