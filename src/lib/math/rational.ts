/**
 * Exact rational arithmetic. Everything the engine computes stays exact
 * (no floating-point drift), so working-out lines are always correct —
 * e.g. completing the square produces true fractions, not 0.6666667.
 */

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export class Rational {
  readonly n: number; // numerator (carries the sign)
  readonly d: number; // denominator, always > 0

  constructor(n: number, d = 1) {
    if (d === 0) throw new Error('Rational: division by zero');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      throw new Error('Rational: use Rational.parse / fromDecimal for non-integers');
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }

  static int(n: number): Rational {
    return new Rational(n, 1);
  }

  /**
   * Parse an integer, decimal, or "a/b" token (optional leading sign).
   *
   * Strict on purpose. `parseInt` stops at the first character it does not
   * understand and reports success, so "3^2" used to come back as 3 — which
   * turned "x² = 3² + 4²" into x² = 7 and produced a confident √7 instead of
   * 5. Anything that is not wholly a number has to be an error.
   */
  static parse(tokenRaw: string): Rational {
    let token = tokenRaw.trim();
    let sign = 1;
    if (token.startsWith('-')) {
      sign = -1;
      token = token.slice(1);
    } else if (token.startsWith('+')) {
      token = token.slice(1);
    }
    if (token === '') throw new Error(`Rational.parse: empty token`);

    const DIGITS = /^\d+$/;
    const DECIMAL = /^\d*\.\d+$|^\d+\.\d*$/;

    if (token.includes('/')) {
      const [a, b, ...rest] = token.split('/');
      if (rest.length > 0 || !DIGITS.test(a) || !DIGITS.test(b)) {
        throw new Error(`Rational.parse: "${tokenRaw}" is not a fraction`);
      }
      return new Rational(sign * parseInt(a, 10), parseInt(b, 10));
    }
    if (token.includes('.')) {
      if (!DECIMAL.test(token)) throw new Error(`Rational.parse: "${tokenRaw}" is not a number`);
      const [i, f] = token.split('.');
      const den = Math.pow(10, f.length);
      const num = (parseInt(i || '0', 10) || 0) * den + parseInt(f || '0', 10);
      return new Rational(sign * num, den);
    }
    if (!DIGITS.test(token)) throw new Error(`Rational.parse: "${tokenRaw}" is not a number`);
    return new Rational(sign * parseInt(token, 10), 1);
  }

  static fromDecimal(x: number): Rational {
    return Rational.parse(String(x));
  }

  add(o: Rational): Rational {
    return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Rational): Rational {
    return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Rational): Rational {
    return new Rational(this.n * o.n, this.d * o.d);
  }
  div(o: Rational): Rational {
    if (o.n === 0) throw new Error('Rational: division by zero');
    return new Rational(this.n * o.d, this.d * o.n);
  }
  neg(): Rational {
    return new Rational(-this.n, this.d);
  }
  abs(): Rational {
    return new Rational(Math.abs(this.n), this.d);
  }
  pow(k: number): Rational {
    if (!Number.isInteger(k)) throw new Error('Rational.pow: integer only');
    if (k < 0) return Rational.int(1).div(this.pow(-k));
    let r = Rational.int(1);
    for (let i = 0; i < k; i++) r = r.mul(this);
    return r;
  }

  isZero(): boolean {
    return this.n === 0;
  }
  isInt(): boolean {
    return this.d === 1;
  }
  isNeg(): boolean {
    return this.n < 0;
  }
  /** -1, 0, or 1 */
  sign(): number {
    return Math.sign(this.n);
  }
  cmp(o: Rational): number {
    return Math.sign(this.n * o.d - o.n * this.d);
  }
  eq(o: Rational): boolean {
    return this.n === o.n && this.d === o.d;
  }
  toNumber(): number {
    return this.n / this.d;
  }
}
