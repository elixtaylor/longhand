import { fireEvent, render, screen } from '@testing-library/react';
import { InductionOperationForm } from './InductionOperationForm';

describe('InductionOperationForm', () => {
  it('serializes the summand, start and domain for the induction solver', () => {
    const onSubmit = vi.fn();
    render(<InductionOperationForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Summand f(r)'), {
      target: { value: 'r^2' },
    });
    fireEvent.change(screen.getByLabelText('Start n₀'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Induction domain'), {
      target: { value: 'integer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show the proof' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'sum r^2 from r=2 to n domain=integer',
    );
  });

  it('keeps the proof action disabled until the summand is entered', () => {
    render(<InductionOperationForm onSubmit={vi.fn()} />);
    expect(
      (
        screen.getByRole('button', {
          name: 'Show the proof',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
