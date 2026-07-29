import { binomialSolver } from './binomial';

describe('binomial expansion', () => {
  it('expands a polynomial binomial exactly', () => {
    const result = binomialSolver.solve('expand (x + 2)^3', 'theorem');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.answerLatex).toBe('x^{3} + 6x^{2} + 12x + 8');
  });

  it('detects expansion requests but not equations', () => {
    expect(binomialSolver.detect('expand (x - 1)^4')).toBeGreaterThan(0.9);
    expect(binomialSolver.detect('(x - 1)^4 = 0')).toBe(0);
  });
});
