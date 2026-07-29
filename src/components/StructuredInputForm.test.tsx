import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { rightTriangleSolver } from '../solvers/trigonometry/right-triangle';
import { triangleRulesSolver } from '../solvers/trigonometry/triangle-rules';
import { distributionsSolver } from '../solvers/statistics/distributions';
import { vectorsSolver } from '../solvers/specialist/vectors';
import { StructuredInputForm } from './StructuredInputForm';

describe('StructuredInputForm calculators', () => {
  it('starts vector point fields in 2D with an optional 3D toggle', () => {
    const method = vectorsSolver.methods.find(
      (candidate) => candidate.id === 'collinear',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={vectorsSolver}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Point A — x')).toBeTruthy();
    expect(screen.getByLabelText('Point A — y')).toBeTruthy();
    expect(screen.queryByLabelText('Point A — z')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '3D' }));
    expect(screen.getByLabelText('Point A — z')).toBeTruthy();
  });

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
      expect((screen.getByLabelText('A') as HTMLInputElement).value).toBe(
        '36.87',
      );
      expect((screen.getByLabelText('B') as HTMLInputElement).value).toBe(
        '53.13',
      );
    });
    expect(
      (screen.getByRole('button', { name: 'Solve' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fills all derivable sides and angles for a general triangle', async () => {
    const method = triangleRulesSolver.methods.find(
      (candidate) => candidate.id === 'cosine-rule',
    )!;
    const onSubmit = vi.fn();
    render(
      <StructuredInputForm
        method={method}
        solver={triangleRulesSolver}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('a'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('C'), { target: { value: '40' } });

    await waitFor(() => {
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe(
        '5.79',
      );
      expect((screen.getByLabelText('A') as HTMLInputElement).value).not.toBe(
        '',
      );
      expect((screen.getByLabelText('B') as HTMLInputElement).value).not.toBe(
        '',
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining('A='));
  });

  it('fills a default confidence level while the interval is being prepared', async () => {
    const method = distributionsSolver.methods.find(
      (candidate) => candidate.id === 'confidence',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={distributionsSolver}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Sample mean'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Sample SD'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Sample size (n)'), {
      target: { value: '100' },
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText('Confidence %') as HTMLInputElement).value,
      ).toBe('95');
    });
  });
});
