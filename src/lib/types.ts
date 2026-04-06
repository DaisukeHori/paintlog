export interface PaintLog {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  // 1. 環境条件
  painted_at: string;
  ambient_temp: number | null;
  ambient_humidity: number | null;
  booth_temp: number | null;
  workpiece_temp: number | null;
  paint_temp: number | null;
  // 2. 塗料情報
  paint_type: string | null;
  paint_product: string | null;
  dilution_ratio: number | null;
  paint_lot: string | null;
  // 3. ガン設定
  air_pressure: number | null;
  throttle_turns: number | null;
  needle_turns: number | null;
  gun_type: string | null;
  gun_distance: number | null;
  // 4. 塗装工程
  coat_count: number | null;
  surface_prep: string | null;
  drying_method: string | null;
  drying_temp: number | null;
  drying_time: number | null;
  film_thickness: number | null;
  fan_power: number | null;
  defects: Record<string, number>; // {"タレ": 3, "ブツ": 1} = severity 1-5
  // 5. 記録・エビデンス
  photo_urls: string[];
  video_urls: string[];
  comment: string | null;
  // 拡張
  custom_fields: Record<string, unknown>;
}

export type PaintLogInput = Omit<PaintLog, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export interface UserDefaults {
  id: string;
  user_id: string;
  pinned_fields: Record<string, unknown>;
  use_last_value: boolean;
}

export interface TextSuggestion {
  id: string;
  field_name: string;
  value: string;
  use_count: number;
  last_used_at: string;
  user_id: string;
  deleted: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'number' | 'text' | 'select';
  options: string[] | null;
  display_order: number;
  is_active: boolean;
  user_id: string;
}

// フォームの数値フィールド定義
export interface NumericFieldConfig {
  key: keyof PaintLogInput;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  presets?: number[];
}

// カテゴリ定義
export const CATEGORIES = [
  { id: 1, key: 'environment', label: '環境条件', color: 'blue' },
  { id: 2, key: 'paint', label: '塗料情報', color: 'purple' },
  { id: 3, key: 'gun', label: 'ガン設定', color: 'teal' },
  { id: 4, key: 'process', label: '塗装工程', color: 'amber' },
  { id: 5, key: 'evidence', label: '記録・エビデンス', color: 'coral' },
] as const;

// 不具合選択肢
export const DEFECT_OPTIONS = [
  'タレ',
  'ブツ',
  'ハジキ',
  'ゆず肌',
  'ピンホール',
  'クレーター',
  '色ムラ',
  '薄膜',
  'その他',
] as const;

// 回転数を分数表示に変換
export function turnsToDisplay(turns: number | null): string {
  if (turns === null || turns === undefined) return '--';
  const whole = Math.floor(turns);
  const frac = turns - whole;
  const fracMap: Record<number, string> = {
    0: '',
    0.25: ' 1/4',
    0.5: ' 1/2',
    0.75: ' 3/4',
  };
  const fracStr = fracMap[Math.round(frac * 4) / 4] ?? '';
  if (whole === 0 && fracStr) return fracStr.trim();
  if (!fracStr) return String(whole);
  return `${whole}${fracStr}`;
}
