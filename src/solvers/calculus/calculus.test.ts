import { differentiationSolver } from './differentiate';
import { integrationSolver } from './integrate';

const ans = (
  s: { solve: (i: string, m: string) => any },
  input: string,
  method: string,
) => {
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
    const b = ans(
      differentiationSolver,
      'x^3 - 4x^2 + 2x - 7',
      'first-principles',
    );
    expect(a).toBe(b);
  });
  it('differentiates a quadratic from first principles', () => {
    expect(ans(differentiationSolver, 'x^2', 'first-principles')).toBe(
      "f'(x) = 2x",
    );
  });
  it('sends a constant to zero', () => {
    expect(ans(differentiationSolver, '5', 'power')).toBe("f'(x) = 0");
  });
  it('strips a d/dx wrapper', () => {
    expect(ans(differentiationSolver, 'd/dx(2x^2)', 'power')).toBe(
      "f'(x) = 4x",
    );
  });
  it('rejects non-finite number words instead of treating them as variables', () => {
    expect(differentiationSolver.solve('NaN', 'rules').ok).toBe(false);
    expect(differentiationSolver.solve('Infinity', 'rules').ok).toBe(false);
  });
});

describe('integrationSolver', () => {
  it('applies the reverse power rule with + C', () => {
    expect(ans(integrationSolver, '3x^2 + 2x - 5', 'reverse-power')).toBe(
      'x^{3} + x^{2} - 5x + C',
    );
  });
  it('produces fractional coefficients', () => {
    expect(ans(integrationSolver, 'x', 'reverse-power')).toBe(
      '\\frac{1}{2}x^{2} + C',
    );
  });

  it('evaluates a definite integral written with "from … to"', () => {
    // ∫₀² 3x² dx = [x³]₀² = 8
    expect(
      ans(integrationSolver, '∫ 3x^2 dx from 0 to 2', 'reverse-power'),
    ).toBe('8');
  });

  it('evaluates a definite integral written with limits', () => {
    // ∫₁³ 2x dx = [x²]₁³ = 9 − 1 = 8
    expect(ans(integrationSolver, '∫_1^3 2x dx', 'reverse-power')).toBe('8');
  });

  it('keeps a non-integer definite integral exact', () => {
    expect(
      ans(integrationSolver, 'integrate x^2 from 0 to 1', 'definite'),
    ).toBe('\\frac{1}{3}');
  });

  it('rejects definite integrals whose numeric evaluation overflows', () => {
    const huge = `1${'0'.repeat(100)}`;
    expect(
      integrationSolver.solve(`integrate x^4 from 0 to ${huge}`, 'definite').ok,
    ).toBe(false);
    expect(
      integrationSolver.solve(
        `integrate (2x+1)^4 from 0 to ${huge}`,
        'substitution',
      ).ok,
    ).toBe(false);
  });

  it('gives a signed area when the curve dips below the axis', () => {
    // ∫₋₁¹ x dx = 0
    expect(
      ans(integrationSolver, 'integrate x from -1 to 1', 'reverse-power'),
    ).toBe('0');
  });

  it('uses substitution for an affine power', () => {
    const result = integrationSolver.solve(
      'integrate (2x + 1)^3',
      'substitution',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.methodName).toBe('Substitution');
      expect(result.solution.answerLatex).toContain('^{4}');
    }
  });

  it('uses integration by parts for x exp(x)', () => {
    const result = integrationSolver.solve('∫ x exp(x) dx', 'by-parts');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.methodName).toBe('Integration by parts');
      expect(result.solution.answerLatex).toBe('e^x\\left(x - 1\\right) + C');
      expect(
        result.solution.steps.some((step) => /identity/i.test(step.note ?? '')),
      ).toBe(true);
    }
  });

  it('handles the repeated-parts pattern x squared e to the x', () => {
    const result = integrationSolver.solve('integrate x^2 e^x', 'by-parts');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.answerLatex).toContain('x^{2} - 2x + 2');
  });

  it('uses integration by parts for x sin x and x cos x', () => {
    expect(ans(integrationSolver, '∫ x sin x dx', 'by-parts')).toBe(
      '-x\\cos x + \\sin x + C',
    );
    expect(ans(integrationSolver, '∫ x cos x dx', 'by-parts')).toBe(
      'x\\sin x + \\cos x + C',
    );
  });

  it('integrates basic trigonometric and reciprocal functions', () => {
    expect(ans(integrationSolver, '∫ sin x dx', 'basic-functions')).toBe(
      '-\\cos x + C',
    );
    expect(ans(integrationSolver, 'integrate 3 cos x', 'basic-functions')).toBe(
      '3\\sin x + C',
    );
    expect(ans(integrationSolver, 'integrate 1/x', 'basic-functions')).toBe(
      '\\ln|x| + C',
    );
    const sinSquared = integrationSolver.solve(
      'integrate sin^2 x',
      'basic-functions',
    );
    expect(sinSquared.ok, sinSquared.ok ? '' : sinSquared.error).toBe(true);
    if (sinSquared.ok)
      expect(sinSquared.solution.answerLatex).toContain('\\sin 2x');
    const atan = integrationSolver.solve(
      'integrate 1/(1+x^2)',
      'basic-functions',
    );
    expect(atan.ok, atan.ok ? '' : atan.error).toBe(true);
    if (atan.ok) expect(atan.solution.answerLatex).toBe('\\arctan x + C');
  });

  it('handles exponential notation and negative multipliers cleanly', () => {
    expect(ans(integrationSolver, 'integrate e^x', 'basic-functions')).toBe(
      'e^x + C',
    );
    expect(
      ans(integrationSolver, 'integrate -2 sin x', 'basic-functions'),
    ).toBe('2\\cos x + C');
    expect(
      ans(integrationSolver, 'integrate -2 tan x', 'basic-functions'),
    ).toBe('2\\ln|\\cos x| + C');
    expect(ans(integrationSolver, 'integrate -cos x', 'basic-functions')).toBe(
      '-\\sin x + C',
    );
  });

  it('uses the reverse chain rule for affine trig and exponential inputs', () => {
    expect(ans(integrationSolver, 'integrate sin(2x)', 'basic-functions')).toBe(
      '-\\frac{1}{2}\\cos\\left(2x\\right) + C',
    );
    expect(
      ans(integrationSolver, 'integrate 3cos(2x+1)', 'basic-functions'),
    ).toBe('\\frac{3}{2}\\sin\\left(2x + 1\\right) + C');
    expect(
      ans(integrationSolver, 'integrate exp(3x-2)', 'basic-functions'),
    ).toBe('\\frac{1}{3}e^{3x - 2} + C');
    expect(
      ans(integrationSolver, 'integrate sec^2(4x)', 'basic-functions'),
    ).toBe('\\frac{1}{4}\\tan\\left(4x\\right) + C');
  });

  it('finds the area between two curves, including crossings', () => {
    const result = integrationSolver.solve(
      'area between y=x^2 and y=2x from 0 to 2',
      'area-between',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.solution.answerLatex).toContain('1.333333333');
  });

  it('rejects an area whose evaluated pieces overflow', () => {
    const huge = `1${'0'.repeat(100)}`;
    expect(
      integrationSolver.solve(
        `area between y=x^4 and y=0 from 0 to ${huge}`,
        'area-between',
      ).ok,
    ).toBe(false);
  });

  it('finds a washer volume about the x-axis', () => {
    const result = integrationSolver.solve(
      'volume of revolution y=x from 0 to 2 about x-axis',
      'volume-revolution',
    );
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).toBe(
        'V = \\dfrac{8\\pi}{3}\\text{ cubic units}',
      );
      expect(JSON.stringify(result.solution.steps)).toContain('8.37758041');
    }
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
      expect(r.solution.answerLatex).toBe(
        "f'(x) = 10\\left(2x + 1\\right)^{4}",
      );
    }
  });

  it('falls back to the full engine automatically for non-polynomials', () => {
    // The student left the method on "power rule", but sin x isn't a polynomial.
    const r = differentiationSolver.solve('d/dx sin(3x)', 'power');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toContain('\\cos');
  });

  it('still handles plain polynomials with the power rule', () => {
    expect(ans(differentiationSolver, 'd/dx x^3 - 4x^2', 'power')).toBe(
      "f'(x) = 3x^{2} - 8x",
    );
  });
});
