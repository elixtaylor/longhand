import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { rightTriangleSolver } from '../solvers/trigonometry/right-triangle';
import { StructuredInputForm } from './StructuredInputForm';

describe('StructuredInputForm calculators', () => {
  it('fills a missing right-triangle side without showing working', async () => {
    const method = rightTriangleSolver.methods.find(
      (candidate) => candidate.id === 'pythagoras',
    )!;
    const onSubmit = vi.fn();
    render(
      <StructuredInputForm
        method={method}
        solver={rightTriangleSolver}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('a'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '4' } });

    await waitFor(() => {
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('5');
    });
    expect(
      (screen.getByRole('button', { name: 'Solve' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
