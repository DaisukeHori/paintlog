import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TurnsInput from '@/components/TurnsInput';

describe('TurnsInput', () => {
  const defaultProps = { label: '絞り（回転数）', value: 2.25, onChange: vi.fn() };

  it('ラベルを表示する', () => {
    render(<TurnsInput {...defaultProps} />);
    expect(screen.getByText('絞り（回転数）')).toBeInTheDocument();
  });

  it('「回転」単位を表示する', () => {
    render(<TurnsInput {...defaultProps} />);
    expect(screen.getByText('回転')).toBeInTheDocument();
  });

  it('2 1/4 を正しく表示する', () => {
    render(<TurnsInput {...defaultProps} value={2.25} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('+で0.25増加する', () => {
    const onChange = vi.fn();
    render(<TurnsInput {...defaultProps} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('−で0.25減少する', () => {
    const onChange = vi.fn();
    render(<TurnsInput {...defaultProps} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('0以下にならない', () => {
    const onChange = vi.fn();
    render(<TurnsInput {...defaultProps} value={0} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('max以上にならない', () => {
    const onChange = vi.fn();
    render(<TurnsInput {...defaultProps} value={5} max={5} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('null値で0として扱う', () => {
    const onChange = vi.fn();
    render(<TurnsInput {...defaultProps} value={null} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(0.25);
  });

  it('フルドットが正しい数表示される', () => {
    const { container } = render(<TurnsInput {...defaultProps} value={3} onChange={vi.fn()} />);
    const fullDots = container.querySelectorAll('.bg-purple-600');
    expect(fullDots.length).toBe(3);
  });

  it('ピンアイコンが表示される', () => {
    render(<TurnsInput {...defaultProps} pinned={false} onPin={vi.fn()} />);
    expect(screen.getByText('📌')).toBeInTheDocument();
  });

  it('ピンクリックでonPinが呼ばれる', () => {
    const onPin = vi.fn();
    render(<TurnsInput {...defaultProps} pinned={false} onPin={onPin} />);
    fireEvent.click(screen.getByText('📌'));
    expect(onPin).toHaveBeenCalled();
  });

  it('pinned=trueでピンスタイルが変わる', () => {
    const { container } = render(<TurnsInput {...defaultProps} pinned={true} onPin={vi.fn()} />);
    const pinBtn = container.querySelector('.bg-purple-100');
    expect(pinBtn).toBeTruthy();
  });
});
