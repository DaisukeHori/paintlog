import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StepperInput from '@/components/StepperInput';

describe('StepperInput', () => {
  const defaultProps = {
    label: '気温',
    unit: '℃',
    value: 22,
    onChange: vi.fn(),
  };

  it('ラベルを表示する', () => {
    render(<StepperInput {...defaultProps} />);
    expect(screen.getByText('気温')).toBeInTheDocument();
  });

  it('単位を表示する', () => {
    render(<StepperInput {...defaultProps} />);
    expect(screen.getByText('℃')).toBeInTheDocument();
  });

  it('現在値を表示する', () => {
    render(<StepperInput {...defaultProps} />);
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('null値の場合 -- を表示する', () => {
    render(<StepperInput {...defaultProps} value={null} />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('+ボタンで値が増加する', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(23);
  });

  it('−ボタンで値が減少する', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).toHaveBeenCalledWith(21);
  });

  it('min値以下にならない', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} value={-10} min={-10} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('max値以上にならない', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} value={50} max={50} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('step値でインクリメントする', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} step={0.01} value={0.25} decimals={2} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(0.26);
  });

  it('decimals指定で小数表示する', () => {
    render(<StepperInput {...defaultProps} value={0.25} decimals={2} />);
    expect(screen.getByText('0.25')).toBeInTheDocument();
  });

  it('プリセットボタンを表示する', () => {
    render(<StepperInput {...defaultProps} presets={[15, 20, 25]} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('プリセットクリックで値が設定される', () => {
    const onChange = vi.fn();
    render(<StepperInput {...defaultProps} presets={[15, 20, 25]} onChange={onChange} />);
    fireEvent.click(screen.getByText('25'));
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('ピンアイコンが表示される（pinned=false）', () => {
    render(<StepperInput {...defaultProps} pinned={false} onPin={vi.fn()} />);
    expect(screen.getByTitle('デフォルトに設定')).toBeInTheDocument();
  });

  it('ピンアイコンが表示される（pinned=true）', () => {
    render(<StepperInput {...defaultProps} pinned={true} onPin={vi.fn()} />);
    expect(screen.getByTitle('デフォルト設定済み')).toBeInTheDocument();
  });

  it('ピンクリックでonPinが呼ばれる', () => {
    const onPin = vi.fn();
    render(<StepperInput {...defaultProps} pinned={false} onPin={onPin} />);
    fireEvent.click(screen.getByTitle('デフォルトに設定'));
    expect(onPin).toHaveBeenCalled();
  });

  it('pinned未定義でピンアイコンは非表示', () => {
    render(<StepperInput {...defaultProps} />);
    expect(screen.queryByTitle('デフォルトに設定')).not.toBeInTheDocument();
  });

  it('バー表示時にバーが描画される', () => {
    const { container } = render(<StepperInput {...defaultProps} showBar barMax={50} />);
    const bar = container.querySelector('[class*="rounded-full"]');
    expect(bar).toBeTruthy();
  });

  it('湿度バーが警告閾値で色が変わる', () => {
    const { container } = render(
      <StepperInput {...defaultProps} value={75} showBar barMax={100} warningThreshold={70} dangerThreshold={85} />
    );
    const fills = container.querySelectorAll('[class*="transition-all"]');
    const fill = Array.from(fills).find((el) => (el as HTMLElement).style.backgroundColor);
    expect((fill as HTMLElement)?.style.backgroundColor).toMatch(/EF9F27|rgb\(239/i);
  });

  it('湿度バーが危険閾値で赤になる', () => {
    const { container } = render(
      <StepperInput {...defaultProps} value={90} showBar barMax={100} warningThreshold={70} dangerThreshold={85} />
    );
    const fills = container.querySelectorAll('[class*="transition-all"]');
    const fill = Array.from(fills).find((el) => (el as HTMLElement).style.backgroundColor);
    expect((fill as HTMLElement)?.style.backgroundColor).toMatch(/E24B4A|rgb\(226/i);
  });
});
