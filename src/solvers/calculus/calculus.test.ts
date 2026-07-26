import { differentiationSolver } from './differentiate';
import { integrationSolver } from './integrate';

const ans = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  return r.ok ? r.solution.answerLatex : undefined;
};

describe('differentiationSolver', () => {
  it('applies the power rule', () => {
    expect(ans(differentiationSolver, 'x^3 - 4x^2 + 2x - 7', 'power')).toBe(
      "f'(x) = 3x^{2} - 8x + 2",
    );
  });
  it('agrees with first principles', () => {
    const a = ans(differentiationSolver, 'x^3 - 4x^2 + 2x - 7', 'power');
    const b = ans(differentiationSolver, 'x^3 - 4x^2 + 2x - 7', 'first-principles');
    expect(a).toBe(b);
  });
  it('differentiates a quadratic from first principles', () => {
    expect(ans(differentiationSolver, 'x^2', 'first-principles')).toBe("f'(x) = 2x");
  });
  it('sends a constant to zero', () => {
    expect(ans(differentiationSolver, '5', 'power')).toBe("f'(x) = 0");
  });
  it('strips a d/dx wrapper', () => {
    expect(ans(differentiationSolver, 'd/dx(2x^2)', 'power')).toBe("f'(x) = 4x");
  });
});

describe('integrationSolver', () => {
  it('applies the reverse power rule with + C', () => {
    expect(ans(integrationSolver, '3x^2 + 2x - 5', 'reverse-power')).toBe('x^{3} + x^{2} - 5x + C');
  });
  it('produces fractional coefficients', () => {
    expect(ans(integrationSolver, 'x', 'reverse-power')).toBe('\\frac{1}{2}x^{2} + C');
  });

  it('evaluates a definite integral written with "from … to"', () => {
    // ∫₀² 3x² dx = [x³]₀² = 8
    expect(ans(integrationSolver, '∫ 3x^2 dx from 0 to 2', 'reverse-power')).toBe('8');
  });

  it('evaluates a definite integral written with limits', () => {
    // ∫₁³ 2x dx = [x²]₁³ = 9 − 1 = 8
    expect(ans(integrationSolver, '∫_1^3 2x dx', 'reverse-power')).toBe('8');
  });

  it('gives a signed area when the curve dips below the axis', () => {
    // ∫₋₁¹ x dx = 0
    expect(ans(integrationSolver, 'integrate x from -1 to 1', 'reverse-power')).toBe('0');
  });
});

describe('differentiationSolver — product, quotient and chain rules', () => {
  it('uses the product rule and says so', () => {
    const r = differentiationSolver.solve('differentiate x^2 * sin x', 'rules');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.methodName).toBe('Product rule');
      expect(r.solution.answerLatex).toBe("f'(x) = 2x\\sin x + x^{2}\\cos x");
    }
  });

  it('uses the quotient rule', () => {
    const r = differentiationSolver.solve('differentiate x/(x+1)', 'rules');
    expect(r.ok && r.solution.methodName).toBe('Quotient rule');
  });

  it('uses the chain rule and folds coefficients', () => {
    const r = differentiationSolver.solve('differentiate (2x+1)^5', 'rules');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.methodName).toBe('Chain rule');
      expect(r.solution.answerLatex).toBe("f'(x) = 10\\left(2x + 1\\right)^{4}");
    }
  });

  it('falls back to the full engine automatically for non-polynomials', () => {
    // The student left the method on "power rule", but sin x isn't a polynomial.
    const r = differentiationSolver.solve('d/dx sin(3x)', 'power');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toContain('\\cos');
  });

  it('still handles plain polynomials with the power rule', () => {
    expect(ans(differentiationSolver, 'd/dx x^3 - 4x^2', 'power')).toBe("f'(x) = 3x^{2} - 8x");
  });
});
