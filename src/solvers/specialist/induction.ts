import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Proof by mathematical induction (SACE Stage 2 Specialist, Topic 1).
 *
 * The student types the summand; we derive the closed form ourselves and then
 * set out the standard three-part proof. Deriving it (rather than asking for
 * it) means the proof is always of a true statement.
 */

/** Interpolate the unique polynomial through the given points. */
function lagrange(xs: Rational[], ys: Rational[], variable: string): Poly {
  const one = new Poly(new Map([[0, Rational.int(1)]]), variable);
  let result = new Poly(new Map(), variable);
  for (let i = 0; i < xs.length; i++) {
    let term = one;
    let denom = Rational.int(1);
    for (let j = 0; j < xs.length; j++) {
      if (i === j) continue;
      term = term.mul(
        new Poly(
          new Map([
            [1, Rational.int(1)],
            [0, xs[j].neg()],
          ]),
          variable,
        ),
      );
      denom = denom.mul(xs[i].sub(xs[j]));
    }
    result = result.add(term.scale(ys[i].div(denom)));
  }
  return result;
}

/**
 * Closed form for Σ_{r=1}^{n} f(r).
 * The sum of a degree-d polynomial is a degree-(d+1) polynomial, so
 * interpolating through d+2 partial sums recovers it exactly.
 */
function closedForm(f: Poly, variable: string): Poly {
  const d = f.degree();
  const xs: Rational[] = [];
  const ys: Rational[] = [];
  let running = Rational.int(0);
  xs.push(Rational.int(0));
  ys.push(Rational.int(0)); // an empty sum is zero
  for (let n = 1; n <= d + 2; n++) {
    running = running.add(f.at(Rational.int(n)));
    xs.push(Rational.int(n));
    ys.push(running);
  }
  return lagrange(xs, ys, variable);
}

/** Lowest common multiple of every denominator, so we can show one fraction. */
function commonDenominator(p: Poly): number {
  let l = 1;
  for (const { coeff } of p.terms()) l = lcm(l, coeff.d);
  return l;
}
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Present F(n) as a single tidy fraction, factored where it comes out neatly. */
function displayClosed(F: Poly, v: string): string {
  const L = commonDenominator(F);
  const scaled = F.scale(Rational.int(L));

  // Pull out simple linear factors — this is what turns (n²+n)/2 into n(n+1)/2.
  const factors: string[] = [];
  let current = scaled;
  const lead = current.get(current.degree());
  let guard = 0;
  while (current.degree() > 0 && guard++ < 6) {
    const root = smallRationalRoot(current);
    if (root === null) break;
    factors.push(linearFactor(root, v));
    current = divideByRoot(current, root);
  }

  let body: string;
  if (factors.length > 0) {
    const rest = current.degree() > 0 ? `\\left(${polyLatex(current)}\\right)` : '';
    const constant = current.degree() === 0 ? current.get(0) : Rational.int(1);
    const c = constant.eq(Rational.int(1)) ? '' : String(constant.n);
    body = `${c}${groupFactors(factors)}${rest}`;
  } else {
    body = lead.eq(Rational.int(1)) ? polyLatex(scaled) : `\\left(${polyLatex(scaled)}\\right)`;
  }

  return L === 1 ? body : `\\dfrac{${body}}{${L}}`;
}

/** Collapse repeated factors into powers, so n·n reads as n². */
function groupFactors(factors: string[]): string {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const f of factors) {
    if (!counts.has(f)) order.push(f);
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return order.map((f) => (counts.get(f)! > 1 ? `${f}^{${counts.get(f)}}` : f)).join('');
}

function smallRationalRoot(p: Poly): Rational | null {
  const constant = p.get(0);
  const lead = p.get(p.degree());
  if (constant.isZero()) return Rational.int(0);
  const ps = divisorsOf(constant.n);
  const qs = divisorsOf(lead.n).filter((q) => q > 0);
  for (const q of qs) {
    for (const n of ps) {
      const cand = new Rational(n, q);
      if (p.at(cand).isZero()) return cand;
    }
  }
  return null;
}
function divisorsOf(n: number): number[] {
  const a = Math.abs(Math.round(n));
  const out: number[] = [];
  for (let i = 1; i <= a; i++) if (a % i === 0) out.push(i, -i);
  return out;
}
function linearFactor(root: Rational, v: string): string {
  if (root.isZero()) return v;
  if (root.isInt()) return root.isNeg() ? `(${v} + ${Math.abs(root.n)})` : `(${v} - ${root.n})`;
  // p/q root → (qv − p)
  return root.isNeg() ? `(${root.d}${v} + ${Math.abs(root.n)})` : `(${root.d}${v} - ${root.n})`;
}
/** Synthetic division by (x − root), assuming root really is a root. */
function divideByRoot(p: Poly, root: Rational): Poly {
  const deg = p.degree();
  const m = new Map<number, Rational>();
  let carry = Rational.int(0);
  for (let k = deg; k >= 1; k--) {
    const c = p.get(k).add(carry);
    m.set(k - 1, c);
    carry = c.mul(root);
  }
  const out = new Poly(m, p.variable);
  // (qx − p) form carries a factor of q, so scale it back out.
  return root.isInt() || root.isZero() ? out : out.scale(new Rational(1, root.d));
}

function parseSummand(input: string): Poly {
  const cleaned = input
    .replace(/prove|by induction|induction|the sum of|sum of|sum|series/gi, ' ')
    .replace(/from\s*r\s*=\s*1\s*to\s*n/gi, ' ')
    .replace(/_?\{?r\s*=\s*1\}?\^?\{?n\}?/gi, ' ')
    .replace(/Σ|∑/g, ' ')
    .trim();
  if (cleaned === '') throw new ParseError('Type the terms you are adding up, e.g.  sum r^2.');
  return parsePoly(cleaned, 'r');
}

export const inductionSolver: Solver = {
  id: 'induction',
  title: 'Mathematical induction',
  subjects: ['Specialist'],
  blurb: 'Prove a summation formula by induction, in the standard three steps.',
  placeholder: 'e.g.  sum r   or   sum r^2   or   sum 2r-1',
  methods: [
    { id: 'sum', name: 'Proof by induction', blurb: 'Base case, inductive assumption, inductive step — the standard structure.' },
  ],
  defaultMethodId: 'sum',
  detect(input) {
    if (!/sum|∑|Σ|induction/i.test(input)) return 0;
    try {
      parseSummand(input);
      return 0.96;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let f: Poly;
    try {
      f = parseSummand(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that sum.' };
    }
    if (f.isZeroPoly()) return { ok: false, error: 'Type the terms you are adding up, e.g.  sum r^2.' };
    if (f.degree() > 4) return { ok: false, error: 'This handles sums of polynomials up to degree 4.' };

    const F = closedForm(f, 'n');
    const summand = polyLatex(f);
    const closed = displayClosed(F, 'n');

    // The inductive step, done honestly as polynomials in k.
    const Fk = new Poly(F.coeffs, 'k');
    const fk1 = f.shift(Rational.int(1)); // f(k+1), as a polynomial in k
    const fk1InK = new Poly(fk1.coeffs, 'k');
    const lhsStep = Fk.add(fk1InK);
    const Fk1 = Fk.shift(Rational.int(1)); // F(k+1)
    const identical = lhsStep.equals(Fk1);

    if (!identical) {
      // Should never happen — the closed form is derived, not guessed.
      return { ok: false, error: 'Could not verify the closed form for that sum.' };
    }

    const L = commonDenominator(F);
    const scaledStep = lhsStep.scale(Rational.int(L));

    const steps: Step[] = [
      {
        note: 'State clearly what you are proving.',
        latex: `P(n): \\quad \\sum_{r=1}^{n} \\left(${polyLatex(new Poly(f.coeffs, 'r'))}\\right) = ${closed}`,
        annotation: 'the statement',
      },
      {
        note: 'Step 1 — the base case. Check the statement holds for $n = 1$.',
        latex: `\\text{LHS} = ${polyLatex(new Poly(f.coeffs, 'r'))}\\Big|_{r=1} = ${rat(f.at(Rational.int(1)))}, \\qquad \\text{RHS} = ${rat(F.at(Rational.int(1)))}`,
      },
      {
        note: 'The two sides agree, so $P(1)$ is true.',
        latex: `\\text{LHS} = \\text{RHS} \\;\\Rightarrow\\; P(1) \\text{ is true}`,
        annotation: 'base case ✓',
      },
      {
        note: 'Step 2 — the inductive assumption. Assume the statement is true for some $n = k$.',
        latex: `\\sum_{r=1}^{k} \\left(${polyLatex(new Poly(f.coeffs, 'r'))}\\right) = ${displayClosed(Fk, 'k')}`,
        annotation: 'assume for n = k',
      },
      {
        note: 'Step 3 — the inductive step. Show it follows for $n = k+1$. Split the last term off the sum.',
        latex: `\\sum_{r=1}^{k+1} = \\sum_{r=1}^{k} + \\left(${polyLatex(fk1InK).replace(/k/g, 'k')}\\right)`,
      },
      {
        note: 'Substitute the assumption for the first part.',
        latex: `= ${displayClosed(Fk, 'k')} + \\left(${polyLatex(fk1InK)}\\right)`,
      },
      {
        note: L === 1 ? 'Collect like terms.' : `Put everything over the common denominator ${L} and collect like terms.`,
        latex: L === 1 ? `= ${polyLatex(lhsStep)}` : `= \\dfrac{${polyLatex(scaledStep)}}{${L}}`,
      },
      {
        note: 'This is exactly the formula with $k+1$ in place of $n$.',
        latex: `= ${displayClosed(Fk1, 'k')} \\;=\\; ${closed.replace(/n/g, '(k+1)')}`,
        annotation: 'inductive step ✓',
      },
      {
        note: 'Conclusion.',
        latex: `P(1) \\text{ is true, and } P(k) \\Rightarrow P(k+1), \\text{ so by induction } P(n) \\text{ is true for all } n \\ge 1.`,
        annotation: 'QED',
      },
    ];

    return {
      ok: true,
      solution: {
        headline: `Prove $\\sum_{r=1}^{n} \\left(${summand.replace(/n/g, 'r')}\\right) = ${closed}$ by induction`,
        methodName: 'Proof by induction',
        steps,
        answerLatex: `\\sum_{r=1}^{n} \\left(${polyLatex(new Poly(f.coeffs, 'r'))}\\right) = ${closed}`,
      },
    };
  },
};

function rat(r: Rational): string {
  return r.isInt() ? String(r.n) : `\\frac{${r.n}}{${r.d}}`;
}
