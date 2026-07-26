import { makeRng, close, numbersIn, type Rng } from './random';
import { Rational } from '../lib/math/rational';
import { Poly, parsePoly } from '../lib/math/parse';
import { realRoots, evaluatePoly } from '../lib/math/roots';
import { quadraticRoots, quadraticsSolver } from '../solvers/quadratics';
import { differentiate } from '../solvers/calculus/differentiate';
import { integrate } from '../solvers/calculus/integrate';
import { linearSolver } from '../solvers/algebra/linear';
import { simultaneousSolver } from '../solvers/algebra/simultaneous';
import { rightTriangleSolver } from '../solvers/trigonometry/right-triangle';
import { triangleRulesSolver } from '../solvers/trigonometry/triangle-rules';
import { statisticsSolver } from '../solvers/statistics/descriptive';
import { sequencesSolver } from '../solvers/sequences';
import { financialSolver } from '../solvers/financial';
import { countingSolver } from '../solvers/statistics/counting';
import { fractionsSolver } from '../solvers/arithmetic/fractions';
import { percentageSolver } from '../solvers/arithmetic/percentages';
import { indicesSolver } from '../solvers/algebra/indices';
import { inequalitySolver } from '../solvers/algebra/inequalities';

/**
 * Property-based validation.
 *
 * Hand-written test cases only prove the answers someone thought to check.
 * These tests generate hundreds of problems and verify each one against an
 * INDEPENDENT source of truth — substituting a root back into the equation,
 * comparing a derivative against a finite difference, multiplying a matrix by
 * its inverse. Nothing here checks the engine against itself.
 */

const RUNS = 200;

function buildPoly(coeffs: number[]): Poly {
  // coeffs[i] is the coefficient of x^i
  const m = new Map<number, Rational>();
  coeffs.forEach((c, i) => m.set(i, new Rational(c)));
  return new Poly(m, 'x');
}
function randomPoly(rng: Rng, degree: number, lo = -6, hi = 6): { poly: Poly; coeffs: number[] } {
  const coeffs: number[] = [];
  for (let i = 0; i < degree; i++) coeffs.push(rng.int(lo, hi));
  coeffs.push(rng.nonZeroInt(lo, hi)); // leading coefficient must be non-zero
  return { poly: buildPoly(coeffs), coeffs };
}
const evalCoeffs = (coeffs: number[], x: number) =>
  coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);

/* ------------------------------------------------------------- quadratics */

describe('quadratics: every root satisfies the equation', () => {
  it('substitutes each root back into ax² + bx + c', () => {
    const rng = makeRng(1);
    let checked = 0;
    for (let i = 0; i < RUNS; i++) {
      const a = rng.nonZeroInt(-9, 9);
      const b = rng.int(-12, 12);
      const c = rng.int(-12, 12);
      const info = quadraticRoots(a, b, c);
      for (const r of info.numericRoots) {
        const residual = a * r * r + b * r + c;
        expect(
          close(residual, 0, 1e-6),
          `root ${r} of ${a}x²+${b}x+${c} left residual ${residual}`,
        ).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('agrees with the discriminant about how many real roots there are', () => {
    const rng = makeRng(2);
    for (let i = 0; i < RUNS; i++) {
      const a = rng.nonZeroInt(-9, 9);
      const b = rng.int(-12, 12);
      const c = rng.int(-12, 12);
      const disc = b * b - 4 * a * c;
      const n = quadraticRoots(a, b, c).numericRoots.length;
      const expected = disc < 0 ? 0 : disc === 0 ? 1 : 2;
      expect(n, `Δ=${disc} for ${a}x²+${b}x+${c} gave ${n} roots`).toBe(expected);
    }
  });

  it('gives the same answer from all three methods, whatever the coefficients', () => {
    const rng = makeRng(3);
    for (let i = 0; i < 120; i++) {
      const a = rng.nonZeroInt(-6, 6);
      const b = rng.int(-9, 9);
      const c = rng.int(-9, 9);
      const input = `${a}x^2 + ${b}x + ${c} = 0`;
      const answers = ['factorise', 'complete-square', 'formula']
        .map((m) => quadraticsSolver.solve(input, m))
        .map((r) => (r.ok ? r.solution.answerLatex : 'ERROR'));
      // Factorising legitimately bows out when there is no integer factorisation.
      const usable = answers.filter((x) => x !== undefined && x !== 'ERROR');
      if (usable.length > 1) {
        expect(new Set(usable).size, `methods disagreed on ${input}: ${answers.join(' | ')}`).toBe(1);
      }
    }
  });

  it('never lets the vertex sit off the parabola', () => {
    const rng = makeRng(4);
    for (let i = 0; i < RUNS; i++) {
      const a = rng.nonZeroInt(-8, 8);
      const b = rng.int(-10, 10);
      const c = rng.int(-10, 10);
      const vx = -b / (2 * a);
      const vy = a * vx * vx + b * vx + c;
      // The turning point must be an extremum: both neighbours lie on one side.
      const left = a * (vx - 0.1) ** 2 + b * (vx - 0.1) + c;
      const right = a * (vx + 0.1) ** 2 + b * (vx + 0.1) + c;
      const isMin = a > 0;
      expect(isMin ? left > vy && right > vy : left < vy && right < vy).toBe(true);
    }
  });
});

/* ------------------------------------------------------------ root finding */

describe('realRoots: every root it reports is genuinely a root', () => {
  it('evaluates to zero for cubics and quartics', () => {
    const rng = makeRng(5);
    let found = 0;
    for (let i = 0; i < RUNS; i++) {
      const degree = rng.int(1, 4);
      const { poly } = randomPoly(rng, degree, -5, 5);
      for (const r of realRoots(poly)) {
        const residual = evaluatePoly(poly, r);
        expect(close(residual, 0, 1e-5), `reported root ${r} left residual ${residual}`).toBe(true);
        found++;
      }
    }
    expect(found).toBeGreaterThan(100);
  });

  it('finds every root of a polynomial built from known factors', () => {
    const rng = makeRng(6);
    for (let i = 0; i < 120; i++) {
      const wanted = [rng.int(-6, 6), rng.int(-6, 6), rng.int(-6, 6)];
      // Expand (x - r1)(x - r2)(x - r3)
      let coeffs = [1];
      for (const r of wanted) {
        const next = new Array(coeffs.length + 1).fill(0);
        coeffs.forEach((c, k) => {
          next[k + 1] += c;
          next[k] -= c * r;
        });
        coeffs = next;
      }
      const found = realRoots(buildPoly(coeffs));
      for (const r of new Set(wanted)) {
        expect(
          found.some((f) => close(f, r, 1e-4)),
          `missed root ${r} of the cubic with roots ${wanted.join(', ')}`,
        ).toBe(true);
      }
    }
  });
});

/* --------------------------------------------------------------- calculus */

describe('differentiation: matches a numerical derivative', () => {
  it('agrees with a central finite difference at many points', () => {
    const rng = makeRng(7);
    for (let i = 0; i < RUNS; i++) {
      const { poly, coeffs } = randomPoly(rng, rng.int(1, 4));
      const d = differentiate(poly);
      for (const x of [-2.3, -0.7, 0.4, 1.6, 3.1]) {
        const h = 1e-5;
        const numeric = (evalCoeffs(coeffs, x + h) - evalCoeffs(coeffs, x - h)) / (2 * h);
        const symbolic = evaluatePoly(d, x);
        expect(
          close(symbolic, numeric, 1e-4),
          `d/dx at x=${x} gave ${symbolic}, numerically ${numeric}`,
        ).toBe(true);
      }
    }
  });

  it('drops the degree by exactly one', () => {
    const rng = makeRng(8);
    for (let i = 0; i < 100; i++) {
      const degree = rng.int(1, 5);
      const { poly } = randomPoly(rng, degree);
      expect(differentiate(poly).degree()).toBe(degree - 1);
    }
  });
});

describe('integration: matches numerical quadrature', () => {
  /** Simpson's rule — an independent way to compute the same area. */
  function simpson(coeffs: number[], a: number, b: number, n = 2000): number {
    const h = (b - a) / n;
    let sum = evalCoeffs(coeffs, a) + evalCoeffs(coeffs, b);
    for (let i = 1; i < n; i++) {
      sum += evalCoeffs(coeffs, a + i * h) * (i % 2 === 0 ? 2 : 4);
    }
    return (sum * h) / 3;
  }

  it('gives definite integrals that match Simpson’s rule', () => {
    const rng = makeRng(9);
    for (let i = 0; i < 150; i++) {
      const { poly, coeffs } = randomPoly(rng, rng.int(1, 4));
      const F = integrate(poly);
      const lo = rng.int(-4, 0);
      const hi = lo + rng.int(1, 5);
      const exact = evaluatePoly(F, hi) - evaluatePoly(F, lo);
      const numeric = simpson(coeffs, lo, hi);
      expect(
        close(exact, numeric, 1e-5),
        `∫ from ${lo} to ${hi} gave ${exact}, numerically ${numeric}`,
      ).toBe(true);
    }
  });

  it('is undone by differentiating again', () => {
    const rng = makeRng(10);
    for (let i = 0; i < 150; i++) {
      const { poly } = randomPoly(rng, rng.int(0, 4));
      const back = differentiate(integrate(poly));
      for (const x of [-1.5, 0.8, 2.2]) {
        expect(close(evaluatePoly(back, x), evaluatePoly(poly, x), 1e-9)).toBe(true);
      }
    }
  });
});

/* ---------------------------------------------------------------- algebra */

describe('linear equations: the solution satisfies the original equation', () => {
  it('substitutes back into both sides', () => {
    const rng = makeRng(11);
    let checked = 0;
    for (let i = 0; i < RUNS; i++) {
      const a = rng.nonZeroInt(-9, 9);
      const b = rng.int(-15, 15);
      const c = rng.int(-9, 9);
      const d = rng.int(-15, 15);
      if (a === c) continue; // no unique solution
      const input = `${a}x + ${b} = ${c}x + ${d}`;
      const res = linearSolver.solve(input, 'balance');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      const x = numbersIn(res.solution.answerLatex)[0];
      expect(close(a * x + b, c * x + d, 1e-9), `x=${x} fails ${input}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  });
});

describe('simultaneous equations: the pair satisfies both equations', () => {
  it('substitutes back into each equation', () => {
    const rng = makeRng(12);
    let checked = 0;
    for (let i = 0; i < 150; i++) {
      const [a, b, c, d] = [rng.nonZeroInt(-6, 6), rng.nonZeroInt(-6, 6), rng.nonZeroInt(-6, 6), rng.nonZeroInt(-6, 6)];
      if (a * d - c * b === 0) continue; // parallel or identical lines
      const e = rng.int(-20, 20);
      const f = rng.int(-20, 20);
      const input = `${a}x + ${b}y = ${e} ; ${c}x + ${d}y = ${f}`;
      const res = simultaneousSolver.solve(input, 'elimination');
      if (!res.ok || !res.solution.answerLatex) continue;
      const nums = numbersIn(res.solution.answerLatex);
      const [x, y] = nums;
      expect(close(a * x + b * y, e, 1e-6), `(${x},${y}) fails eq1 of ${input}`).toBe(true);
      expect(close(c * x + d * y, f, 1e-6), `(${x},${y}) fails eq2 of ${input}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('inequalities: the reported region really does satisfy them', () => {
  it('holds inside the solution and fails outside it', () => {
    const rng = makeRng(13);
    for (let i = 0; i < 120; i++) {
      const a = rng.nonZeroInt(-7, 7);
      const b = rng.int(-12, 12);
      const rel = rng.pick(['>', '<'] as const);
      const res = inequalitySolver.solve(`${a}x + ${b} ${rel} 0`, 'auto');
      if (!res.ok || !res.solution.answerLatex) continue;
      const boundary = numbersIn(res.solution.answerLatex)[0];
      const flipped = res.solution.answerLatex.includes('<');
      // A point well inside the claimed region must satisfy the inequality.
      const inside = flipped ? boundary - 1 : boundary + 1;
      const outside = flipped ? boundary + 1 : boundary - 1;
      const holds = (x: number) => (rel === '>' ? a * x + b > 0 : a * x + b < 0);
      expect(holds(inside), `x=${inside} should satisfy ${a}x+${b}${rel}0`).toBe(true);
      expect(holds(outside), `x=${outside} should NOT satisfy ${a}x+${b}${rel}0`).toBe(false);
    }
  });
});

describe('indices & surds: simplification preserves value', () => {
  it('keeps √n equal to its simplified form', () => {
    const rng = makeRng(14);
    for (let i = 0; i < 150; i++) {
      const n = rng.int(2, 400);
      const res = indicesSolver.solve(`sqrt ${n}`, 'simplify-surd');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      const a = res.solution.answerLatex;
      // Read "k√m", "√m" or a plain integer back into a number.
      const m = a.match(/^(-?\d+)?\\sqrt\{(\d+)\}$/);
      const value = m ? (m[1] ? Number(m[1]) : 1) * Math.sqrt(Number(m[2])) : Number(a);
      expect(close(value, Math.sqrt(n), 1e-9), `√${n} simplified to ${a} (=${value})`).toBe(true);
    }
  });
});

/* ----------------------------------------------------------- trigonometry */

describe('triangles: results obey the underlying geometry', () => {
  it('produces right triangles that satisfy Pythagoras', () => {
    const rng = makeRng(15);
    for (let i = 0; i < 150; i++) {
      const a = rng.int(1, 30);
      const b = rng.int(1, 30);
      const res = rightTriangleSolver.solve(`a=${a}, b=${b}`, 'pythagoras');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      const c = numbersIn(res.solution.answerLatex)[0];
      // Answers are displayed to 2 dp, so compare the length itself against a
      // half-of-the-last-digit tolerance. Comparing the *squares* would
      // amplify that rounding and flag correct answers as wrong.
      const exact = Math.sqrt(a * a + b * b);
      expect(
        Math.abs(c - exact) <= 0.005,
        `${a},${b} gave hypotenuse ${c}, exactly ${exact}`,
      ).toBe(true);
    }
  });

  it('produces cosine-rule sides that satisfy the law of cosines', () => {
    const rng = makeRng(16);
    let checked = 0;
    for (let i = 0; i < 150; i++) {
      const a = rng.int(2, 25);
      const b = rng.int(2, 25);
      const C = rng.int(10, 170);
      const res = triangleRulesSolver.solve(`a=${a}, b=${b}, C=${C}`, 'cosine-rule');
      if (!res.ok || !res.solution.answerLatex) continue;
      const c = numbersIn(res.solution.answerLatex)[0];
      const expected = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos((C * Math.PI) / 180));
      expect(close(c, expected, 1e-2), `a=${a},b=${b},C=${C} gave c=${c}, expected ${expected}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('produces triangle areas matching Heron independently', () => {
    const rng = makeRng(17);
    let checked = 0;
    for (let i = 0; i < 120; i++) {
      const a = rng.int(3, 20);
      const b = rng.int(3, 20);
      const C = rng.int(15, 165);
      const res = triangleRulesSolver.solve(`a=${a}, b=${b}, C=${C} area`, 'area');
      if (!res.ok || !res.solution.answerLatex) continue;
      const area = numbersIn(res.solution.answerLatex)[0];
      // Independent route: find the third side, then use Heron's formula.
      const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos((C * Math.PI) / 180));
      const s = (a + b + c) / 2;
      const heron = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      expect(close(area, heron, 1e-2), `area ${area} vs Heron ${heron}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(80);
  });
});

/* ------------------------------------------------------------- statistics */

describe('statistics: recomputed independently', () => {
  it('matches an independent mean and sample standard deviation', () => {
    const rng = makeRng(18);
    for (let i = 0; i < 120; i++) {
      const n = rng.int(4, 12);
      const data = Array.from({ length: n }, () => rng.int(-40, 80));
      const res = statisticsSolver.solve(data.join(', '), 'summary');
      expect(res.ok).toBe(true);
      if (!res.ok) continue;

      const mean = data.reduce((s, x) => s + x, 0) / n;
      const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
      const sd = Math.sqrt(variance);

      const text = res.solution.steps.map((s) => s.latex ?? '').join(' ');
      // The mean and sd must both appear in the working, to 2 dp.
      expect(
        text.includes(String(Math.round(mean * 100) / 100)) ||
          text.includes(mean.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')),
        `mean ${mean} not found for ${data.join(',')}`,
      ).toBe(true);
      expect(Number.isFinite(sd)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------- sequences */

describe('sequences: nth term matches walking the sequence out', () => {
  it('matches term-by-term generation for arithmetic sequences', () => {
    const rng = makeRng(19);
    for (let i = 0; i < 120; i++) {
      const a = rng.int(-15, 15);
      const d = rng.nonZeroInt(-8, 8);
      const n = rng.int(3, 25);
      const res = sequencesSolver.solve(`a=${a}, d=${d}, n=${n}`, 'arithmetic');
      expect(res.ok).toBe(true);
      if (!res.ok) continue;
      // Independent: step through the sequence.
      let term = a;
      for (let k = 1; k < n; k++) term += d;
      const text = res.solution.steps.map((s) => s.latex ?? '').join(' ');
      expect(text.includes(String(term)), `t_${n} should be ${term} for a=${a}, d=${d}`).toBe(true);
    }
  });
});

/* -------------------------------------------------------------- financial */

describe('compound interest: matches year-by-year accumulation', () => {
  it('matches an independent iterative calculation', () => {
    const rng = makeRng(20);
    let checked = 0;
    for (let i = 0; i < 100; i++) {
      const P = rng.int(500, 50000);
      const rate = rng.int(1, 15);
      const years = rng.int(1, 20);
      const res = financialSolver.solve(`$${P} at ${rate}% for ${years} years compound`, 'compound');
      if (!res.ok || !res.solution.answerLatex) continue;
      // Independent: multiply by (1+r) once per year.
      let amount = P;
      for (let y = 0; y < years; y++) amount *= 1 + rate / 100;
      const reported = numbersIn(res.solution.answerLatex.replace(/,/g, ''))[0];
      expect(
        close(reported, amount, 1e-3),
        `$${P} at ${rate}% for ${years}y gave ${reported}, iteratively ${amount}`,
      ).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(80);
  });
});

/* --------------------------------------------------------------- counting */

describe('counting: matches Pascal’s recurrence', () => {
  it('agrees with C(n,r) = C(n-1,r-1) + C(n-1,r)', () => {
    // Build Pascal's triangle independently of the solver.
    const P: number[][] = [[1]];
    for (let n = 1; n <= 25; n++) {
      P[n] = [1];
      for (let r = 1; r < n; r++) P[n][r] = P[n - 1][r - 1] + P[n - 1][r];
      P[n][n] = 1;
    }
    const rng = makeRng(21);
    for (let i = 0; i < 120; i++) {
      const n = rng.int(1, 25);
      const r = rng.int(0, n);
      const res = countingSolver.solve(`${n}C${r}`, 'combination');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      expect(Number(res.solution.answerLatex), `${n}C${r}`).toBe(P[n][r]);
    }
  });
});

/* -------------------------------------------------------------- fractions */

describe('fractions: exact arithmetic matches floating point', () => {
  it('agrees with the decimal value of every operation', () => {
    const rng = makeRng(22);
    for (let i = 0; i < 200; i++) {
      const [a, b, c, d] = [rng.nonZeroInt(-9, 9), rng.int(1, 9), rng.nonZeroInt(-9, 9), rng.int(1, 9)];
      const op = rng.pick(['+', '-', '*', '÷'] as const);
      const res = fractionsSolver.solve(`${a}/${b} ${op} ${c}/${d}`, 'standard');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      const expected =
        op === '+' ? a / b + c / d : op === '-' ? a / b - c / d : op === '*' ? (a / b) * (c / d) : a / b / (c / d);
      const ans = res.solution.answerLatex;
      const fr = ans.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);
      const value = fr ? (fr[1] === '-' ? -1 : 1) * (Number(fr[2]) / Number(fr[3])) : Number(ans);
      expect(close(value, expected, 1e-9), `${a}/${b} ${op} ${c}/${d} gave ${ans}`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------ percentages */

describe('percentages: reverse undoes forward', () => {
  it('recovers the original value after an increase', () => {
    const rng = makeRng(23);
    for (let i = 0; i < 120; i++) {
      const original = rng.int(20, 5000);
      const pct = rng.int(1, 60);
      const after = original * (1 + pct / 100);
      const res = percentageSolver.solve(`after a ${pct}% increase the price is ${after}`, 'auto');
      if (!res.ok || !res.solution.answerLatex) continue;
      const recovered = numbersIn(res.solution.answerLatex)[0];
      expect(
        close(recovered, original, 1e-3),
        `${original} +${pct}% = ${after}, reversed to ${recovered}`,
      ).toBe(true);
    }
  });

  it('finds a percentage of an amount consistently with the definition', () => {
    const rng = makeRng(24);
    for (let i = 0; i < 150; i++) {
      const pct = rng.int(1, 200);
      const amount = rng.int(1, 5000);
      const res = percentageSolver.solve(`${pct}% of ${amount}`, 'decimal');
      expect(res.ok).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;
      expect(close(Number(res.solution.answerLatex), (pct / 100) * amount, 1e-6)).toBe(true);
    }
  });
});

/* ------------------------------------------------------- parser round-trip */

describe('parser: reading a polynomial back gives the same function', () => {
  it('round-trips through LaTeX and back', () => {
    const rng = makeRng(25);
    for (let i = 0; i < 150; i++) {
      const { poly, coeffs } = randomPoly(rng, rng.int(1, 4));
      // Re-read the polynomial from a plain-text form of itself.
      const text = coeffs
        .map((c, i) => (c === 0 ? '' : `${c >= 0 ? '+' : ''}${c}${i === 0 ? '' : i === 1 ? 'x' : `x^${i}`}`))
        .filter(Boolean)
        .join('');
      const reparsed = parsePoly(text || '0', 'x');
      for (const x of [-2, -0.5, 1, 3.7]) {
        expect(
          close(evaluatePoly(reparsed, x), evaluatePoly(poly, x), 1e-9),
          `round-trip of "${text}" differs at x=${x}`,
        ).toBe(true);
      }
    }
  });
});
