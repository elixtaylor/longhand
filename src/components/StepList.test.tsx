import { render, screen } from '@testing-library/react';
import { StepList, stepOperation, workingSteps } from './StepList';
import { quadraticsSolver } from '../solvers/quadratics';

describe('StepList operation colours', () => {
  it('colours a subtract-from-both-sides line without showing annotation text', () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    render(
      <StepList
        solution={{
          headline: 'Solve an equation',
          methodName: 'Balancing',
          steps: [
            {
              note: 'Subtract 4 from both sides.',
              latex: '3x + 4 - 4 = 10 - 4',
              annotation: 'same to both sides',
            },
          ],
        }}
        revealMode="all"
        showNotes={false}
      />,
    );
    expect(screen.getByRole('listitem').className).toContain('step-operation');
    expect(screen.getByRole('listitem').className).toContain(
      'step-operation-subtract',
    );
    expect(screen.getByRole('listitem').getAttribute('data-operation')).toBe(
      'subtract',
    );
    expect(screen.queryByText('same to both sides')).toBeNull();
  });

  it('classifies the operation actually applied when both sides change', () => {
    const cases = [
      ['Add 4 to both sides.', 'add'],
      ['The term is multiplied, so divide both sides by 3.', 'divide'],
      ['Multiply both sides by 2.', 'multiply'],
      ['Square both sides.', 'power'],
    ] as const;
    for (const [note, operation] of cases) {
      expect(stepOperation({ note })).toBe(operation);
    }
  });

  it('does not repeat a multi-answer result after the final working line', () => {
    const solution = {
      headline: 'Solve x² = 4',
      methodName: 'Completing the square',
      steps: [
        { latex: 'x = \\pm 2' },
        { latex: 'x = 2 \\quad\\text{or}\\quad x = -2' },
      ],
      answerLatex: 'x = 2 \\quad\\text{or}\\quad x = -2',
    };
    expect(workingSteps(solution).map((step) => step.latex)).toEqual([
      'x = \\pm 2',
    ]);
  });

  it('keeps both distinct roots while collapsing an unchanged duplicate line', () => {
    const solution = {
      headline: 'Solve |x| = 5',
      methodName: 'Case split',
      steps: [{ latex: 'x = 5' }, { latex: 'x = 5' }, { latex: 'x = -5' }],
      answerLatex: 'x = 5 \\quad\\text{or}\\quad x = -5',
    };
    expect(workingSteps(solution).map((step) => step.latex)).toEqual([
      'x = 5',
      'x = -5',
    ]);
  });

  it('removes the repeated explicit answer from quadratic working', () => {
    const result = quadraticsSolver.solve('x^2 = 4', 'complete-square');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = workingSteps(result.solution).map((step) => step.latex);
    expect(lines).toContain('x + 0 = \\pm\\sqrt{4}');
    expect(lines).not.toContain(result.solution.answerLatex);
  });
});
