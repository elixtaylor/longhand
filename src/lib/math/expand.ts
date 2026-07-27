import { Rational } from './rational';
import { Poly } from './parse';
import { parseExpr, evaluateExpr, type Expr } from './expr';
import { realRoots } from './roots';

/**
 * Turning a general expression into something the equation solvers can work
 * with — the actual mechanics of "term collecting".
 *
 * `parse.ts`'s `Poly` is exact and well tested, but its parser only reads a
 * sum of monomials: no brackets, no products of factors, no division. That is
 * enough for `3x + 4 = 10`, and nothing else — `2(x + 3) = 3(x - 1)` has a
 * bracket on both sides and doesn't parse at all.
 *
 * Rather than write a second bracket-aware parser, this reuses `expr.ts`'s
 * `Expr` tree — already tested, already handles brackets, implicit
 * multiplication and powers — and converts it into a ratio of two `Poly`s.
 * Division by an expression containing x (as in `3/(x+1) = 2/(x-1)`) is just
 * as valid a "layer" as division by a constant, so representing every
 * expression as num/den from the start means brackets, products, and
 * fractions with x underneath are all the same arithmetic rather than three
 * separate cases to anticipate.
 */

export class ExpandError extends Error {}

export class PolyFrac {
  constructor(
    readonly num: Poly,
    readonly den: Poly,
  ) {}

  static fromPoly(p: Poly): PolyFrac {
    return new PolyFrac(p, onePoly(p.variable));
  }

  add(o: PolyFrac): PolyFrac {
    return new PolyFrac(this.num.mul(o.den).add(o.num.mul(this.den)), this.den.mul(o.den));
  }
  sub(o: PolyFrac): PolyFrac {
    return new PolyFrac(this.num.mul(o.den).sub(o.num.mul(this.den)), this.den.mul(o.den));
  }
  mul(o: PolyFrac): PolyFrac {
    return new PolyFrac(this.num.mul(o.num), this.den.mul(o.den));
  }
  div(o: PolyFrac): PolyFrac {
    return new PolyFrac(this.num.mul(o.den), this.den.mul(o.num));
  }
  neg(): PolyFrac {
    return new PolyFrac(this.num.scale(Rational.int(-1)), this.den);
  }

  /** True once the denominator carries no x — nothing to clear. */
  isPolynomial(): boolean {
    return this.den.degree() === 0 && !this.den.isZeroPoly();
  }
}

function onePoly(variable: string): Poly {
  return new Poly(new Map([[0, Rational.int(1)]]), variable);
}
function constPoly(n: number, variable: string): Poly {
  return new Poly(new Map([[0, Rational.fromDecimal(n)]]), variable);
}
function varPoly(variable: string): Poly {
  return new Poly(new Map([[1, Rational.int(1)]]), variable);
}

/** Repeated multiplication — exponents here are always small literal integers. */
function polyPow(p: Poly, n: number): Poly {
  let out = onePoly(p.variable);
  for (let i = 0; i < n; i++) out = out.mul(p);
  return out;
}

/**
 * Convert an already-parsed expression into num/den `Poly`s over `variable`.
 * Refuses (rather than guesses) anything outside plain algebra: a function
 * call, a second letter, or a power whose index isn't a plain whole number —
 * those are `inverse.ts`'s territory when x appears once, and undefined
 * behaviour here if allowed through.
 */
export function exprToPolyFrac(e: Expr, variable: string): PolyFrac {
  switch (e.t) {
    case 'num':
      return PolyFrac.fromPoly(constPoly(e.v, variable));
    case 'var':
      if (e.name !== variable) throw new ExpandError(`"${e.name}" is a second unknown — this reads one variable at a time.`);
      return PolyFrac.fromPoly(varPoly(variable));
    case 'neg':
      return exprToPolyFrac(e.a, variable).neg();
    case 'add':
      return exprToPolyFrac(e.a, variable).add(exprToPolyFrac(e.b, variable));
    case 'sub':
      return exprToPolyFrac(e.a, variable).sub(exprToPolyFrac(e.b, variable));
    case 'mul':
      return exprToPolyFrac(e.a, variable).mul(exprToPolyFrac(e.b, variable));
    case 'div':
      return exprToPolyFrac(e.a, variable).div(exprToPolyFrac(e.b, variable));
    case 'pow': {
      const n = evaluateExpr(e.b);
      if (!Number.isInteger(n)) {
        throw new ExpandError('A power here needs a whole-number index to expand into ordinary algebra.');
      }
      const base = exprToPolyFrac(e.a, variable);
      if (n >= 0) return new PolyFrac(polyPow(base.num, n), polyPow(base.den, n));
      return new PolyFrac(polyPow(base.den, -n), polyPow(base.num, -n));
    }
    case 'fn':
      throw new ExpandError(`$${e.name}$ isn’t plain algebra — this collects terms, it doesn’t undo functions.`);
  }
}

/** Parse text into num/den `Poly`s in one step. */
export function parsePolyFrac(text: string, variable = 'x'): PolyFrac {
  return exprToPolyFrac(parseExpr(text), variable);
}

/**
 * The real numeric solutions of a plain "lhs = rhs" equation, computed
 * directly rather than by pattern-matching the LaTeX a solver prints.
 *
 * A fraction prints as `\frac{5}{2}`, a surd as `1 \pm \sqrt{2}` or
 * `\dfrac{1 \pm \sqrt{5}}{2}` depending on what happens to cancel, and a
 * regex chasing every format a solver might choose is exactly the kind of
 * silent gap that lets a rejected root slip back in as if it were genuine —
 * candidates are needed here to check against a domain or an original
 * equation, so getting the actual number matters more than reusing text.
 */
export function numericSolutionsOf(text: string, variable = 'x'): number[] {
  try {
    const [lhs, rhs] = text.split('=');
    if (rhs === undefined) return [];
    const a = exprToPolyFrac(parseExpr(lhs), variable);
    const b = exprToPolyFrac(parseExpr(rhs), variable);
    return realRoots(a.num.mul(b.den).sub(b.num.mul(a.den)));
  } catch {
    return [];
  }
}

/**
 * A `Poly` as plain-ASCII input text, e.g. `2x^2 + 7x - 4` or `1/2x - 3` —
 * the inverse of `parsePoly`, so an expanded result can be hand back to the
 * solvers that already know how to teach it (balancing, factorising, …)
 * without them ever needing to know brackets were involved.
 */
export function polyAscii(poly: Poly): string {
  const terms = poly.terms();
  if (terms.length === 0) return '0';
  let out = '';
  terms.forEach(({ power, coeff }, i) => {
    const neg = coeff.isNeg();
    const mag = coeff.abs();
    const magStr = mag.isInt() ? String(mag.n) : `${mag.n}/${mag.d}`;
    const coeffStr = power === 0 ? magStr : mag.eq(Rational.int(1)) ? '' : magStr;
    const varPart = power === 0 ? '' : power === 1 ? poly.variable : `${poly.variable}^${power}`;
    const body = coeffStr + varPart;
    out += i === 0 ? (neg ? `-${body}` : body) : neg ? ` - ${body}` : ` + ${body}`;
  });
  return out;
}
