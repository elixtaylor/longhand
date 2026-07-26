import { linearSolver } from './linear';
import { simultaneousSolver } from './simultaneous';

function answerOf(solver: typeof linearSolver, input: string, method: string): string | undefined {
  const res = solver.solve(input, method);
  return res.ok ? res.solution.answerLatex : undefined;
}

describe('linearSolver', () => {
  it('solves 3x + 4 = 2x - 5', () => {
    expect(answerOf(linearSolver, '3x + 4 = 2x - 5', 'balance')).toBe('x = -9');
  });
  it('solves 2x + 3 = 7', () => {
    expect(answerOf(linearSolver, '2x + 3 = 7', 'balance')).toBe('x = 2');
  });
  it('keeps fractional answers exact', () => {
    expect(answerOf(linearSolver, '2x = 3', 'balance')).toBe('x = \\frac{3}{2}');
  });
  it('agrees between balancing and backtracking', () => {
    const a = answerOf(linearSolver, '5x - 7 = 2x + 8', 'balance');
    const b = answerOf(linearSolver, '5x - 7 = 2x + 8', 'backtracking');
    expect(a).toBe(b);
    expect(a).toBe('x = 5');
  });
  it('detects no solution', () => {
    const res = linearSolver.solve('2x + 1 = 2x + 3', 'balance');
    expect(res.ok && res.solution.answerLatex).toBeFalsy();
  });
  it('rejects a quadratic', () => {
    expect(linearSolver.solve('x^2 = 4', 'balance').ok).toBe(false);
  });
});

describe('simultaneousSolver', () => {
  it('solves a system by elimination', () => {
    const res = simultaneousSolver.solve('2x + 3y = 12 ; x - y = 1', 'elimination');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.solution.answerLatex).toBe('x = 3, \\quad y = 2');
  });
  it('agrees between elimination and substitution', () => {
    const a = simultaneousSolver.solve('x + y = 5 ; x - y = 1', 'elimination');
    const b = simultaneousSolver.solve('x + y = 5 ; x - y = 1', 'substitution');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.solution.answerLatex).toBe('x = 3, \\quad y = 2');
      expect(a.solution.answerLatex).toBe(b.solution.answerLatex);
    }
  });
  it('handles fractional solutions', () => {
    // 2x + y = 5 ; x + y = 3  → x = 2, y = 1
    const res = simultaneousSolver.solve('2x + y = 5 ; x + y = 3', 'elimination');
    expect(res.ok && res.solution.answerLatex).toBe('x = 2, \\quad y = 1');
  });
  it('detects no solution for parallel lines', () => {
    const res = simultaneousSolver.solve('x + y = 1 ; x + y = 2', 'elimination');
    expect(res.ok && res.solution.answerLatex).toBeFalsy();
  });
});
