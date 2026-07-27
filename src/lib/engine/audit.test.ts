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
    /*
     * These are now solved by undoing the layers, so the check is no longer
     * "does it refuse" but "does it answer the question that was asked". The
     * wrong answer this guards against is x = 0, which is what rewriting
     * `x^3 - 1` as `x^2` produces.
     */
    expect(answer('x^3 - 1 = 0')).toBe('x = 1');
    expect(answer('x^3 - 2 = 6')).toBe('x = 2');
    expect(answer('x^4 - 2 = 0')).toBe('x = 1.189207, \\quad x = -1.189207');
    expect(answer('2x^3 - 1 = 0')).toBe('x = 0.793701'); // the cube root of a half
    expect(answer('x^10 - 8 = 0')).toBe('x = 1.231144, \\quad x = -1.231144');
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

/**
 * Statistics, the Specialist topics and finance, checked against reference
 * implementations written from the definitions: quartiles and deviations
 * straight from the data, binomial probabilities from Pascal's triangle,
 * determinants by cofactor expansion, interest iterated year by year, and a
 * loan amortised month by month to confirm the balance reaches zero.
 *
 * This sweep found no wrong answers — these lock that in.
 */
describe('statistics, specialist and finance', () => {
  const CASES: Array<[input: string, expected: string]> = [
    // Descriptive — mean, median and the five-number summary computed directly
    ['4, 8, 15, 16, 23, 42', '\\bar{x} = 18, \\quad \\text{median} = 15.5, \\quad s = 13.4907'],
    // Counting — against Pascal's triangle and n!/(n−r)!
    ['10C3', '120'],
    ['20C10', '184756'],
    ['7C1', '7'],
    ['6C0', '1'],
    ['5!', '120'],
    ['0!', '1'],
    // Distributions — binomial summed term by term
    ['binomial n=10, p=0.5, x=3', 'P(X = 3) = 0.117188'],
    ['binomial n=5, p=0.2, x=2', 'P(X = 2) = 0.2048'],
    ['binomial n=10, p=0, x=0', 'P(X = 0) = 1'],
    // Matrices — determinant by cofactor expansion
    ['det [[1,2],[3,4]]', '\\det = -2'],
    ['det [[6,1,1],[4,-2,5],[2,8,7]]', '\\det = -306'],
    // Vectors — from the dot-product definition
    ['(1,2,3) . (4,5,6)', '\\mathbf{a} \\cdot \\mathbf{b} = 32'],
    ['|(3,4)|', '|\\mathbf{a}| = 5'],
    ['|(1,2,2)|', '|\\mathbf{a}| = 3'],
    // Complex — (3+4i)(1−2i) = 3 − 6i + 4i + 8 = 11 − 2i
    ['|3+4i|', '|z| = 5'],
    ['(3+4i)*(1-2i)', '11 - 2i'],
    ['(1+2i)/(3-4i)', '-0.2 + 0.4i'],
    // Financial — iterated year by year; the loan amortises to zero
    ['$5000 at 4% for 3 years compound', 'A = \\$5,624.32, \\quad I = \\$624.32'],
    ['$20000 at 7.5% for 10 years compound', 'A = \\$41,220.63, \\quad I = \\$21,220.63'],
    ['$5000 at 4% for 3 years simple', 'I = \\$600.00, \\quad A = \\$5,600.00'],
    ['$20000 at 15% for 4 years depreciation', 'A = \\$10,440.13'],
    ['loan $300000 at 6% for 30 years repaid monthly', 'R = \\$1,798.65'],
    // Sequences — summed term by term
    ['3, 7, 11, 15', 't_n = 4n - 1, \\quad t_{4} = 15, \\quad S_{4} = 36'],
    ['10, 7, 4, 1', 't_n = -3n + 13, \\quad t_{4} = 1, \\quad S_{4} = 22'],
    // Logs — b^answer reproduces the argument
    ['log10(1000)', '\\log(1000) = 3'],
    ['log2(20)', '\\log_{2}(20) = 4.321928'],
    // Fractions and percentages, forwards and in reverse
    ['-1/2 + 1/3', '-\\frac{1}{6}'],
    ['7/3 - 1/3', '2'],
    ['15% of 80', '12'],
    ['increase 200 by 12%', '224'],
    ['decrease 90 by 30%', '63'],
  ];

  for (const [input, expected] of CASES) {
    it(`${input}  →  ${expected}`, () => {
      expect(answer(input)).toBe(expected);
    });
  }

  /** Preconditions that must be refused rather than fudged. */
  it('turns away input the formula cannot take', () => {
    refused('8C10'); // choosing 10 from 8
    refused('binomial n=10, p=0.5, x=12'); // x beyond n
    refused('[[1,2,3],[4,5,6]] * [[1,2],[3,4]]'); // dimensions do not match
    refused('log2(0)'); // logarithm of zero
    refused('2^x = -5'); // a positive base cannot reach a negative
  });

  it('proves a singular matrix has no inverse rather than inventing one', () => {
    const p = runWorked('inverse [[1,2],[2,4]]').parts[0];
    expect(p.result.ok).toBe(true);
    if (!p.result.ok) return;
    const working = p.result.solution.steps.map((s) => s.latex ?? '').join(' ');
    expect(working).toContain('No inverse exists');
    expect(working).toContain('= 0'); // the determinant, shown
  });

  it('offers a limiting sum only when the ratio allows one', () => {
    const withSum = answer('a=8, r=0.5, n=10');
    expect(withSum).toContain('S_{\\infty}');
    for (const diverging of ['a=8, r=2, n=10', 'a=8, r=1, n=10']) {
      expect(answer(diverging), diverging).not.toContain('S_{\\infty}');
    }
  });
});
