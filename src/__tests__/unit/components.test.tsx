import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PinnedBanner from '@/components/PinnedBanner';
import SaveStatusBar from '@/components/SaveStatusBar';
import BottomNav from '@/components/BottomNav';
import FavoritesBar from '@/components/FavoritesBar';
import AutocompleteInput from '@/components/AutocompleteInput';
import { PaintLog } from '@/lib/types';

// ========== PinnedBanner ==========
describe('PinnedBanner', () => {
  const labels = { ambient_temp: '気温', air_pressure: 'エア圧' };

  it('ピンされたフィールドを表示する', () => {
    render(<PinnedBanner pinnedFields={{ ambient_temp: 22, air_pressure: 0.25 }} fieldLabels={labels} />);
    expect(screen.getByText('固定値を適用しました')).toBeInTheDocument();
    expect(screen.getByText(/気温/)).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
  });

  it('空のピンフィールドでは何も表示しない', () => {
    const { container } = render(<PinnedBanner pinnedFields={{}} fieldLabels={labels} />);
    expect(container.firstChild).toBeNull();
  });

  it('✕ボタンで非表示にできる', () => {
    render(<PinnedBanner pinnedFields={{ ambient_temp: 22 }} fieldLabels={labels} />);
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('固定値を適用しました')).not.toBeInTheDocument();
  });

  it('複数のピンフィールドを全て表示する', () => {
    render(<PinnedBanner pinnedFields={{ ambient_temp: 22, air_pressure: 0.25 }} fieldLabels={labels} />);
    expect(screen.getByText(/エア圧/)).toBeInTheDocument();
    expect(screen.getByText(/0.25/)).toBeInTheDocument();
  });

  it('ラベルにないキーはキー名をそのまま表示する', () => {
    render(<PinnedBanner pinnedFields={{ unknown_key: 42 }} fieldLabels={labels} />);
    expect(screen.getByText(/unknown_key/)).toBeInTheDocument();
  });

  it('📌アイコンが表示される', () => {
    render(<PinnedBanner pinnedFields={{ ambient_temp: 22 }} fieldLabels={labels} />);
    expect(screen.getByText('📌')).toBeInTheDocument();
  });
});

// ========== SaveStatusBar ==========
describe('SaveStatusBar', () => {
  it('idle時は何も表示しない', () => {
    const { container } = render(<SaveStatusBar status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('saving時に「保存中...」を表示する', () => {
    render(<SaveStatusBar status="saving" />);
    expect(screen.getByText('保存中...')).toBeInTheDocument();
  });

  it('saved時に「✓ 保存済み」を表示する', () => {
    render(<SaveStatusBar status="saved" />);
    expect(screen.getByText('✓ 保存済み')).toBeInTheDocument();
  });

  it('error時に「⚠ 保存エラー」を表示する', () => {
    render(<SaveStatusBar status="error" />);
    expect(screen.getByText('⚠ 保存エラー')).toBeInTheDocument();
  });
});

// ========== BottomNav ==========
describe('BottomNav', () => {
  it('4つのタブを表示する', () => {
    render(<BottomNav />);
    expect(screen.getByText('記録一覧')).toBeInTheDocument();
    expect(screen.getByText('新規作成')).toBeInTheDocument();
    expect(screen.getByText('分析')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('各タブにアイコンがある', () => {
    render(<BottomNav />);
    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('➕')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('リンクが正しいhrefを持つ', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/logs');
    expect(hrefs).toContain('/logs/new');
    expect(hrefs).toContain('/analysis');
    expect(hrefs).toContain('/settings');
  });

  it('現在パスのタブがアクティブスタイル', () => {
    render(<BottomNav />);
    const logLink = screen.getByText('記録一覧').closest('a');
    expect(logLink?.className).toContain('text-blue-600');
  });

  it('固定ナビバーである', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('fixed');
    expect(nav?.className).toContain('bottom-0');
  });

  it('z-indexが設定されている', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('z-50');
  });
});

// ========== FavoritesBar ==========
describe('FavoritesBar', () => {
  const mockLog: PaintLog = {
    id: 'log-1', created_at: '2025-04-05T10:00:00Z', updated_at: '2025-04-05T10:00:00Z',
    user_id: 'u1', painted_at: '2025-04-05T14:30:00Z',
    ambient_temp: 22, ambient_humidity: 55, booth_temp: 24,
    workpiece_temp: 20, paint_temp: 21,
    paint_type: 'クリアコート', paint_product: 'Nax Clear', dilution_ratio: 40, paint_lot: null,
    air_pressure: 0.25, throttle_turns: 2.25, needle_turns: 1.75,
    gun_type: 'Devilbiss', gun_distance: 18,
    coat_count: 2, surface_prep: null, drying_method: null,
    film_thickness: 35, fan_power: 80, defects: [],
    photo_urls: [], video_urls: [], comment: null, custom_fields: {},
  };

  it('ログがあれば表示する', () => {
    render(<FavoritesBar recentLogs={[mockLog]} onSelect={vi.fn()} />);
    expect(screen.getByText('直近の記録からコピー')).toBeInTheDocument();
  });

  it('空配列では何も表示しない', () => {
    const { container } = render(<FavoritesBar recentLogs={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('塗装種類を表示する', () => {
    render(<FavoritesBar recentLogs={[mockLog]} onSelect={vi.fn()} />);
    expect(screen.getByText('クリアコート')).toBeInTheDocument();
  });

  it('エア圧を表示する', () => {
    render(<FavoritesBar recentLogs={[mockLog]} onSelect={vi.fn()} />);
    expect(screen.getByText(/0.25MPa/)).toBeInTheDocument();
  });

  it('クリックでonSelectが呼ばれる', () => {
    const onSelect = vi.fn();
    render(<FavoritesBar recentLogs={[mockLog]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('クリアコート'));
    expect(onSelect).toHaveBeenCalledWith(mockLog);
  });

  it('複数のログを表示する', () => {
    const logs = [
      { ...mockLog, id: '1', paint_type: 'プライマー' },
      { ...mockLog, id: '2', paint_type: 'ベースコート' },
    ];
    render(<FavoritesBar recentLogs={logs} onSelect={vi.fn()} />);
    expect(screen.getByText('プライマー')).toBeInTheDocument();
    expect(screen.getByText('ベースコート')).toBeInTheDocument();
  });
});

// ========== AutocompleteInput ==========
describe('AutocompleteInput', () => {
  const defaultProps = {
    label: '塗装種類',
    fieldName: 'paint_type',
    value: '',
    onChange: vi.fn(),
    suggestions: ['クリアコート', 'ベースコート', 'プライマー'],
    onDeleteSuggestion: vi.fn(),
  };

  it('ラベルを表示する', () => {
    render(<AutocompleteInput {...defaultProps} />);
    expect(screen.getByText('塗装種類')).toBeInTheDocument();
  });

  it('プレースホルダーを表示する', () => {
    render(<AutocompleteInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('入力または履歴から選択')).toBeInTheDocument();
  });

  it('フォーカスでドロップダウンが開く', () => {
    render(<AutocompleteInput {...defaultProps} />);
    fireEvent.focus(screen.getByPlaceholderText('入力または履歴から選択'));
    expect(screen.getByText('クリアコート')).toBeInTheDocument();
  });

  it('候補をクリックで選択する', () => {
    const onChange = vi.fn();
    render(<AutocompleteInput {...defaultProps} onChange={onChange} />);
    fireEvent.focus(screen.getByPlaceholderText('入力または履歴から選択'));
    fireEvent.click(screen.getByText('クリアコート'));
    expect(onChange).toHaveBeenCalledWith('クリアコート');
  });

  it('入力でフィルタリングされる', () => {
    render(<AutocompleteInput {...defaultProps} />);
    const input = screen.getByPlaceholderText('入力または履歴から選択');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'クリア' } });
    expect(screen.getByText('クリアコート')).toBeInTheDocument();
  });

  it('✕ボタンで候補が削除される', () => {
    const onDelete = vi.fn();
    render(<AutocompleteInput {...defaultProps} onDeleteSuggestion={onDelete} />);
    fireEvent.focus(screen.getByPlaceholderText('入力または履歴から選択'));
    const deleteButtons = screen.getAllByText('✕');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalled();
  });

  it('ピンアイコンが表示される', () => {
    render(<AutocompleteInput {...defaultProps} pinned={false} onPin={vi.fn()} />);
    expect(screen.getByText('📌')).toBeInTheDocument();
  });

  it('カスタムプレースホルダーを表示する', () => {
    render(<AutocompleteInput {...defaultProps} placeholder="任意" />);
    expect(screen.getByPlaceholderText('任意')).toBeInTheDocument();
  });

  it('候補なしでドロップダウンが表示されない', () => {
    render(<AutocompleteInput {...defaultProps} suggestions={[]} />);
    fireEvent.focus(screen.getByPlaceholderText('入力または履歴から選択'));
    expect(screen.queryByText('クリアコート')).not.toBeInTheDocument();
  });

  it('値が設定済みの場合に表示される', () => {
    render(<AutocompleteInput {...defaultProps} value="テスト値" />);
    expect(screen.getByDisplayValue('テスト値')).toBeInTheDocument();
  });
});
