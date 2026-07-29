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

  it('finds a repeated root and roots outside the old search window', () => {
    const repeated = generalSolver.solve('(x - 2.13)^2 = 0', 'numerical');
    expect(repeated.ok).toBe(true);
    if (repeated.ok) expect(repeated.solution.answerLatex).toContain('2.13');
    const wide = generalSolver.solve('x - 500 = 0', 'numerical');
    expect(wide.ok).toBe(true);
    if (wide.ok) expect(wide.solution.answerLatex).toContain('500');
  });

  it('evaluates a numeric advanced expression', () => {
    const result = generalSolver.solve('2sin(pi/2) + abs(-3)', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.solution.answerLatex).toBe('5');
  });
});
