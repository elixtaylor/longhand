import { Rational } from '../../lib/math/rational';
import { parseEquation, toStandardForm, Poly, ParseError } from '../../lib/math/parse';
import { rl, rlPlain, polyLatex, connectTerm } from '../../lib/math/format';
import { simplifySqrt, isPerfectSquare } from '../../lib/math/surd';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/* ------------------------------------------------------------- integer helpers */
function igcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
function gcdMany(xs: number[]): number {
  const g = xs.reduce((acc, x) => igcd(acc, x), 0);
  return g || 1;
}
function ilcm(a: number, b: number): number {
  if (a === 0 || b === 0) return Math.abs(a || b) || 1;
  return Math.abs((a / igcd(a, b)) * b);
}

/** Signed integer, wrapped in parentheses when negative (for substitution). */
function par(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/* -------------------------------------------------------- standard-form → a,b,c */
interface ABC {
  a: number;
  b: number;
  c: number;
  scaled: number; // factor used to clear fractions (1 when none needed)
}

function integeriseABC(std: Poly): ABC {
  const ra = std.get(2);
  const rb = std.get(1);
  const rc = std.get(0);
  const L = ilcm(ilcm(ra.d, rb.d), rc.d);
  return {
    a: ra.n * (L / ra.d),
    b: rb.n * (L / rb.d),
    c: rc.n * (L / rc.d),
    scaled: L,
  };
}

/* ----------------------------------------------------- exact roots (shared core) */
export type RootNature = 'double' | 'two-rational' | 'two-irrational' | 'complex';

export interface RootInfo {
  discriminant: number;
  nature: RootNature;
  /** Real roots as decimals (empty when complex). For tests/plotting. */
  numericRoots: number[];
  answerLatex: string;
  perfectRoot?: number; // √Δ when Δ is a perfect square
  surd?: { out: number; inside: number };
}

/** Build "(A ± C√inside)/D" in lowest terms, handling sign of den & i. */
function pmFraction(
  bNeg: number,
  out: number,
  inside: number,
  denIn: number,
  imaginary: boolean,
): string {
  let bN = bNeg;
  let den = denIn;
  if (den < 0) {
    bN = -bN;
    den = -den;
  }
  const g = gcdMany([Math.abs(bN), Math.abs(out), Math.abs(den)]);
  const A = bN / g;
  const C = out / g;
  const D = den / g;
  // i goes after whatever it's attached to — a bare coefficient ("2i") or a
  // surd ("√7 i") — never in front of it, so it reads as "that many i" the
  // way a student would say it, not "i times that".
  const iPart = imaginary ? 'i' : '';
  const coeff = C === 1 ? '' : String(C);
  const surdTerm = inside === 1 ? `${coeff}${iPart}` : `${coeff}\\sqrt{${inside}}${iPart}`;
  const numerator = A === 0 ? `\\pm ${surdTerm}` : `${A} \\pm ${surdTerm}`;
  return D === 1 ? numerator : `\\dfrac{${numerator}}{${D}}`;
}

export function quadraticRoots(a: number, b: number, c: number): RootInfo {
  const disc = b * b - 4 * a * c;
  const den = 2 * a;

  if (disc === 0) {
    const r = new Rational(-b, den);
    return {
      discriminant: 0,
      nature: 'double',
      numericRoots: [r.toNumber()],
      answerLatex: `x = ${rl(r)}`,
    };
  }
  if (disc > 0 && isPerfectSquare(disc)) {
    const s = Math.round(Math.sqrt(disc));
    const r1 = new Rational(-b + s, den);
    const r2 = new Rational(-b - s, den);
    const [hi, lo] = r1.cmp(r2) >= 0 ? [r1, r2] : [r2, r1];
    return {
      discriminant: disc,
      nature: 'two-rational',
      numericRoots: [hi.toNumber(), lo.toNumber()],
      perfectRoot: s,
      answerLatex: `x = ${rl(hi)} \\quad\\text{or}\\quad x = ${rl(lo)}`,
    };
  }
  if (disc > 0) {
    const s = simplifySqrt(disc);
    const surd = { out: s.outside, inside: s.inside };
    const root1 = (-b + surd.out * Math.sqrt(surd.inside)) / den;
    const root2 = (-b - surd.out * Math.sqrt(surd.inside)) / den;
    return {
      discriminant: disc,
      nature: 'two-irrational',
      numericRoots: [Math.max(root1, root2), Math.min(root1, root2)],
      surd,
      answerLatex: `x = ${pmFraction(-b, surd.out, surd.inside, den, false)}`,
    };
  }
  const s = simplifySqrt(-disc);
  const surd = { out: s.outside, inside: s.inside };
  return {
    discriminant: disc,
    nature: 'complex',
    numericRoots: [],
    surd,
    answerLatex: `x = ${pmFraction(-b, surd.out, surd.inside, den, true)}`,
  };
}

/* --------------------------------------------------------- shared step: setup */
function headlineFor(std: Poly): string {
  return `Solve $${polyLatex(std)} = 0$`;
}

function readOffStep(a: number, b: number, c: number): Step {
  return {
    note: 'Read off the coefficients from the standard form $ax^2 + bx + c = 0$.',
    latex: `a = ${a},\\quad b = ${b},\\quad c = ${c}`,
  };
}

function scaledStep(scaled: number, std: Poly, a: number, b: number, c: number): Step[] {
  if (scaled === 1) return [];
  return [
    {
      note: `Multiply every term by ${scaled} to clear the fractions/decimals (this doesn't change the solutions).`,
      latex: `${polyLatex(std)} = 0 \\;\\Longrightarrow\\; ${a}x^{2} ${signed(b)}x ${signed(c)} = 0`,
    },
  ];
}
function signed(n: number): string {
  return n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`;
}

/* ------------------------------------------------------------ method: formula */
function solveByFormula(std: Poly): SolveResult {
  const { a, b, c, scaled } = integeriseABC(std);
  const info = quadraticRoots(a, b, c);
  const disc = info.discriminant;

  const steps: Step[] = [
    readOffStep(a, b, c),
    ...scaledStep(scaled, std, a, b, c),
    {
      note: 'Write down the quadratic formula.',
      latex: `x = \\dfrac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}`,
    },
    {
      note: 'Substitute the values (keep the brackets around negatives).',
      latex: `x = \\dfrac{-${par(b)} \\pm \\sqrt{${par(b)}^{2} - 4${par(a)}${par(c)}}}{2${par(a)}}`,
    },
    {
      note: 'Work out the discriminant, $\\Delta = b^{2} - 4ac$.',
      latex: `x = \\dfrac{${-b} \\pm \\sqrt{${disc}}}{${2 * a}}`,
      annotation:
        disc < 0
          ? 'Δ < 0 → no real solutions'
          : disc === 0
            ? 'Δ = 0 → one repeated root'
            : 'Δ > 0 → two real solutions',
    },
  ];

  if (info.nature === 'complex') {
    steps.push({
      note: 'The discriminant is negative, so there are no real solutions. Over the complex numbers (Specialist Mathematics) we write $\\sqrt{-1} = i$:',
      latex: info.answerLatex,
    });
  } else if (info.nature === 'two-rational') {
    steps.push({
      note: 'The discriminant is a perfect square, so take the square root and split the $\\pm$.',
      latex: `x = \\dfrac{${-b} \\pm ${info.perfectRoot}}{${2 * a}}`,
    });
  } else if (info.nature === 'two-irrational' && info.surd) {
    steps.push({
      note: 'Simplify the surd and reduce the fraction.',
      latex: `x = \\dfrac{${-b} \\pm ${info.surd.out === 1 ? '' : info.surd.out}\\sqrt{${info.surd.inside}}}{${2 * a}}`,
    });
  }

  return {
    ok: true,
    solution: {
      headline: headlineFor(std),
      methodName: 'Quadratic formula',
      steps,
      answerLatex: info.nature === 'complex' ? undefined : info.answerLatex,
    },
  };
}

/* -------------------------------------------------- method: complete the square */
function solveByCompletingSquare(std: Poly): SolveResult {
  const { a, b, c, scaled } = integeriseABC(std);
  const info = quadraticRoots(a, b, c);

  const B = new Rational(b, a); // b/a
  const C = new Rational(c, a); // c/a
  const H = B.div(Rational.int(2)); // b/2a
  const H2 = H.mul(H); // (b/2a)^2
  const rhs = C.neg().add(H2); // -(c/a) + (b/2a)^2

  const steps: Step[] = [readOffStep(a, b, c), ...scaledStep(scaled, std, a, b, c)];

  // Write a term as a connective, so a negative coefficient reads "− 4x"
  // rather than the "+ −4x" you get from plain concatenation.
  const term = (r: Rational, suffix = '') =>
    `${r.isNeg() ? '-' : '+'} ${rl(r.abs())}${suffix}`;

  if (a !== 1) {
    steps.push({
      note: `Divide every term by ${a} so the coefficient of $x^{2}$ is 1.`,
      latex: `x^{2} ${term(B, 'x')} ${term(C)} = 0`,
    });
  }
  steps.push({
    note: 'Move the constant term to the right-hand side.',
    latex: `x^{2} ${term(B, 'x')} = ${rl(C.neg())}`,
  });
  steps.push({
    note: `Halve the coefficient of $x$: half of $${rl(B)}$ is $${rl(H)}$. Square that and add it to both sides, which keeps the equation balanced.`,
    latex: `x^{2} ${term(B, 'x')} + \\left(${rl(H)}\\right)^{2} = ${rl(C.neg())} + \\left(${rl(H)}\\right)^{2}`,
    annotation: `half of ${rlPlain(B)} is ${rlPlain(H)}`,
  });
  steps.push({
    // Squaring the half-coefficient is its own arithmetic move; folding it
    // into the factorised line hides where the number on the right came from.
    note: `Work out the square: $\\left(${rl(H)}\\right)^{2} = ${rl(H.mul(H))}$.`,
    latex: `x^{2} ${term(B, 'x')} + ${rl(H.mul(H))} = ${rl(C.neg())} + ${rl(H.mul(H))}`,
  });
  steps.push({
    note: `Add up the right-hand side: $${rl(C.neg())} + ${rl(H.mul(H))} = ${rl(rhs)}$.`,
    latex: `x^{2} ${term(B, 'x')} + ${rl(H.mul(H))} = ${rl(rhs)}`,
  });
  steps.push({
    note: `The left-hand side is now a perfect square, because $\\left(x ${term(H)}\\right)^{2} = x^{2} ${term(B, 'x')} + ${rl(H.mul(H))}$.`,
    latex: `\\left(x ${term(H)}\\right)^{2} = ${rl(rhs)}`,
    annotation: 'completed the square',
  });

  if (rhs.isNeg()) {
    steps.push({
      note: 'The right-hand side is negative, so there are no real solutions (a square can’t be negative).',
      latex: info.answerLatex,
      annotation: 'complex roots — Specialist',
    });
    return done(std, 'Completing the square', steps, undefined);
  }

  steps.push({
    note: 'Take the square root of both sides (remember $\\pm$).',
    latex: `x + ${rl(H)} = \\pm\\sqrt{${rl(rhs)}}`,
  });
  steps.push({
    note: `Subtract ${rl(H)} from both sides to solve for $x$.`,
    latex: info.answerLatex,
  });
  return done(std, 'Completing the square', steps, info.answerLatex);
}

function done(
  std: Poly,
  methodName: string,
  steps: Step[],
  answerLatex: string | undefined,
): SolveResult {
  const sketch = parabolaStep(std);
  if (sketch) steps = [...steps, sketch];
  return {
    ok: true,
    solution: { headline: headlineFor(std), methodName, steps, answerLatex },
  };
}

/**
 * The parabola behind the algebra — where the roots sit, and the turning
 * point. Seeing it is what makes "two solutions" or "no real solutions" click.
 */
function parabolaStep(std: Poly): Step | null {
  const a = std.get(2).toNumber();
  const b = std.get(1).toNumber();
  const c = std.get(0).toNumber();
  if (!Number.isFinite(a) || a === 0) return null;

  const info = quadraticRoots(a, b, c);
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  return {
    note:
      info.nature === 'complex'
        ? 'The parabola sits entirely above (or below) the axis — which is why there are no real solutions.'
        : 'The solutions are where the parabola crosses the $x$-axis.',
    visual: {
      kind: 'curve',
      data: {
        coeffs: [
          [2, a],
          [1, b],
          [0, c],
        ] as Array<[number, number]>,
        roots: info.numericRoots,
        yIntercept: c,
        turningPoints: [{ x: vx, y: vy, kind: a > 0 ? ('min' as const) : ('max' as const) }],
      },
    },
    annotation: 'the parabola',
  };
}

/* ----------------------------------------------------------- method: factorise */
function binomLatex(coef: number, cons: number, v = 'x'): string {
  const lead = coef === 1 ? v : `${coef}${v}`;
  return `${lead} ${cons < 0 ? '-' : '+'} ${Math.abs(cons)}`;
}
function coefTimes(k: number, v: string): string {
  if (k === 1) return v;
  return `${k}${v}`;
}

function solveByFactorising(std: Poly): SolveResult {
  let { a, b, c, scaled } = integeriseABC(std);
  const steps: Step[] = [readOffStep(a, b, c), ...scaledStep(scaled, std, a, b, c)];

  // Make the leading coefficient positive.
  if (a < 0) {
    a = -a;
    b = -b;
    c = -c;
    steps.push({
      note: 'Multiply through by $-1$ so the coefficient of $x^{2}$ is positive.',
      latex: `${a}x^{2} ${signed(b)}x ${signed(c)} = 0`,
    });
  }

  // Take out any common numerical factor.
  const content = gcdMany([a, b, c]);
  let outFactor = 1;
  if (content > 1) {
    outFactor = content;
    a /= content;
    b /= content;
    c /= content;
    steps.push({
      note: `Every term shares a factor of ${content}, so take it out first.`,
      latex: `${content}\\left(${polyLatex(buildPoly(a, b, c))}\\right) = 0`,
    });
  }

  // Special case: no constant term → factor out x.
  if (c === 0) {
    const info = quadraticRoots(a, b, 0);
    steps.push({
      note: 'There is no constant term, so $x$ is a common factor.',
      latex: `${outFactor > 1 ? outFactor : ''}x\\left(${binomLatex(a, b)}\\right) = 0`,
    });
    steps.push({
      note: 'Set each factor equal to zero.',
      latex: `x = 0 \\quad\\text{or}\\quad ${binomLatex(a, b)} = 0`,
    });
    steps.push({ note: 'Solve the linear factor.', latex: info.answerLatex });
    return done(std, 'Factorising', steps, info.answerLatex);
  }

  const disc = b * b - 4 * a * c;
  if (!isPerfectSquare(disc)) {
    steps.push({
      note: `For factorising we need two whole numbers that multiply to $ac = ${a * c}$ and add to $b = ${b}$. Here the discriminant $b^{2}-4ac = ${disc}$ is not a perfect square, so no such integers exist.`,
      latex: `\\text{This quadratic does not factorise over the integers.}`,
      annotation: 'try Completing the square or the Formula',
    });
    return done(std, 'Factorising', steps, undefined);
  }

  const s = Math.round(Math.sqrt(disc));
  const p = (b + s) / 2;
  const q = (b - s) / 2;
  const ac = a * c;

  steps.push({
    note: 'Multiply the coefficient of $x^{2}$ by the constant term.',
    latex: `a \\times c = ${a} \\times ${par(c)} = ${ac}`,
  });
  steps.push({
    note: `Find two numbers that multiply to ${ac} and add to ${b}.`,
    latex: `${par(p)} \\times ${par(q)} = ${ac}, \\qquad ${p} + ${par(q)} = ${b}`,
    annotation: `they are ${p} and ${q}`,
  });
  steps.push({
    note: 'Split the middle term using those two numbers.',
    latex: `${coefTimes(a, 'x^{2}')}${connectTerm(new Rational(p), 1, 'x')}${connectTerm(new Rational(q), 1, 'x')}${signed(c)}`,
  });

  const grp = groupFactor(a, p, q, c);
  if (grp) {
    steps.push({
      note: 'Factor each pair, then take out the common bracket.',
      latex: `${coefTimes(grp.h1, 'x')}\\left(${binomLatex(grp.A, grp.B)}\\right) ${grp.g2 < 0 ? '-' : '+'} ${coefTimes(Math.abs(grp.g2), '')}\\left(${binomLatex(grp.A, grp.B)}\\right)`,
    });
    steps.push({
      note: 'Write it as a product of two brackets.',
      latex: `${outFactor > 1 ? outFactor : ''}\\left(${binomLatex(grp.A, grp.B)}\\right)\\left(${binomLatex(grp.h1, grp.g2)}\\right) = 0`,
    });
    steps.push({
      note: 'Set each bracket equal to zero and solve.',
      latex: `${binomLatex(grp.A, grp.B)} = 0 \\quad\\text{or}\\quad ${binomLatex(grp.h1, grp.g2)} = 0`,
    });
  }

  const info = quadraticRoots(a, b, c);
  steps.push({ note: 'Solve each linear equation.', latex: info.answerLatex });
  return done(std, 'Factorising', steps, info.answerLatex);
}

/** Group-factor a x² + p x + q x + c into (A x + B)(h1 x + g2); null if it fails. */
function groupFactor(
  a: number,
  p: number,
  q: number,
  c: number,
): { A: number; B: number; h1: number; g2: number } | null {
  const h1 = igcd(a, p);
  if (h1 === 0) return null;
  const A = a / h1;
  const B = p / h1;
  if (A === 0 || q % A !== 0) return null;
  const g2 = q / A;
  if (g2 * B !== c) return null;
  // verify expansion equals a x² + b x + c
  if (A * h1 !== a || A * g2 + B * h1 !== p + q || B * g2 !== c) return null;
  return { A, B, h1, g2 };
}

function buildPoly(a: number, b: number, c: number): Poly {
  const m = new Map<number, Rational>();
  m.set(2, new Rational(a));
  m.set(1, new Rational(b));
  m.set(0, new Rational(c));
  return new Poly(m);
}

/* --------------------------------------------------------------- the Solver */
function parseStandard(input: string): Poly {
  const eq = parseEquation(input, 'x');
  const std = toStandardForm(eq);
  if (std.degree() > 2) {
    throw new ParseError('That looks like a cubic or higher — this topic handles quadratics (up to x²).');
  }
  if (std.get(2).isZero()) {
    throw new ParseError('There is no x² term. Try the "Linear equations" topic instead.');
  }
  return std;
}

export const quadraticsSolver: Solver = {
  id: 'quadratics',
  title: 'Quadratic equations',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve ax² + bx + c = 0 — your choice of method.',
  placeholder: 'e.g.  2x^2 + 7x - 4 = 0',
  methods: [
    { id: 'factorise', name: 'Factorising', blurb: 'Split into two brackets. Neat when the roots are whole numbers or simple fractions.' },
    { id: 'complete-square', name: 'Completing the square', blurb: 'Rewrite as (x + p)² = q. Always works, and gives the turning point too.' },
    { id: 'formula', name: 'Quadratic formula', blurb: 'x = (−b ± √(b²−4ac)) / 2a. Always works, including surd and no-real-solution cases.' },
  ],
  defaultMethodId: 'factorise',
  detect(input) {
    if (/[;\n]/.test(input)) return 0;
    if (!/\^\s*2|²/.test(input)) return 0;
    if (/d\/dx|dy\/dx|∫|integrate|differentiate/i.test(input)) return 0;
    try {
      parseStandard(input);
      return 0.9;
    } catch {
      return 0;
    }
  },
  solve(input, methodId): SolveResult {
    let std: Poly;
    try {
      std = parseStandard(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that quadratic.' };
    }
    try {
      if (methodId === 'complete-square') return solveByCompletingSquare(std);
      if (methodId === 'formula') return solveByFormula(std);
      return solveByFactorising(std);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong solving that.' };
    }
  },
};
