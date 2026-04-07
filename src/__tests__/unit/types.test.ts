import { describe, it, expect } from 'vitest';
import { turnsToDisplay, DEFECT_OPTIONS, CATEGORIES } from '@/lib/types';

describe('turnsToDisplay', () => {
  it('null を -- に変換する', () => {
    expect(turnsToDisplay(null)).toBe('--');
  });

  it('undefined を -- に変換する', () => {
    expect(turnsToDisplay(undefined as any)).toBe('--');
  });

  it('0 を "0" に変換する', () => {
    expect(turnsToDisplay(0)).toBe('0');
  });

  it('1 を "1" に変換する', () => {
    expect(turnsToDisplay(1)).toBe('1');
  });

  it('2 を "2" に変換する', () => {
    expect(turnsToDisplay(2)).toBe('2');
  });

  it('0.25 を "1/4" に変換する', () => {
    expect(turnsToDisplay(0.25)).toBe('1/4');
  });

  it('0.5 を "1/2" に変換する', () => {
    expect(turnsToDisplay(0.5)).toBe('1/2');
  });

  it('0.75 を "3/4" に変換する', () => {
    expect(turnsToDisplay(0.75)).toBe('3/4');
  });

  it('1.25 を "1 1/4" に変換する', () => {
    expect(turnsToDisplay(1.25)).toBe('1 1/4');
  });

  it('1.5 を "1 1/2" に変換する', () => {
    expect(turnsToDisplay(1.5)).toBe('1 1/2');
  });

  it('1.75 を "1 3/4" に変換する', () => {
    expect(turnsToDisplay(1.75)).toBe('1 3/4');
  });

  it('2.25 を "2 1/4" に変換する', () => {
    expect(turnsToDisplay(2.25)).toBe('2 1/4');
  });

  it('2.5 を "2 1/2" に変換する', () => {
    expect(turnsToDisplay(2.5)).toBe('2 1/2');
  });

  it('3.75 を "3 3/4" に変換する', () => {
    expect(turnsToDisplay(3.75)).toBe('3 3/4');
  });

  it('5 を "5" に変換する', () => {
    expect(turnsToDisplay(5)).toBe('5');
  });
});

describe('DEFECT_OPTIONS', () => {
  it('10個の不具合選択肢が定義されている', () => {
    expect(DEFECT_OPTIONS).toHaveLength(10);
  });

  it('タレが含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('タレ');
  });

  it('黒ブツ・白ブツが含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('黒ブツ'); expect(DEFECT_OPTIONS).toContain('白ブツ');
  });

  it('ハジキが含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('ハジキ');
  });

  it('ゆず肌が含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('ゆず肌');
  });

  it('ピンホールが含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('ピンホール');
  });

  it('その他が含まれる', () => {
    expect(DEFECT_OPTIONS).toContain('その他');
  });

  it('重複がない', () => {
    const unique = new Set(DEFECT_OPTIONS);
    expect(unique.size).toBe(DEFECT_OPTIONS.length);
  });
});

describe('CATEGORIES', () => {
  it('5カテゴリが定義されている', () => {
    expect(CATEGORIES).toHaveLength(5);
  });

  it('各カテゴリにid, key, label, colorがある', () => {
    CATEGORIES.forEach((c) => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('key');
      expect(c).toHaveProperty('label');
      expect(c).toHaveProperty('color');
    });
  });

  it('IDが1から5まで連番', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('環境条件カテゴリが最初', () => {
    expect(CATEGORIES[0].label).toBe('環境条件');
  });

  it('記録・エビデンスカテゴリが最後', () => {
    expect(CATEGORIES[4].label).toBe('記録・エビデンス');
  });

  it('keyが全て一意', () => {
    const keys = CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
