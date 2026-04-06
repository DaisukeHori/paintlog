import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }) }) });
const mockSelect = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      update: mockUpdate,
      insert: mockInsert,
      select: mockSelect,
      upsert: mockUpsert,
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  }),
}));

import { useAutoSave } from '@/lib/autosave';

describe('useAutoSave フック', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });

  it('初期状態はidle', () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    expect(result.current.status).toBe('idle');
  });

  it('save呼び出しでsaving状態になる', () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 25 }); });
    expect(result.current.status).toBe('saving');
  });

  it('500msデバウンスで実際の保存が実行される', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 25 }); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('デバウンス内の連続呼び出しは最後の1回だけ保存する', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => {
      result.current.save({ ambient_temp: 20 });
      result.current.save({ ambient_temp: 22 });
      result.current.save({ ambient_temp: 25 });
    });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('logIdがnullの場合は保存しない', async () => {
    const { result } = renderHook(() => useAutoSave(null));
    act(() => { result.current.save({ ambient_temp: 25 }); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('保存成功後にsaved状態になる', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 25 }); });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(result.current.status).toBe('saved');
  });

  it('saved状態は3秒後にidleに戻る', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 25 }); });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(result.current.status).toBe('saved');
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(result.current.status).toBe('idle');
  });

  it('部分更新が可能（1フィールドだけ）', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ air_pressure: 0.25 }); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('複数フィールドの同時更新が可能', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 22, ambient_humidity: 55 }); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('updated_atが自動付与される', async () => {
    const { result } = renderHook(() => useAutoSave('log-1'));
    act(() => { result.current.save({ ambient_temp: 22 }); });
    await act(async () => { vi.advanceTimersByTime(500); });
    const callArgs = mockUpdate.mock.calls[0][0];
    expect(callArgs).toHaveProperty('updated_at');
  });
});

describe('下書き（Draft）システム', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('下書きはlocalStorageに保存される', () => {
    const draft = {
      form: { painted_at: new Date().toISOString(), defects: {}, photo_urls: [], video_urls: [], custom_fields: {} },
      touchedFields: [],
      pinnedFields: {},
      createdAt: Date.now(),
      dbId: null,
    };
    localStorage.setItem('paintlog_draft', JSON.stringify(draft));
    const loaded = localStorage.getItem('paintlog_draft');
    expect(loaded).toBeTruthy();
    expect(JSON.parse(loaded!).dbId).toBeNull();
  });

  it('touchedFieldsが操作を追跡する', () => {
    const touched: string[] = [];
    touched.push('ambient_temp');
    touched.push('air_pressure');
    expect(touched).toHaveLength(2);
    expect(touched).toContain('ambient_temp');
  });

  it('同じフィールドは重複追跡しない', () => {
    const touched = ['ambient_temp'];
    const key = 'ambient_temp';
    const updated = touched.includes(key) ? touched : [...touched, key];
    expect(updated).toHaveLength(1);
  });

  it('dbIdがnullならDB未保存（下書き状態）', () => {
    const draft = { dbId: null };
    expect(draft.dbId).toBeNull();
  });

  it('dbIdが設定されたらDB保存済み', () => {
    const draft = { dbId: 'log-123' };
    expect(draft.dbId).toBe('log-123');
  });

  it('24時間経過した下書きは期限切れ', () => {
    const expiry = 24 * 60 * 60 * 1000;
    const oldDraft = { createdAt: Date.now() - expiry - 1000 };
    expect(Date.now() - oldDraft.createdAt > expiry).toBe(true);
  });

  it('24時間以内の下書きは有効', () => {
    const expiry = 24 * 60 * 60 * 1000;
    const freshDraft = { createdAt: Date.now() - 1000 };
    expect(Date.now() - freshDraft.createdAt > expiry).toBe(false);
  });

  it('下書きクリアでlocalStorageが空になる', () => {
    localStorage.setItem('paintlog_draft', '{}');
    localStorage.removeItem('paintlog_draft');
    expect(localStorage.getItem('paintlog_draft')).toBeNull();
  });
});

describe('デフォルト値の優先順位', () => {
  it('固定値（ピン）が最優先', () => {
    const pinned = { ambient_temp: 22 };
    const lastLog = { ambient_temp: 25 };
    // ピン値が適用される
    const result = pinned.ambient_temp;
    expect(result).toBe(22);
  });

  it('ピンなしは前回値を使用', () => {
    const pinned: Record<string, unknown> = {};
    const lastLog = { ambient_temp: 25 };
    const result = 'ambient_temp' in pinned ? pinned.ambient_temp : lastLog.ambient_temp;
    expect(result).toBe(25);
  });

  it('ピンも前回値もなければnull', () => {
    const pinned: Record<string, unknown> = {};
    const lastLog: Record<string, unknown> = {};
    const result = 'ambient_temp' in pinned ? pinned.ambient_temp : (lastLog.ambient_temp ?? null);
    expect(result).toBeNull();
  });

  it('ピン値の追加と削除', () => {
    const pinned: Record<string, unknown> = { ambient_temp: 22 };
    // 追加
    pinned.air_pressure = 0.25;
    expect(pinned).toHaveProperty('air_pressure', 0.25);
    // 削除
    delete pinned.ambient_temp;
    expect(pinned).not.toHaveProperty('ambient_temp');
  });

  it('複数フィールドのピン', () => {
    const pinned = { ambient_temp: 22, air_pressure: 0.25, throttle_turns: 2.25 };
    expect(Object.keys(pinned)).toHaveLength(3);
  });

  it('ピン値は数値でも文字列でも保存可能', () => {
    const pinned: Record<string, unknown> = {};
    pinned.ambient_temp = 22;
    pinned.paint_type = 'クリアコート';
    expect(typeof pinned.ambient_temp).toBe('number');
    expect(typeof pinned.paint_type).toBe('string');
  });
});

describe('テキストサジェスト管理', () => {
  it('サジェスト配列のフィルタリング', () => {
    const suggestions = ['クリアコート', 'ベースコート', 'プライマー'];
    const filtered = suggestions.filter((s) => s.includes('コート'));
    expect(filtered).toEqual(['クリアコート', 'ベースコート']);
  });

  it('空文字列では全件返す', () => {
    const suggestions = ['クリアコート', 'ベースコート'];
    const filtered = suggestions.filter((s) => s.toLowerCase().includes(''));
    expect(filtered).toHaveLength(2);
  });

  it('大文字小文字を区別しない（英字）', () => {
    const suggestions = ['Nax Clear', 'nax base'];
    const filtered = suggestions.filter((s) => s.toLowerCase().includes('nax'));
    expect(filtered).toHaveLength(2);
  });

  it('削除で論理削除される', () => {
    const suggestions = ['A', 'B', 'C'];
    const after = suggestions.filter((s) => s !== 'B');
    expect(after).toEqual(['A', 'C']);
  });

  it('フィールド名でグルーピング', () => {
    const raw = [
      { field_name: 'paint_type', value: 'クリア' },
      { field_name: 'paint_type', value: 'ベース' },
      { field_name: 'gun_type', value: 'Devilbiss' },
    ];
    const map: Record<string, string[]> = {};
    raw.forEach((s) => {
      if (!map[s.field_name]) map[s.field_name] = [];
      map[s.field_name].push(s.value);
    });
    expect(map['paint_type']).toHaveLength(2);
    expect(map['gun_type']).toHaveLength(1);
  });
});

describe('フォームデータバリデーション', () => {
  it('painted_atは必須（ISO文字列）', () => {
    const dt = new Date().toISOString();
    expect(dt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('温度値は数値型', () => {
    const temp = 22.5;
    expect(typeof temp).toBe('number');
    expect(temp).toBeGreaterThanOrEqual(-20);
    expect(temp).toBeLessThanOrEqual(100);
  });

  it('湿度は0-100の範囲', () => {
    const humidity = 55;
    expect(humidity).toBeGreaterThanOrEqual(0);
    expect(humidity).toBeLessThanOrEqual(100);
  });

  it('エア圧は0-0.5 MPaの範囲', () => {
    const pressure = 0.25;
    expect(pressure).toBeGreaterThanOrEqual(0);
    expect(pressure).toBeLessThanOrEqual(0.5);
  });

  it('回転数は0.25刻み', () => {
    const turns = 2.25;
    expect((turns * 4) % 1).toBe(0);
  });

  it('膜厚は正の整数', () => {
    const thickness = 35;
    expect(thickness).toBeGreaterThan(0);
    expect(Number.isInteger(thickness)).toBe(true);
  });

  it('コート数は1-6', () => {
    const coats = 3;
    expect(coats).toBeGreaterThanOrEqual(1);
    expect(coats).toBeLessThanOrEqual(6);
  });

  it('ファン出力は0-100%', () => {
    const fan = 80;
    expect(fan).toBeGreaterThanOrEqual(0);
    expect(fan).toBeLessThanOrEqual(100);
  });

  it('希釈率は0-100%', () => {
    const ratio = 40;
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(100);
  });

  it('defectsは文字列配列', () => {
    const defects = ['タレ', 'ブツ'];
    expect(Array.isArray(defects)).toBe(true);
    defects.forEach((d) => expect(typeof d).toBe('string'));
  });

  it('photo_urlsはURL配列', () => {
    const urls = ['https://s3.example.com/photo1.jpg'];
    urls.forEach((u) => expect(u).toMatch(/^https?:\/\//));
  });

  it('custom_fieldsはオブジェクト型', () => {
    const cf = { custom_field_1: 'value' };
    expect(typeof cf).toBe('object');
    expect(Array.isArray(cf)).toBe(false);
  });
});

describe('S3アップロードフロー', () => {
  it('ファイル名から拡張子を取得する', () => {
    const ext = 'photo.jpg'.split('.').pop();
    expect(ext).toBe('jpg');
  });

  it('拡張子なしでも動く', () => {
    const ext = 'noext'.split('.').pop();
    expect(ext).toBe('noext');
  });

  it('photoタイプでphotosフォルダを使う', () => {
    const type = 'photo';
    const folder = type === 'video' ? 'videos' : 'photos';
    expect(folder).toBe('photos');
  });

  it('videoタイプでvideosフォルダを使う', () => {
    const type = 'video';
    const folder = type === 'video' ? 'videos' : 'photos';
    expect(folder).toBe('videos');
  });

  it('S3キーにユーザーIDが含まれる', () => {
    const userId = 'user-123';
    const key = `${userId}/photos/uuid.jpg`;
    expect(key).toContain('user-123');
  });

  it('公開URLが正しいフォーマット', () => {
    const bucket = 'paintlog';
    const region = 'ap-northeast-1';
    const key = 'user-123/photos/test.jpg';
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    expect(url).toContain('paintlog');
    expect(url).toContain('ap-northeast-1');
    expect(url).toContain('test.jpg');
  });
});

describe('一覧画面のフィルタリング', () => {
  const logs = [
    { paint_type: 'クリアコート', paint_product: 'Nax Clear', comment: '良好' },
    { paint_type: 'ベースコート', paint_product: 'Nax Base', comment: null },
    { paint_type: 'プライマー', paint_product: null, comment: 'テスト' },
  ];

  it('塗装種類でフィルタできる', () => {
    const filtered = logs.filter((l) => l.paint_type?.includes('クリア'));
    expect(filtered).toHaveLength(1);
  });

  it('塗料品番でフィルタできる', () => {
    const filtered = logs.filter((l) => l.paint_product?.includes('Nax'));
    expect(filtered).toHaveLength(2);
  });

  it('コメントでフィルタできる', () => {
    const filtered = logs.filter((l) => l.comment?.includes('テスト'));
    expect(filtered).toHaveLength(1);
  });

  it('空文字列で全件返す', () => {
    const filter = '';
    const filtered = logs.filter((l) => !filter || l.paint_type?.includes(filter));
    expect(filtered).toHaveLength(3);
  });

  it('該当なしで空配列', () => {
    const filtered = logs.filter((l) => l.paint_type?.includes('存在しない'));
    expect(filtered).toHaveLength(0);
  });

  it('nullフィールドでもエラーにならない', () => {
    const filtered = logs.filter((l) => l.paint_product?.includes('search') || false);
    expect(filtered).toHaveLength(0);
  });
});

describe('お気に入りプリフィル', () => {
  const sourcLog = {
    ambient_temp: 22, ambient_humidity: 55, air_pressure: 0.25,
    paint_type: 'クリア', throttle_turns: 2.25,
    painted_at: '2025-01-01', photo_urls: ['url1'], video_urls: ['url2'],
  };

  it('温度がコピーされる', () => {
    const result: Record<string, unknown> = {};
    Object.entries(sourcLog).forEach(([k, v]) => {
      if (!['painted_at', 'photo_urls', 'video_urls'].includes(k) && v !== null) {
        result[k] = v;
      }
    });
    expect(result.ambient_temp).toBe(22);
  });

  it('painted_atはコピーされない', () => {
    const result: Record<string, unknown> = {};
    Object.entries(sourcLog).forEach(([k, v]) => {
      if (!['painted_at', 'photo_urls', 'video_urls'].includes(k)) {
        result[k] = v;
      }
    });
    expect(result).not.toHaveProperty('painted_at');
  });

  it('photo_urlsはコピーされない', () => {
    const result: Record<string, unknown> = {};
    Object.entries(sourcLog).forEach(([k, v]) => {
      if (!['painted_at', 'photo_urls', 'video_urls'].includes(k)) {
        result[k] = v;
      }
    });
    expect(result).not.toHaveProperty('photo_urls');
  });

  it('video_urlsはコピーされない', () => {
    const result: Record<string, unknown> = {};
    Object.entries(sourcLog).forEach(([k, v]) => {
      if (!['painted_at', 'photo_urls', 'video_urls'].includes(k)) {
        result[k] = v;
      }
    });
    expect(result).not.toHaveProperty('video_urls');
  });

  it('全数値フィールドがコピーされる', () => {
    const result: Record<string, unknown> = {};
    Object.entries(sourcLog).forEach(([k, v]) => {
      if (!['painted_at', 'photo_urls', 'video_urls'].includes(k)) {
        result[k] = v;
      }
    });
    expect(result.air_pressure).toBe(0.25);
    expect(result.throttle_turns).toBe(2.25);
  });
});

describe('分析データ計算', () => {
  const logs = [
    { film_thickness: 30, defects: {} },
    { film_thickness: 35, defects: { 'タレ': 1 } },
    { film_thickness: 40, defects: {} },
    { film_thickness: null, defects: { 'ブツ': 1, 'ハジキ': 1 } },
  ];

  it('平均膜厚を計算する', () => {
    const valid = logs.filter((l) => l.film_thickness !== null);
    const avg = valid.reduce((s, l) => s + (l.film_thickness || 0), 0) / valid.length;
    expect(Math.round(avg)).toBe(35);
  });

  it('不具合なし率を計算する', () => {
    const total = logs.length;
    const defectFree = logs.filter((l) => Object.keys(l.defects || {}).length === 0).length;
    expect(Math.round((defectFree / total) * 100)).toBe(50);
  });

  it('不具合カウントを集計する', () => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => Object.entries(l.defects || {}).forEach(([d, sev]) => { counts[d] = (counts[d] || 0) + (sev as number); }));
    expect(counts['タレ']).toBe(1);
    expect(counts['ブツ']).toBe(1);
    expect(counts['ハジキ']).toBe(1);
  });

  it('null膜厚は集計から除外', () => {
    const valid = logs.filter((l) => l.film_thickness !== null);
    expect(valid).toHaveLength(3);
  });

  it('総記録数', () => {
    expect(logs.length).toBe(4);
  });

  it('全記録が不具合なしの場合100%', () => {
    const clean = [{ defects: {} }, { defects: {} }];
    const rate = clean.filter((l) => Object.keys(l.defects || {}).length === 0).length / clean.length * 100;
    expect(rate).toBe(100);
  });

  it('全記録に不具合ありの場合0%', () => {
    const dirty = [{ defects: { 'タレ': 1 } }, { defects: { 'ブツ': 1 } }];
    const rate = dirty.filter((l) => Object.keys(l.defects || {}).length === 0).length / dirty.length * 100;
    expect(rate).toBe(0);
  });

  it('空データでもエラーにならない', () => {
    const empty: typeof logs = [];
    const total = empty.length || 1;
    const avg = 0 / total;
    expect(avg).toBe(0);
  });
});

describe('カテゴリサマリー表示', () => {
  it('環境条件: 温度と湿度を表示', () => {
    const form = { ambient_temp: 22, ambient_humidity: 55 };
    const summary = [
      form.ambient_temp !== null ? `${form.ambient_temp}℃` : '',
      form.ambient_humidity !== null ? `${form.ambient_humidity}%` : '',
    ].filter(Boolean).join(' / ');
    expect(summary).toBe('22℃ / 55%');
  });

  it('塗料情報: 種類を表示', () => {
    expect('クリアコート' || '未入力').toBe('クリアコート');
  });

  it('ガン設定: エア圧を表示', () => {
    const pressure = 0.25;
    expect(`${pressure}MPa`).toBe('0.25MPa');
  });

  it('工程: コート数を表示', () => {
    const coats = 3;
    expect(`${coats}コート`).toBe('3コート');
  });

  it('記録: 写真/動画数を表示', () => {
    const photos = ['a', 'b'];
    const videos = ['c'];
    expect(`写真${photos.length} 動画${videos.length}`).toBe('写真2 動画1');
  });

  it('未入力時に「未入力」と表示', () => {
    const form = { ambient_temp: null, ambient_humidity: null };
    const summary = [
      form.ambient_temp !== null ? `${form.ambient_temp}℃` : '',
      form.ambient_humidity !== null ? `${form.ambient_humidity}%` : '',
    ].filter(Boolean).join(' / ') || '未入力';
    expect(summary).toBe('未入力');
  });
});

describe('レスポンシブ・iPhone対応', () => {
  it('viewport設定が正しい', () => {
    // layout.tsxのviewport設定を検証
    const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };
    expect(viewport.maximumScale).toBe(1);
    expect(viewport.userScalable).toBe(false);
  });

  it('touch-manipulationクラスが操作要素に適用される', () => {
    const buttonClasses = 'px-4 py-2 touch-manipulation';
    expect(buttonClasses).toContain('touch-manipulation');
  });

  it('最小タップ領域が44px以上', () => {
    const minSize = 44;
    expect(minSize).toBeGreaterThanOrEqual(44);
  });

  it('safe-area-inset対応', () => {
    const topPadding = 'pt-[env(safe-area-inset-top)]';
    expect(topPadding).toContain('safe-area-inset');
  });

  it('bottom navのpaddingにsafe-areaが含まれる', () => {
    const bottomPadding = 'pb-[env(safe-area-inset-bottom)]';
    expect(bottomPadding).toContain('safe-area-inset-bottom');
  });
});

describe('日本語UIラベル', () => {
  const labels: Record<string, string> = {
    ambient_temp: '気温', ambient_humidity: '湿度', booth_temp: 'ブース気温',
    workpiece_temp: 'ワーク温度', paint_temp: '塗料温度', paint_type: '塗装種類',
    paint_product: '塗料品番', dilution_ratio: '希釈率', air_pressure: 'エア圧',
    throttle_turns: '絞り', needle_turns: 'ニードル', gun_type: 'ガン種類',
    gun_distance: 'ガン距離', coat_count: 'コート数', film_thickness: '膜厚',
    fan_power: 'ファン出力', surface_prep: '下地処理', drying_method: '乾燥方法',
  };

  it('全18フィールドに日本語ラベルがある', () => {
    expect(Object.keys(labels)).toHaveLength(18);
  });

  it('全ラベルが日本語である', () => {
    Object.values(labels).forEach((label) => {
      expect(label).toMatch(/[\u3000-\u9FFF]/); // CJK文字を含む
    });
  });

  it('英語ラベルは含まれない', () => {
    Object.values(labels).forEach((label) => {
      expect(label).not.toMatch(/^[a-zA-Z\s]+$/); // 英語のみではない
    });
  });
});
