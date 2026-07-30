import { fireEvent, render, screen } from '@testing-library/react';
import { BasicCalculator } from './BasicCalculator';

describe('BasicCalculator', () => {
  it('evaluates triangle functions in degrees by default', () => {
    render(<BasicCalculator onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Calculator expression'), {
      target: { value: 'tan(45)' },
    });

    expect(screen.getByLabelText('Calculator result').textContent).toBe('1');
  });

  it('supports inverse trig and switching to radians', () => {
    render(<BasicCalculator onClose={vi.fn()} />);
    const expression = screen.getByLabelText('Calculator expression');

    fireEvent.change(expression, { target: { value: 'arctan(1)' } });
    expect(screen.getByLabelText('Calculator result').textContent).toBe('45');

    fireEvent.click(screen.getByRole('button', { name: 'Radians' }));
    expect(screen.getByLabelText('Calculator result').textContent).toBe(
      '0.7853981634',
    );
  });
});
