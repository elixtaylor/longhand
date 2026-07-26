import { parseExpr, differentiate, simplify, toLatex, ExprError } from './expr';

/** Differentiate a source string and render the simplified result. */
const d = (src: string): string => toLatex(simplify(differentiate(parseExpr(src))));
const show = (src: string): string => toLatex(parseExpr(src));

describe('parseExpr', () => {
  it('handles implicit multiplication', () => {
    expect(show('2x')).toBe('2x');
    expect(show('3(x+1)')).toBe('3\\left(x + 1\\right)');
  });
  it('respects precedence', () => {
    expect(show('2+3*4')).toBe('2 + 3 \\cdot 4');
    expect(show('(2+3)*4')).toBe('\\left(2 + 3\\right) \\cdot 4');
    expect(show('x*2')).toBe('x \\cdot 2'); // a dot is needed before a bare number
  });
  it('reads functions with and without brackets', () => {
    expect(show('sin(2x)')).toBe('\\sin \\left(2x\\right)');
    expect(show('sinx')).toBe('\\sin x');
  });
  it('rejects unbalanced brackets', () => {
    expect(() => parseExpr('(x+1')).toThrow(ExprError);
  });
});

describe('differentiate — standard results', () => {
  it('handles powers', () => {
    expect(d('x^3')).toBe('3x^{2}');
    expect(d('x')).toBe('1');
    expect(d('5')).toBe('0');
  });
  it('handles sums', () => {
    expect(d('x^2 + 3x')).toBe('2x + 3');
  });
  it('handles trig, exponential and log', () => {
    expect(d('sin x')).toBe('\\cos x');
    expect(d('cos x')).toBe('-\\sin x');
    expect(d('ln x')).toBe('\\dfrac{1}{x}');
  });
});

describe('differentiate — the three rules', () => {
  it('applies the product rule', () => {
    // d/dx(x² sin x) = 2x sin x + x² cos x
    expect(d('x^2 * sin x')).toBe('2x\\sin x + x^{2}\\cos x');
  });

  it('applies the quotient rule', () => {
    // d/dx(x/(x+1)) = ((x+1) − x)/(x+1)²
    const out = d('x/(x+1)');
    expect(out).toContain('\\dfrac');
    expect(out).toContain('^{2}');
  });

  it('applies the chain rule to a bracket power, folding the coefficients', () => {
    // d/dx (2x+1)^5 = 5(2x+1)^4 · 2, which should collect to 10(2x+1)^4
    expect(d('(2x+1)^5')).toBe('10\\left(2x + 1\\right)^{4}');
  });

  it('applies the chain rule inside a trig function', () => {
    // d/dx sin(3x) = 3cos(3x)
    const out = d('sin(3x)');
    expect(out).toContain('\\cos');
    expect(out).toContain('3');
  });

  it('differentiates e to a function', () => {
    // d/dx e^(2x) = 2e^(2x)
    const out = d('e^(2x)');
    expect(out).toContain('e^{2x}');
    expect(out).toContain('2');
  });

  it('refuses x^x rather than guessing', () => {
    expect(() => differentiate(parseExpr('x^x'))).toThrow(ExprError);
  });
});

describe('simplify', () => {
  it('removes identity operations', () => {
    expect(toLatex(simplify(parseExpr('x*1')))).toBe('x');
    expect(toLatex(simplify(parseExpr('x+0')))).toBe('x');
    expect(toLatex(simplify(parseExpr('x*0')))).toBe('0');
    expect(toLatex(simplify(parseExpr('x^1')))).toBe('x');
  });
});
