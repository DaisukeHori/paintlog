import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefectChips, CoatSelector, SliderInput } from '@/components/FormControls';

describe('DefectChips', () => {
  it('全不具合選択肢を表示する', () => {
    render(<DefectChips value={{}} onChange={vi.fn()} />);
    expect(screen.getByText('タレ')).toBeInTheDocument();
    expect(screen.getByText('ブツ')).toBeInTheDocument();
    expect(screen.getByText('ハジキ')).toBeInTheDocument();
    expect(screen.getByText('ゆず肌')).toBeInTheDocument();
  });

  it('ラベルを表示する', () => {
    render(<DefectChips value={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/不具合.*タップ/)).toBeInTheDocument();
  });

  it('未選択時に「選択なし」表示', () => {
    render(<DefectChips value={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/不具合なし/)).toBeInTheDocument();
  });

  it('タップで×1になる', () => {
    const onChange = vi.fn();
    render(<DefectChips value={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText('タレ'));
    expect(onChange).toHaveBeenCalledWith({ 'タレ': 1 });
  });

  it('バッチ上限でタップ→解除', () => {
    const onChange = vi.fn();
    render(<DefectChips value={{ 'タレ': 20, 'ブツ': 2 }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/タレ/));
    expect(onChange).toHaveBeenCalledWith({ 'ブツ': 2 });
  });

  it('タップで重症度が上がる', () => {
    const onChange = vi.fn();
    render(<DefectChips value={{ 'タレ': 2 }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/タレ/));
    expect(onChange).toHaveBeenCalledWith({ 'タレ': 3 });
  });

  it('選択中のチップに重症度表示', () => {
    render(<DefectChips value={{ 'タレ': 3 }} onChange={vi.fn()} />);
    expect(screen.getAllByText(/3枚/).length).toBeGreaterThan(0);
  });

  it('未選択チップはデフォルトスタイル', () => {
    render(<DefectChips value={{}} onChange={vi.fn()} />);
    const chip = screen.getByText('タレ');
    expect(chip.className).toContain('bg-white');
  });

  it('合計カウントを表示する', () => {
    render(<DefectChips value={{ 'タレ': 3, 'ブツ': 2 }} onChange={vi.fn()} />);
    expect(screen.getByText(/延べ5枚/)).toBeInTheDocument();
  });
});

describe('CoatSelector', () => {
  it('1〜6のボタンを表示する', () => {
    render(<CoatSelector value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it('タップでコート数が選択される', () => {
    const onChange = vi.fn();
    render(<CoatSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('選択中のボタンにスタイルが付く', () => {
    render(<CoatSelector value={3} onChange={vi.fn()} />);
    const btn = screen.getByText('3');
    expect(btn.className).toContain('bg-blue-50');
  });
});

describe('SliderInput', () => {
  it('ラベルと値を表示する', () => {
    render(<SliderInput label="希釈率" unit="%" value={50} onChange={vi.fn()} />);
    expect(screen.getByText('希釈率')).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('スライダーがある', () => {
    render(<SliderInput label="テスト" unit="%" value={50} onChange={vi.fn()} />);
    expect(document.querySelector('input[type="range"]')).toBeTruthy();
  });

  it('変更でonChangeが呼ばれる', () => {
    const onChange = vi.fn();
    render(<SliderInput label="テスト" unit="%" value={50} onChange={onChange} />);
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '70' } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});
