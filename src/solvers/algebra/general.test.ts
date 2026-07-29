import { describe, expect, it } from 'vitest';
import { generalSolver } from './general';

describe('general equation fallback', () => {
  it('solves a transcendental equation numerically', () => {
    const result = generalSolver.solve('sin(x) = x/2', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).toContain('x \\approx');
      const last = result.solution.steps[result.solution.steps.length - 1];
      expect(last?.latex).toContain('0');
    }
  });

  it('solves a nested radical equation', () => {
    const result = generalSolver.solve('sqrt(x + 1) = 3', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.answerLatex).toContain('x \\approx 8');
  });

  it('evaluates a numeric advanced expression', () => {
    const result = generalSolver.solve('2sin(pi/2) + abs(-3)', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.solution.answerLatex).toBe('5');
  });
});
