import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { rightTriangleSolver } from '../solvers/trigonometry/right-triangle';
import { triangleRulesSolver } from '../solvers/trigonometry/triangle-rules';
import { distributionsSolver } from '../solvers/statistics/distributions';
import { vectorsSolver } from '../solvers/specialist/vectors';
import { circleGeometrySolver } from '../solvers/geometry/circles';
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

  it('recalculates auto-filled values when a given value changes', async () => {
    const method = rightTriangleSolver.methods.find(
      (candidate) => candidate.id === 'pythagoras',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={rightTriangleSolver}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('a'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '4' } });
    await waitFor(() =>
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('5'),
    );

    fireEvent.change(screen.getByLabelText('a'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '12' } });

    await waitFor(() => {
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('13');
      expect(screen.getByLabelText('c').className).toContain(
        'num-input--derived',
      );
    });
  });

  it('clears calculator values without submitting working', async () => {
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
    await waitFor(() =>
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('5'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect((screen.getByLabelText('a') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('');
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
    expect(onSubmit).toHaveBeenCalledWith('a=7, b=9, C=40');
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

  it('does not preview required blank fields as zero values', () => {
    const method = distributionsSolver.methods.find(
      (candidate) => candidate.id === 'binomial',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={distributionsSolver}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText('Answer')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Solve' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('fills the missing circle diameter from a radius', async () => {
    const method = circleGeometrySolver.methods.find(
      (candidate) => candidate.id === 'measurements',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={circleGeometrySolver}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Radius r'), {
      target: { value: '5' },
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText('Diameter d') as HTMLInputElement).value,
      ).toBe('10');
    });
    expect(screen.getByText('Answer')).toBeTruthy();
  });

  it('places a supplied method picker after the calculator inputs', () => {
    const method = circleGeometrySolver.methods.find(
      (candidate) => candidate.id === 'measurements',
    )!;
    render(
      <StructuredInputForm
        method={method}
        solver={circleGeometrySolver}
        methodPicker={
          <label>
            Method
            <select aria-label="Choose a method">
              <option>Circle measurements</option>
            </select>
          </label>
        }
        onSubmit={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Radius r');
    const select = screen.getByRole('combobox', { name: 'Choose a method' });
    expect(
      input.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
