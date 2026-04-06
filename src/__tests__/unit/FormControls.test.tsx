import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefectChips, CoatSelector, SliderInput } from '@/components/FormControls';

describe('DefectChips', () => {
  it('全不具合選択肢を表示する', () => {
    render(<DefectChips value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('タレ')).toBeInTheDocument();
    expect(screen.getByText('ブツ')).toBeInTheDocument();
    expect(screen.getByText('ハジキ')).toBeInTheDocument();
    expect(screen.getByText('ゆず肌')).toBeInTheDocument();
    expect(screen.getByText('ピンホール')).toBeInTheDocument();
    expect(screen.getByText('クレーター')).toBeInTheDocument();
    expect(screen.getByText('色ムラ')).toBeInTheDocument();
    expect(screen.getByText('薄膜')).toBeInTheDocument();
    expect(screen.getByText('その他')).toBeInTheDocument();
  });

  it('ラベルを表示する', () => {
    render(<DefectChips value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('不具合（タップで選択）')).toBeInTheDocument();
  });

  it('未選択時に「選択なし = 不具合なし」表示', () => {
    render(<DefectChips value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('選択なし = 不具合なし')).toBeInTheDocument();
  });

  it('タップで選択する', () => {
    const onChange = vi.fn();
    render(<DefectChips value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('タレ'));
    expect(onChange).toHaveBeenCalledWith(['タレ']);
  });

  it('選択済みをタップで解除する', () => {
    const onChange = vi.fn();
    render(<DefectChips value={['タレ', 'ブツ']} onChange={onChange} />);
    fireEvent.click(screen.getByText('タレ'));
    expect(onChange).toHaveBeenCalledWith(['ブツ']);
  });

  it('複数選択可能', () => {
    const onChange = vi.fn();
    render(<DefectChips value={['タレ']} onChange={onChange} />);
    fireEvent.click(screen.getByText('ブツ'));
    expect(onChange).toHaveBeenCalledWith(['タレ', 'ブツ']);
  });

  it('選択中のチップにスタイルが付く', () => {
    render(<DefectChips value={['タレ']} onChange={vi.fn()} />);
    const chip = screen.getByText('タレ');
    expect(chip.className).toContain('bg-red-50');
  });

  it('未選択チップはデフォルトスタイル', () => {
    render(<DefectChips value={[]} onChange={vi.fn()} />);
    const chip = screen.getByText('タレ');
    expect(chip.className).toContain('bg-white');
  });
});

describe('CoatSelector', () => {
  it('1〜6のボタンを表示する', () => {
    render(<CoatSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6+')).toBeInTheDocument();
  });

  it('ラベルを表示する', () => {
    render(<CoatSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('コート数')).toBeInTheDocument();
  });

  it('タップでonChangeが呼ばれる', () => {
    const onChange = vi.fn();
    render(<CoatSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('選択中の値にスタイルが付く', () => {
    render(<CoatSelector value={2} onChange={vi.fn()} />);
    const btn = screen.getByText('2');
    expect(btn.className).toContain('bg-blue-50');
  });

  it('未選択の値はデフォルトスタイル', () => {
    render(<CoatSelector value={2} onChange={vi.fn()} />);
    const btn = screen.getByText('3');
    expect(btn.className).toContain('bg-white');
  });

  it('6+をタップで6が返る', () => {
    const onChange = vi.fn();
    render(<CoatSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('6+'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('ピンアイコンが表示される', () => {
    render(<CoatSelector value={2} onChange={vi.fn()} pinned={false} onPin={vi.fn()} />);
    expect(screen.getByText('📌')).toBeInTheDocument();
  });

  it('ピンクリックでonPinが呼ばれる', () => {
    const onPin = vi.fn();
    render(<CoatSelector value={2} onChange={vi.fn()} pinned={false} onPin={onPin} />);
    fireEvent.click(screen.getByText('📌'));
    expect(onPin).toHaveBeenCalled();
  });
});

describe('SliderInput', () => {
  it('ラベルを表示する', () => {
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} />);
    expect(screen.getByText('ファン出力')).toBeInTheDocument();
  });

  it('単位を表示する', () => {
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('現在値を表示する', () => {
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} />);
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('null値でmin値を表示する', () => {
    render(<SliderInput label="ファン出力" unit="%" value={null} onChange={vi.fn()} min={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('スライダーの値変更でonChangeが呼ばれる', () => {
    const onChange = vi.fn();
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });
    expect(onChange).toHaveBeenCalledWith(60);
  });

  it('スライダーのmin/max/stepが正しい', () => {
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} min={0} max={100} step={5} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '5');
  });

  it('ピンアイコンが表示される', () => {
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} pinned={true} onPin={vi.fn()} />);
    expect(screen.getByText('📌')).toBeInTheDocument();
  });

  it('ピンクリックでonPinが呼ばれる', () => {
    const onPin = vi.fn();
    render(<SliderInput label="ファン出力" unit="%" value={80} onChange={vi.fn()} pinned={false} onPin={onPin} />);
    fireEvent.click(screen.getByText('📌'));
    expect(onPin).toHaveBeenCalled();
  });
});
