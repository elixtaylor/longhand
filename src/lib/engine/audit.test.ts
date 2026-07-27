import { runWorked } from './run';
import { getSolver } from './registry';

/**
 * Every case here is a bug that shipped a confident wrong answer, found by
 * auditing each topic against independently derived results.
 *
 * They are grouped by the mistake rather than by topic, because the same
 * mistake kept recurring in different places: a parser reading the first
 * thing it recognised and discarding the rest, or a formula applied without
 * checking that its preconditions held.
 */

const answer = (raw: string): string => {
  const p = runWorked(raw).parts[0];
  if (!p) return 'NO DETECTION';
  if (!p.result.ok) return `refused: ${p.result.error}`;
  return p.result.solution.answerLatex ?? '(reasoned)';
};
const byMethod = (id: string, method: string, raw: string): string => {
  const r = getSolver(id)!.solve(raw, method);
  return r.ok ? (r.solution.answerLatex ?? '(reasoned)') : `refused: ${r.error}`;
};
const refused = (raw: string) => expect(answer(raw)).toMatch(/^(refused|NO DETECTION)/);

describe('arithmetic is not folded across a term boundary', () => {
  /**
   * The pre-pass that works out `5^2` also matched the `3 - 1` inside
   * `x^3 - 1 = 0` — where the 3 is an exponent and the −1 a separate term —
   * rewriting a cubic as `x^2 = 0` and answering x = 0 for a root of 1.
   */
  it('leaves an exponent alone', () => {
    for (const q of ['x^3 - 1 = 0', 'x^3 - 2 = 6', '2x^3 - 1 = 0', 'x^4 - 2 = 0', 'x^10 - 8 = 0']) {
      // Cubics are not supported; the point is that it says so rather than
      // inventing an answer to a question it rewrote.
      refused(q);
    }
  });

  it('still folds a value that stands on its own', () => {
    expect(answer('ln x = 5^2')).toBe(answer('ln x = 25'));
    expect(answer('2^x = 4*8')).toBe('x = 5');
    expect(answer('a = 3+4, b = 12, C = 40')).toBe('c = 8.02');
  });
});

describe('a value is read whole, or not at all', () => {
  /**
   * "C = 40." lost the angle to a sentence-ending full stop. That left two
   * knowns, which is exactly the right-triangle solver's signature — so it
   * claimed the question and applied Pythagoras to a triangle with no right
   * angle, returning 11.4 where the answer is 5.79.
   */
  it('is not stopped by punctuation after the number', () => {
    for (const q of [
      'In triangle ABC, a = 7, b = 9 and C = 40. Find c.',
      'a=7, b=9, C=40. Find c.',
      'a=7, b=9, C=40 - find c',
      'a=7, b=9, C=40',
    ]) {
      expect(answer(q), q).toBe('c = 5.79');
    }
  });
});

describe('a formula is not applied unless its preconditions hold', () => {
  it('refuses an angle outside 0° to 180°', () => {
    refused('a=7, b=9, C=200');
    refused('a=7, b=9, C=-40 area'); // returned an area of −20.25
    refused('a=7, b=9, C=180');
  });

  it('refuses a negative side', () => {
    refused('a=-7, b=9, C=40');
  });

  it('refuses two angles that already exceed 180°', () => {
    // Returned a = −26.64, having set C = 180 − 195 = −15 and shown that
    // as a step of valid working.
    refused('A=100, B=95, c=7');
    refused('a=7, A=170, B=30');
  });

  it('still solves the triangles that do exist', () => {
    expect(answer('a=7, b=9, C=40')).toBe('c = 5.79');
    expect(byMethod('triangle-rules', 'area', 'a=13, b=14, c=15 area')).toBe('\\text{Area} = 84');
  });
});

describe('a conclusion without a value is still an answer', () => {
  /**
   * B=67, a=49, b=38 gives sin A > 1, so no triangle exists — and the sine
   * rule proves it in three steps. The engine discarded that proof because it
   * carried no final value, and showed the cosine rule's error instead.
   */
  it('keeps the proof that no triangle exists', () => {
    const p = runWorked('B=67, a=49, b=38').parts[0];
    expect(p.result.ok).toBe(true);
    if (!p.result.ok) return;
    expect(p.result.solution.steps.map((s) => s.latex ?? '').join(' ')).toContain(
      'no triangle exists',
    );
  });
});

describe('the second-derivative test is not used where it says nothing', () => {
  /**
   * y = x⁴ has f''(0) = 0 and a clear minimum — the standard counter-example,
   * and the app gave the standard wrong answer by calling every such point an
   * inflection.
   */
  it('classifies a flat-bottomed turning point by the gradient either side', () => {
    expect(answer('stationary points of x^4')).toContain('minimum');
    expect(answer('stationary points of -x^4')).toContain('maximum');
    expect(answer('stationary points of x^6')).toContain('minimum');
  });

  it('still calls a genuine inflection an inflection', () => {
    expect(answer('stationary points of x^3')).toContain('inflection');
  });

  it('is unchanged where the second derivative does decide', () => {
    expect(answer('stationary points of x^3 - 3x')).toBe(
      '\\left(-1,\\; 2\\right)\\text{ maximum}, \\quad \\left(1,\\; -2\\right)\\text{ minimum}',
    );
  });
});

describe('the printed answer means what it says', () => {
  /**
   * "\sec x^{2}" renders as sec(x²) — a different function from sec²x, so the
   * answer to `d/dx tan x` was wrong as printed.
   */
  it('puts a power on the function name, not its argument', () => {
    expect(byMethod('differentiate', 'rules', 'differentiate tan x')).toBe("f'(x) = \\sec^{2} x");
    expect(byMethod('differentiate', 'rules', 'differentiate sin(x)^3')).toBe(
      "f'(x) = 3\\sin^{2} x\\cos x",
    );
  });

  it('does not run a factor into an unbracketed function argument', () => {
    // Was "\cos xx - \sin x", which reads as cos(xx).
    expect(byMethod('differentiate', 'rules', 'differentiate sin(x)/x')).toBe(
      "f'(x) = \\dfrac{x\\cos x - \\sin x}{x^{2}}",
    );
  });

  it('writes a negative term as a subtraction', () => {
    expect(byMethod('differentiate', 'rules', 'd/dx x^2 + 2cos(x)')).toBe("f'(x) = 2x - 2\\sin x");
  });

  it('writes a horizontal tangent without an x term', () => {
    // Was "y = 0x - 1".
    expect(answer('tangent to y = x^2 - 4x + 3 at x = 2')).toBe('y = -1');
  });
});

describe('a reader takes the whole expression or refuses it', () => {
  /**
   * readSurd matched the first √ anywhere and ignored the rest, so
   * `sqrt(8) + sqrt(18)` — which is 5√2 — was answered 2√2.
   */
  it('refuses a surd expression it can only partly read', () => {
    refused('sqrt(8) + sqrt(18)');
    refused('sqrt(2) * sqrt(8)');
    refused('rationalise 3/(2+sqrt(3))'); // needs the conjugate method
  });

  it('still simplifies a single surd', () => {
    expect(answer('simplify sqrt(72)')).toBe('6\\sqrt{2}');
    expect(answer('rationalise 6/sqrt(3)')).toBe('2\\sqrt{3}');
  });
});

describe('a stated quantity is not replaced by an assumption', () => {
  it('uses the starting amount the sentence gives', () => {
    // Continuous growth: 500e^0.5 = 824.3606. Was 164.87, from y₀ = 100.
    expect(answer('a population of 500 grows at 5% per year, after 10 years')).toBe('y = 824.3606');
  });

  it('reads money as compounding annually, not continuously', () => {
    // A sum of money goes to the financial solver, which compounds once a
    // year: 2000 × 1.06⁵ = $2676.45. That is the SACE reading for an
    // investment; continuous growth (2000e^0.3 = 2699.72) is for populations.
    expect(answer('an investment of 2000 grows at 6% per year, after 5 years')).toBe(
      'A = \\$2,676.45, \\quad I = \\$676.45',
    );
  });

  it('still assumes 100 when nothing is given', () => {
    expect(answer('grows at 5% per year, after 10 years')).toBe('y = 164.8721');
  });
});

/**
 * A library of problems with independently derived answers, kept as one table
 * so that a change anywhere in the engine has to face all of them at once.
 */
describe('worked answers stay worked', () => {
  const CASES: Array<[input: string, expected: string]> = [
    // Linear
    ['2x + 3 = 11', 'x = 4'],
    ['3x - 7 = 2x + 5', 'x = 12'],
    ['-3x + 4 = 10', 'x = -2'],
    ['5 - 2x = 11', 'x = -3'],
    ['4x - 9 = 0', 'x = \\frac{9}{4}'],
    // Quadratic — every root substitutes back to zero
    ['2x^2 + 7x - 4 = 0', 'x = \\frac{1}{2} \\quad\\text{or}\\quad x = -4'],
    ['x^2 - 5x + 6 = 0', 'x = 3 \\quad\\text{or}\\quad x = 2'],
    ['6x^2 - 5x - 6 = 0', 'x = \\frac{3}{2} \\quad\\text{or}\\quad x = -\\frac{2}{3}'],
    ['4x^2 - 12x + 9 = 0', 'x = \\frac{3}{2}'],
    ['x^2 + 1 = 2x', 'x = 1'],
    ['9x^2 - 4 = 0', 'x = \\frac{2}{3} \\quad\\text{or}\\quad x = -\\frac{2}{3}'],
    // Simultaneous — both equations satisfied
    ['2x + y = 7; x - y = 2', 'x = 3, \\quad y = 1'],
    ['3x + 2y = 16; 5x - 4y = 1', 'x = 3, \\quad y = \\frac{7}{2}'],
    // Triangles — law of cosines, Heron, angle sum
    ['a=7, b=9, C=40', 'c = 5.79'],
    ['b=8, c=5, A=120', 'a = 11.36'],
    ['a=10, b=10, C=60', 'c = 10'],
    ['a=3, b=4, c=5', 'C = 90^{\\circ}'],
    ['a=5, b=6, c=7', 'C = 78.46^{\\circ}'],
    ['a=2, b=3, c=4', 'C = 104.48^{\\circ}'],
    ['a=3, b=4', 'c = 5'],
    ['a=5, b=12', 'c = 13'],
    ['a=6, c=10', 'b = 8'],
    ['A=30, c=10', 'a = 5'],
    // Calculus — checked against finite differences and Simpson's rule
    ['d/dx x^3 - 4x^2 + 2x - 7', "f'(x) = 3x^{2} - 8x + 2"],
    ['d/dx -3x^2 + 5', "f'(x) = -6x"],
    ['integrate 3x^2 + 2x', 'x^{3} + x^{2} + C'],
    ['integrate 6x^5 - 4x^3 + 2', 'x^{6} - x^{4} + 2x + C'],
    ['integrate x^3 from -1 to 1', '0'],
    ['integrate 4x^3 - 6x from 1 to 3', '56'],
    ['gradient of y = x^2 at x = 3', '\\text{gradient} = 6'],
    ['gradient of y = x^3 - 2x at x = -1', '\\text{gradient} = 1'],
    ['tangent to y = x^2 at x = 2', 'y = 4x - 4'],
    ['normal to y = x^2 at x = 2', 'y = -0.25x + 4.5'],
    ['stationary points of 2x^3 - 9x^2 + 12x - 3',
      '\\left(1,\\; 2\\right)\\text{ maximum}, \\quad \\left(2,\\; 1\\right)\\text{ minimum}'],
    ['stationary points of x^3 + x', '\\text{no stationary points}'],
    // Logs — e^25, and 2^5 = 32
    ['2^x = 32', 'x = 5'],
    ['log2(32)', '\\log_{2}(32) = 5'],
    ['ln x = 5', 'x = 148.413159'],
    // Rates
    ['half-life 5, initial 80, t=15', 'y = 10'],
    ['doubling time 7, initial 500, t=21', 'y = 4000'],
    // Arithmetic
    ['234 × 56', '13104'],
    ['3/4 + 1/6', '\\frac{11}{12}'],
  ];

  for (const [input, expected] of CASES) {
    it(`${input}  →  ${expected}`, () => {
      expect(answer(input)).toBe(expected);
    });
  }
});
