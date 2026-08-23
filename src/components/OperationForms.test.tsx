import { render, screen } from '@testing-library/react';
import { ComplexOperationForm } from './ComplexOperationForm';
import { ProbabilityOperationForm } from './ProbabilityOperationForm';

describe('controlled calculator operations', () => {
  it('shows the probability operation selected by the method tabs', () => {
    const view = render(
      <ProbabilityOperationForm
        methodId="single"
        onSubmit={vi.fn()}
        onOperationChange={vi.fn()}
      />,
    );

    view.rerender(
      <ProbabilityOperationForm
        methodId="union"
        onSubmit={vi.fn()}
        onOperationChange={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole('button', { name: 'Union (or)' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByLabelText('P(A)')).toBeTruthy();
  });

  it('shows polar inputs when the polar method is selected externally', () => {
    const view = render(
      <ComplexOperationForm methodId="rectangular" onSubmit={vi.fn()} />,
    );

    view.rerender(<ComplexOperationForm methodId="polar" onSubmit={vi.fn()} />);

    expect(
      screen
        .getByRole('button', { name: 'Polar form' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByLabelText('z — real part')).toBeTruthy();
    expect(screen.queryByLabelText('z₂ — real part')).toBeNull();
  });
});
