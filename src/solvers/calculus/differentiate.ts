import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import {
  parseExpr,
  differentiate as diffExpr,
  simplify,
  toLatex,
  topRule,
  type Expr,
} from '../../lib/math/expr';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Strip the parts of a request that aren't the function itself.
 * Cue words must go before parsing — "differentiate" would otherwise tokenise
 * as a product of single-letter variables.
 */
function cleanFunction(input: string): string {
  return input
    .replace(/\bdifferentiate\b|\bderivative\b|\bof\b/gi, ' ')
    .replace(/with\s+respect\s+to\s+x|w\.?r\.?t\.?\s*x/gi, ' ')
    .replace(/d\/dx|dy\/dx/gi, ' ')
    .replace(/f\s*'\s*\(x\)\s*=?/gi, ' ')
    .replace(/f\s*\(x\)\s*=/gi, ' ')
    .replace(/y\s*=/gi, ' ')
    .trim()
    .replace(/^\((.*)\)$/s, '$1')
    .trim();
}

function parseFunction(input: string): Poly {
  const poly = parsePoly(cleanFunction(input), 'x');
  if (poly.isZeroPoly()) throw new ParseError('Enter a function of x to differentiate, e.g.  x^3 - 4x + 1');
  return poly;
}

/** d/dx of a polynomial, term by term. */
export function differentiate(poly: Poly): Poly {
  const m = new Map<number, Rational>();
  for (const { power, coeff } of poly.terms()) {
    if (power === 0) continue;
    m.set(power - 1, coeff.mul(Rational.int(power)));
  }
  return new Poly(m, poly.variable);
}

/** A standalone monomial with its sign, e.g. "3x^{2}", "-x", "5". */
function mono(coeff: Rational, power: number): string {
  if (power === 0) return coeffStr(coeff, true);
  const c = coeff.eq(Rational.int(1)) ? '' : coeff.eq(Rational.int(-1)) ? '-' : coeffStr(coeff, true);
  return `${c}${power === 1 ? 'x' : `x^{${power}}`}`;
}
function coeffStr(coeff: Rational, withSign: boolean): string {
  const s = coeff.isInt() ? String(coeff.n) : `\\frac{${coeff.n}}{${coeff.d}}`;
  return withSign ? s : s.replace('-', '');
}

/* --------------------------------------------------------------- power rule */
function byPowerRule(poly: Poly): SolveResult {
  const deriv = differentiate(poly);
  const steps: Step[] = [
    { note: 'Write the function.', latex: `f(x) = ${polyLatex(poly)}` },
    {
      note: 'Differentiate each term with the power rule: $\\dfrac{d}{dx}\\left(ax^{n}\\right) = n\\,ax^{\\,n-1}$.',
      latex: `\\dfrac{d}{dx}\\left(ax^{n}\\right) = n\\,ax^{\\,n-1}`,
    },
  ];

  for (const { power, coeff } of poly.terms()) {
    if (power === 0) {
      steps.push({
        note: 'The derivative of a constant is zero.',
        latex: `\\dfrac{d}{dx}\\left(${mono(coeff, 0)}\\right) = 0`,
      });
    } else {
      const nc = coeff.mul(Rational.int(power));
      steps.push({
        note: `Bring down the power ${power} and reduce the index by one.`,
        latex: `\\dfrac{d}{dx}\\left(${mono(coeff, power)}\\right) = ${mono(nc, power - 1)}`,
      });
    }
  }

  const answer = deriv.isZeroPoly() ? '0' : polyLatex(deriv);
  steps.push({ note: 'Collect the terms.', latex: `f'(x) = ${answer}`, annotation: 'derivative' });

  return {
    ok: true,
    solution: {
      headline: `Differentiate $${polyLatex(poly)}$`,
      methodName: 'Power rule',
      steps,
      answerLatex: `f'(x) = ${answer}`,
    },
  };
}

/* ---------------------------------------------------------- first principles */
// Bivariate polynomial in x and h, keyed "xpow,hpow".
type Bivar = Map<string, Rational>;
function addBivar(m: Bivar, xp: number, hp: number, c: Rational) {
  const key = `${xp},${hp}`;
  m.set(key, (m.get(key) ?? Rational.int(0)).add(c));
}
function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}
function bivarLatex(m: Bivar): string {
  const terms = [...m.entries()]
    .map(([key, c]) => {
      const [xp, hp] = key.split(',').map(Number);
      return { xp, hp, c };
    })
    .filter((t) => !t.c.isZero())
    .sort((a, b) => b.xp - a.xp || b.hp - a.hp);
  if (terms.length === 0) return '0';
  let out = '';
  terms.forEach((t, i) => {
    const neg = t.c.isNeg();
    const mag = t.c.abs();
    out += i === 0 ? (neg ? '-' : '') : neg ? ' - ' : ' + ';
    const coeff = mag.eq(Rational.int(1)) && (t.xp > 0 || t.hp > 0) ? '' : coeffStr(mag, false);
    const xPart = t.xp === 0 ? '' : t.xp === 1 ? 'x' : `x^{${t.xp}}`;
    const hPart = t.hp === 0 ? '' : t.hp === 1 ? 'h' : `h^{${t.hp}}`;
    out += `${coeff}${xPart}${hPart}` || '1';
  });
  return out;
}

function byFirstPrinciples(poly: Poly): SolveResult {
  // f(x + h)
  const fxh: Bivar = new Map();
  for (const { power: n, coeff: a } of poly.terms()) {
    for (let k = 0; k <= n; k++) {
      addBivar(fxh, n - k, k, a.mul(Rational.int(choose(n, k))));
    }
  }
  // f(x + h) − f(x): the h^0 terms are exactly f(x), so drop them.
  const diff: Bivar = new Map();
  for (const [key, c] of fxh) {
    const hp = Number(key.split(',')[1]);
    if (hp >= 1) diff.set(key, c);
  }
  // divide by h (lower every h power by one)
  const overH: Bivar = new Map();
  for (const [key, c] of diff) {
    const [xp, hp] = key.split(',').map(Number);
    addBivar(overH, xp, hp - 1, c);
  }
  const deriv = differentiate(poly);

  const steps: Step[] = [
    {
      note: 'Start from the definition of the derivative.',
      latex: `f'(x) = \\lim_{h \\to 0} \\dfrac{f(x+h) - f(x)}{h}`,
    },
    { note: 'Expand $f(x+h)$.', latex: `f(x+h) = ${bivarLatex(fxh)}` },
    {
      note: 'Subtract $f(x)$. The terms without an $h$ cancel.',
      latex: `f(x+h) - f(x) = ${bivarLatex(diff)}`,
    },
    {
      note: 'Every remaining term has a factor of $h$, so divide through by $h$.',
      latex: `\\dfrac{f(x+h) - f(x)}{h} = ${bivarLatex(overH)}`,
    },
    {
      note: 'Let $h \\to 0$: every term still containing $h$ vanishes.',
      latex: `f'(x) = ${deriv.isZeroPoly() ? '0' : polyLatex(deriv)}`,
      annotation: 'derivative',
    },
  ];

  return {
    ok: true,
    solution: {
      headline: `Differentiate $${polyLatex(poly)}$ from first principles`,
      methodName: 'First principles',
      steps,
      answerLatex: `f'(x) = ${deriv.isZeroPoly() ? '0' : polyLatex(deriv)}`,
    },
  };
}

/* ------------------------------------------- product / quotient / chain rules */
/**
 * General differentiation for anything beyond a plain polynomial — products,
 * quotients, compositions, and the trig/exp/log functions.
 */
function byRules(src: string): SolveResult {
  let e: Expr;
  try {
    e = parseExpr(cleanFunction(src));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not read that function.' };
  }

  let derivative: Expr;
  try {
    derivative = simplify(diffExpr(e));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not differentiate that.' };
  }

  const rule = topRule(e);
  const steps: Step[] = [{ note: 'Write the function.', latex: `f(x) = ${toLatex(e)}` }];

  // Name the rule, then show its parts before substituting.
  if (rule === 'product' && e.t === 'mul') {
    const u = e.a;
    const v = e.b;
    const du = simplify(diffExpr(u));
    const dv = simplify(diffExpr(v));
    steps.push({
      note: 'This is a product of two functions of $x$, so use the product rule.',
      latex: `\\dfrac{d}{dx}(uv) = u'v + uv'`,
      annotation: 'product rule',
    });
    steps.push({
      note: 'Identify the two parts and differentiate each.',
      latex: `u = ${toLatex(u)} \\;\\Rightarrow\\; u' = ${toLatex(du)}, \\qquad v = ${toLatex(v)} \\;\\Rightarrow\\; v' = ${toLatex(dv)}`,
    });
    steps.push({
      note: 'Substitute into the rule.',
      latex: `f'(x) = ${toLatex(du)} \\cdot ${toLatex(v)} + ${toLatex(u)} \\cdot ${toLatex(dv)}`,
    });
  } else if (rule === 'quotient' && e.t === 'div') {
    const u = e.a;
    const v = e.b;
    const du = simplify(diffExpr(u));
    const dv = simplify(diffExpr(v));
    steps.push({
      note: 'This is one function divided by another, so use the quotient rule.',
      latex: `\\dfrac{d}{dx}\\left(\\dfrac{u}{v}\\right) = \\dfrac{u'v - uv'}{v^{2}}`,
      annotation: 'quotient rule',
    });
    steps.push({
      note: 'Identify the top and bottom, and differentiate each.',
      latex: `u = ${toLatex(u)} \\;\\Rightarrow\\; u' = ${toLatex(du)}, \\qquad v = ${toLatex(v)} \\;\\Rightarrow\\; v' = ${toLatex(dv)}`,
    });
    steps.push({
      note: 'Substitute into the rule.',
      latex: `f'(x) = \\dfrac{${toLatex(du)} \\cdot ${toLatex(v)} - ${toLatex(u)} \\cdot ${toLatex(dv)}}{\\left(${toLatex(v)}\\right)^{2}}`,
    });
  } else if (rule === 'chain') {
    const inner = e.t === 'fn' ? e.a : e.t === 'pow' ? e.a : null;
    steps.push({
      note: 'This is a function inside another function, so use the chain rule.',
      latex: `\\dfrac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)`,
      annotation: 'chain rule',
    });
    if (inner) {
      const dInner = simplify(diffExpr(inner));
      steps.push({
        note: 'Differentiate the outside, keeping the inside unchanged, then multiply by the derivative of the inside.',
        latex: `\\text{inside: } u = ${toLatex(inner)} \\;\\Rightarrow\\; \\dfrac{du}{dx} = ${toLatex(dInner)}`,
      });
    }
  } else if (rule === 'sum') {
    steps.push({
      note: 'Differentiate each term separately — the derivative of a sum is the sum of the derivatives.',
      latex: `\\dfrac{d}{dx}\\left(u \\pm v\\right) = u' \\pm v'`,
    });
  } else if (rule === 'standard') {
    steps.push({
      note: 'Use the standard derivative for this function.',
      latex: `\\dfrac{d}{dx}\\sin x = \\cos x, \\quad \\dfrac{d}{dx}\\cos x = -\\sin x, \\quad \\dfrac{d}{dx}e^{x} = e^{x}, \\quad \\dfrac{d}{dx}\\ln x = \\dfrac{1}{x}`,
      annotation: 'standard results',
    });
  }

  steps.push({ note: 'Simplify.', latex: `f'(x) = ${toLatex(derivative)}`, annotation: 'derivative' });

  return {
    ok: true,
    solution: {
      headline: `Differentiate $${toLatex(e)}$`,
      methodName:
        rule === 'product'
          ? 'Product rule'
          : rule === 'quotient'
            ? 'Quotient rule'
            : rule === 'chain'
              ? 'Chain rule'
              : 'Standard rules',
      steps,
      answerLatex: `f'(x) = ${toLatex(derivative)}`,
    },
  };
}

/** Can the plain polynomial path handle this, or do we need the full engine? */
function isPlainPolynomial(src: string): boolean {
  try {
    const p = parsePoly(cleanFunction(src), 'x');
    return !p.isZeroPoly();
  } catch {
    return false;
  }
}

export const differentiationSolver: Solver = {
  id: 'differentiate',
  title: 'Differentiation',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Differentiate a polynomial in x.',
  placeholder: 'e.g.  x^3 - 4x^2 + 2x - 7',
  methods: [
    { id: 'power', name: 'Power rule', blurb: 'Bring the power down and subtract one, term by term. The everyday method.' },
    { id: 'rules', name: 'Product / quotient / chain', blurb: 'For products, quotients and compositions, including trig, e^x and ln x.' },
    { id: 'first-principles', name: 'First principles', blurb: 'Straight from the limit definition — what the power rule is built on.' },
  ],
  defaultMethodId: 'power',
  detect(input) {
    // Needs an explicit cue: a bare polynomial is ambiguous (solve? integrate?).
    return /d\/dx|dy\/dx|differentiate|f'\(x\)|derivative/i.test(input) ? 0.97 : 0;
  },
  solve(input, methodId): SolveResult {
    // Anything that isn't a plain polynomial needs the full expression engine.
    if (methodId === 'rules' || !isPlainPolynomial(input)) return byRules(input);

    let poly: Poly;
    try {
      poly = parseFunction(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that function.' };
    }
    return methodId === 'first-principles' ? byFirstPrinciples(poly) : byPowerRule(poly);
  },
};
