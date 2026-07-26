import { calculusApplicationsSolver as app } from './applications';
import { detectSolver } from '../../lib/engine/registry';
import { runWorked } from '../../lib/engine/run';

const ans = (input: string, method = app.defaultMethodId) => {
  const r = app.solve(input, method);
  if (!r.ok) throw new Error(r.error);
  return r.solution.answerLatex;
};

describe('gradient at a point', () => {
  it('differentiates then substitutes', () => {
    // f(x) = x², f'(x) = 2x, f'(3) = 6.
    expect(ans('gradient of y = x^2 at x = 3', 'gradient')).toBe('\\text{gradient} = 6');
  });

  it('handles a negative point', () => {
    // f'(x) = 3x² − 4, f'(−2) = 12 − 4 = 8.
    expect(ans('gradient of y = x^3 - 4x at x = -2', 'gradient')).toBe('\\text{gradient} = 8');
  });

  it('asks where, rather than guessing', () => {
    const r = app.solve('gradient of y = x^2', 'gradient');
    expect(r.ok).toBe(false);
  });
});

describe('stationary points', () => {
  it('finds both and says which is which', () => {
    // f'(x) = 3x² − 3 = 0 → x = ±1. f(−1) = 2 with f''(−1) = −6 < 0, a
    // maximum; f(1) = −2 with f''(1) = 6 > 0, a minimum.
    const a = ans('stationary points of x^3 - 3x')!;
    expect(a).toContain('\\left(-1,\\; 2\\right)\\text{ maximum}');
    expect(a).toContain('\\left(1,\\; -2\\right)\\text{ minimum}');
  });

  it('finds the vertex of a parabola', () => {
    // x² − 6x + 5 has its vertex at x = 3, y = 9 − 18 + 5 = −4.
    expect(ans('turning point of y = x^2 - 6x + 5')).toBe(
      '\\left(3,\\; -4\\right)\\text{ minimum}',
    );
  });

  it('reports a maximum for a downward parabola', () => {
    // −x² + 4x − 1: f'(x) = −2x + 4 = 0 → x = 2, y = −4 + 8 − 1 = 3.
    expect(ans('maximum point of y = -x^2 + 4x - 1')).toBe(
      '\\left(2,\\; 3\\right)\\text{ maximum}',
    );
  });

  it('says so when the gradient is never zero', () => {
    // f'(x) = 3x² + 1 > 0 for every x.
    expect(ans('stationary points of x^3 + x')).toBe('\\text{no stationary points}');
  });

  it('shows the derivative, the equation and the substitution', () => {
    const r = app.solve('stationary points of x^3 - 3x', 'stationary');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const latex = r.solution.steps.map((s) => s.latex ?? '').join(' | ');
    expect(latex).toContain("f'(x) = 3x^{2} - 3"); // differentiated
    expect(latex).toContain('= 0'); // set to zero
    expect(latex).toContain("f''"); // nature tested
  });
});

describe('tangents and normals', () => {
  it('builds the tangent from the gradient and the point', () => {
    // At x = 3 on y = x²: m = 6, point (3, 9), so y − 9 = 6(x − 3) → y = 6x − 9.
    expect(ans('tangent to y = x^2 at x = 3', 'tangent')).toBe('y = 6x - 9');
  });

  it('uses the negative reciprocal for the normal', () => {
    // At x = 2 on y = x²: m = 4, so the normal has gradient −1/4 through
    // (2, 4): y = −0.25x + 4.5.
    expect(ans('normal to y = x^2 at x = 2', 'normal')).toBe('y = -0.25x + 4.5');
  });
});

describe('claiming the right questions', () => {
  it('takes the questions that need two topics', () => {
    for (const q of [
      'stationary points of x^3 - 3x',
      'find the turning point of y = x^2 - 6x + 5',
      'gradient of y = x^2 at x = 3',
      'tangent to y = x^2 at x = 3',
    ]) {
      expect(detectSolver(q)?.solver.id, q).toBe('calculus-applications');
    }
  });

  it('leaves plain differentiation and sketching alone', () => {
    expect(detectSolver('d/dx x^3 - 4x^2 + 2x - 7')?.solver.id).toBe('differentiate');
    expect(detectSolver('sketch y = x^2 - 6x + 5')?.solver.id).toBe('functions');
  });

  it('works "differentiate … and find the stationary points" as two parts', () => {
    const w = runWorked('differentiate x^3 - 3x and find the stationary points');
    expect(w.parts.map((p) => p.solver.id)).toEqual(['differentiate', 'calculus-applications']);
    expect(w.parts.every((p) => p.result.ok)).toBe(true);
  });
});
