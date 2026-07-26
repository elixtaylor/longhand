import { evaluate, foldArithmetic } from './arithmetic';
import { Rational } from '../math/rational';
import { parseParams } from '../math/num';
import { parsePoly, ParseError } from '../math/parse';
import { runWorked } from '../engine/run';

/**
 * Topics mix inside a single equation, not only across parts: `ln x = 5^2` is
 * a logarithm question with a power sitting in it. These cover the arithmetic
 * pre-pass that makes that work, and the parser strictness that makes it
 * safe — every bug below shipped as a confident wrong answer first.
 */

describe('evaluating a numeric expression', () => {
  it('applies the usual precedence', () => {
    expect(evaluate('5^2')).toBe(25);
    expect(evaluate('4*8')).toBe(32);
    expect(evaluate('2*7-5')).toBe(9);
    expect(evaluate('3^2 + 4^2')).toBe(25);
    expect(evaluate('2+3*4')).toBe(14); // not 20
    expect(evaluate('(2+3)*4')).toBe(20);
    expect(evaluate('-3 + 10')).toBe(7);
  });

  it('is right-associative on powers, as maths is', () => {
    expect(evaluate('2^3^2')).toBe(512); // 2^9, not (2^3)^2 = 64
  });

  it('refuses anything it cannot fully read', () => {
    for (const bad of ['4^2)', '2+', 'x+1', '', '1/0', '2**3']) {
      expect(evaluate(bad), `"${bad}" should not evaluate`).toBeNull();
    }
  });
});

describe('folding arithmetic inside a question', () => {
  it('works out values without touching the rest', () => {
    expect(foldArithmetic('ln x = 5^2')).toBe('ln x = 25');
    expect(foldArithmetic('a = 3+4, b = 12, C = 40')).toBe('a = 7, b = 12, C = 40');
    expect(foldArithmetic('2^x = 4*8')).toBe('2^x = 32');
  });

  it('leaves the brackets a solver needs', () => {
    // Only the inside is worked out; log2(...) has to survive intact.
    expect(foldArithmetic('log2(4^2)')).toBe('log2(16)');
  });

  it('leaves a question that has nothing to fold', () => {
    for (const q of ['3x + 4 = 2x - 5', 'a = 7, b = 9, C = 40', 'sin x = 0.5']) {
      expect(foldArithmetic(q)).toBe(q);
    }
  });
});

describe('parsers refuse a value they can only partly read', () => {
  it('will not read a number out of an expression', () => {
    // Rational.parse('3^2') returned 3, which turned x² = 3² + 4² into x² = 7
    // and produced a confident √7 instead of 5.
    for (const bad of ['3^2', '2x', '1/2/3', '1..2', '5e3', '']) {
      expect(() => Rational.parse(bad), `"${bad}"`).toThrow();
    }
  });

  it('still reads the forms that are numbers', () => {
    expect(Rational.parse('12').toNumber()).toBe(12);
    expect(Rational.parse('-3/4').toNumber()).toBe(-0.75);
    expect(Rational.parse('0.25').toNumber()).toBe(0.25);
    expect(Rational.parse('+7').toNumber()).toBe(7);
  });

  it('will not take the first number of a parameter expression', () => {
    // "a = 3" out of "a = 3+4" silently solved a different triangle.
    expect(parseParams('a = 3+4, b = 12')).toEqual({ b: 12 });
    expect(parseParams('a = 7, b = 12, C = 40')).toEqual({ a: 7, b: 12, C: 40 });
    expect(parseParams('r=0.5, n=10')).toEqual({ r: 0.5, n: 10 });
  });

  it('will not silently join digits when dropping an implicit-product star', () => {
    // "2*7" became "27" because the star was deleted unconditionally.
    expect(() => parsePoly('2*7')).toThrow(ParseError);
    expect(parsePoly('3*x').degree()).toBe(1); // implicit product is still fine
  });
});

describe('a question that mixes topics in one equation', () => {
  const answer = (raw: string) => {
    const p = runWorked(raw).parts[0];
    if (!p?.result.ok) throw new Error(`"${raw}" did not solve`);
    return p.result.solution.answerLatex;
  };

  it('works out a power on the far side of a logarithm', () => {
    // ln x = 25, so x = e^25 = 72004899337.4578
    expect(answer('ln x = 5^2')).toBe(answer('ln x = 25'));
  });

  it('works out a product before equating indices', () => {
    // 4 × 8 = 32 = 2^5. Previously read as linear and returned x = 24.
    expect(answer('2^x = 4*8')).toBe('x = 5');
  });

  it('sums squares before solving', () => {
    // 3² + 4² = 25, so x = ±5. Previously returned ±√7.
    expect(answer('x^2 = 3^2 + 4^2')).toContain('5');
  });

  it('adds a side length before using the cosine rule', () => {
    // a = 7, b = 12, C = 40° → c² = 49 + 144 − 2(7)(12)cos40° = 64.29, c = 8.02.
    // Previously solved with a = 3 and returned 9.89.
    expect(answer('a = 3+4, b = 12, C = 40')).toBe('c = 8.02');
  });

  it('leaves a purely numeric question as the question', () => {
    // 234 × 56 is the problem, not something to evaluate away.
    expect(answer('234 × 56')).toBe('13104');
    expect(answer('3/4 + 1/6')).toBe('\\frac{11}{12}');
  });
});
