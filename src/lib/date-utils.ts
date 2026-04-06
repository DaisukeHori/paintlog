/**
 * 日時ユーティリティ
 * Supabase は ISO 8601 (UTC) で保存するが、表示は常にローカルタイム
 */

/** ISO文字列をdatetime-local用のフォーマット（YYYY-MM-DDTHH:mm）に変換 */
export function toLocalDatetimeValue(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** datetime-local値をISO文字列に変換 */
export function fromLocalDatetimeValue(localValue: string): string {
  return new Date(localValue).toISOString();
}

/** ローカル日時を M/d HH:mm 形式で表示 */
export function formatLocalDate(isoString: string, fmt: 'short' | 'datetime' | 'date' = 'datetime'): string {
  const d = new Date(isoString);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  if (fmt === 'date') return `${m}/${day}`;
  if (fmt === 'short') return `${m}/${day} ${h}:${min}`;
  return `${m}/${day} ${h}:${min}`;
}
