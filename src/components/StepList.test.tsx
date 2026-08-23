import { render, screen } from '@testing-library/react';
import { StepList, workingSteps } from './StepList';
import { quadraticsSolver } from '../solvers/quadratics';

describe('StepList rendering', () => {
  it('keeps operation annotations out of the equation line', () => {
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
    expect(screen.queryByText('same to both sides')).toBeNull();
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

  it('places the final answer after the complete line-by-line working', () => {
    const view = render(
      <StepList
        solution={{
          headline: 'Evaluate an expression',
          methodName: 'Expand and simplify',
          steps: [
            { note: 'Expand.', latex: '2\left(x + 3\right)' },
            { note: 'Simplify.', latex: '= 2x + 6' },
          ],
          answerLatex: '2x + 6',
        }}
        revealMode="all"
        showNotes={false}
      />,
    );

    const working = view.container.querySelector('.steps');
    const answer = view.container.querySelector('.answer-card-end');
    expect(working).toBeTruthy();
    expect(answer).toBeTruthy();
    expect(
      working!.compareDocumentPosition(answer!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
