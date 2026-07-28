import { polynomialsSolver } from './polynomials';
import { logarithmsSolver } from './logarithms';

const sol = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  expect(r.ok, `failed to solve "${input}": ${r.ok ? '' : r.error}`).toBe(true);
  return r.ok ? r.solution : null!;
};

describe('polynomialsSolver', () => {
  it('fully factorises a cubic', () => {
    // x³ − 2x² − 5x + 6 = (x−1)(x+2)(x−3)
    const s = sol(polynomialsSolver, 'x^3 - 2x^2 - 5x + 6', 'factor-theorem');
    const a = s.answerLatex!;
    expect(a).toContain('(x - 1)');
    expect(a).toContain('(x + 2)');
    expect(a).toContain('(x - 3)');
  });

  it('divides exactly when the divisor is a factor', () => {
    const s = sol(polynomialsSolver, 'x^3 - 2x^2 - 5x + 6 ÷ (x - 1)', 'division');
    // quotient is x² − x − 6
    expect(s.answerLatex).toBe('x^{2} - x - 6');
  });

  it('finds a remainder with the remainder theorem', () => {
    // P(x) = x³ + 2x − 3 at x = 2 → 8 + 4 − 3 = 9
    const s = sol(polynomialsSolver, 'remainder x^3 + 2x - 3 ÷ (x - 2)', 'remainder');
    expect(s.answerLatex).toBe('P(2) = 9');
  });

  it('reports honestly when a cubic will not factorise neatly', () => {
    const r = polynomialsSolver.solve('x^3 + x + 1', 'factor-theorem');
    expect(r.ok).toBe(false);
  });
});

describe('logarithmsSolver', () => {
  it('solves an exact exponential by equating indices', () => {
    const s = sol(logarithmsSolver, '2^x = 32', 'same-base');
    expect(s.answerLatex).toBe('x = 5');
    expect(s.methodName).toBe('Equating indices');
  });

  it('solves the same equation by taking logs', () => {
    const s = sol(logarithmsSolver, '2^x = 32', 'logs');
    expect(s.answerLatex).toBe('x = 5');
    expect(s.methodName).toBe('Taking logarithms');
  });

  it('falls back to logs when the answer is not a whole power', () => {
    // log 20 / log 3 = 2.726833
    const s = sol(logarithmsSolver, '3^x = 20', 'same-base');
    expect(s.answerLatex).toBe('x = 2.726833');
  });

  it('handles a coefficient in front', () => {
    // 5 × 2^x = 40 → 2^x = 8 → x = 3
    expect(sol(logarithmsSolver, '5*2^x = 40', 'same-base').answerLatex).toBe('x = 3');
  });

  it('handles a multiple of x in the index', () => {
    // 2^(3x) = 64 → 3x = 6 → x = 2
    expect(sol(logarithmsSolver, '2^(3x) = 64', 'same-base').answerLatex).toBe('x = 2');
  });

  it('evaluates an exact logarithm', () => {
    expect(sol(logarithmsSolver, 'log2(32)', 'same-base').answerLatex).toContain('= 5');
  });

  it('solves a logarithmic equation', () => {
    // log x = 3 → x = 1000
    expect(sol(logarithmsSolver, 'log(x) = 3', 'same-base').answerLatex).toBe('x = 1000');
  });

  it('solves a natural-log equation', () => {
    // ln x = 2 → e² = 7.389056
    expect(sol(logarithmsSolver, 'ln x = 2', 'same-base').answerLatex).toBe('x = 7.389056');
  });

  it('rejects an impossible exponential', () => {
    expect(logarithmsSolver.solve('2^x = -8', 'same-base').ok).toBe(false);
  });

  it('solves a two-term exponential equation that reduces to a quadratic', () => {
    // Let u = 2^x. 4^x = u², 2^(x+1) = 2u → u² + 2u - 15 = 0 → u = 3 or u = -5.
    // u = -5 is rejected (2^x is always positive), so 2^x = 3 → x = log2(3).
    const s = sol(logarithmsSolver, '4^x+2^(x+1)-15=0', 'same-base');
    expect(s.methodName).toBe('Reducible to a quadratic');
    expect(s.answerLatex).toBe('x = 1.584963');
    expect(s.steps.some((step: { latex?: string }) => step.latex?.includes('u = 3'))).toBe(true);
    expect(s.answerLatex).not.toContain('-5');
  });

  it('gives two exact answers when both roots of u are whole powers', () => {
    // Let u = 3^x: u² - 4u + 3 = 0 → u = 1 or u = 3 → x = 0 or x = 1.
    const s = sol(logarithmsSolver, '9^x-4*3^x+3=0', 'same-base');
    expect(s.answerLatex).toBe('x = 1 \\quad\\text{or}\\quad x = 0');
  });

  it('reports no real solution when every root of u is non-positive', () => {
    // u² + 6u + 8 = 0 → u = -2 or u = -4, both impossible for 2^x.
    const r = logarithmsSolver.solve('4^x+6*2^x+8=0', 'same-base');
    expect(r.ok).toBe(false);
  });

  it('leaves an ordinary quadratic alone (no exponential terms)', () => {
    expect(logarithmsSolver.solve('x^2+2x-15=0', 'same-base').ok).toBe(false);
  });

  it('evaluates a change-of-base expression written as a fraction of logs', () => {
    // log16/log8 = log_8(16) by the change-of-base rule = 1.333333.
    const s = sol(logarithmsSolver, 'log16/log8', 'same-base');
    expect(s.answerLatex).toBe('\\log_{8}(16) = 1.333333');
  });

  it('also accepts the natural-log form of the same fraction', () => {
    const s = sol(logarithmsSolver, 'ln16/ln8', 'same-base');
    expect(s.answerLatex).toBe('\\log_{8}(16) = 1.333333');
  });

  it('does not misread a fraction of logs with genuinely different bases', () => {
    expect(logarithmsSolver.solve('log_2(16)/log_3(8)', 'same-base').ok).toBe(false);
  });
});
