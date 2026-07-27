/**
 * Working out the arithmetic buried inside a question.
 *
 * Topics mix inside a single equation, not just across parts. `ln x = 5^2` is
 * a logarithm question with a power sitting in it, and every solver expects a
 * plain number where a value belongs — so the question was refused outright.
 *
 * This finds sub-expressions made only of numbers and operators and replaces
 * each with its value, leaving everything else untouched: `ln x = 5^2` becomes
 * `ln x = 25`, and `a = 3+4, b = 12` becomes `a = 7, b = 12`.
 *
 * It is deliberately **not** applied to every input. `234 × 56` is entirely
 * numeric, and evaluating it would answer the question instead of working it
 * out. So callers use this only as a second reading, after the question as
 * written has failed. That is not enough on its own to make it safe: a
 * question that *correctly* fails must not be turned into a confident wrong
 * answer either, which is what the boundary rules below are for.
 */

/**
 * A run of numbers joined by operators, which must be a whole operand.
 *
 * The boundaries are the important part. In `x^3 - 1 = 0` a context-free
 * pattern happily matches `3 - 1`, where the `3` is the *exponent* of x and
 * the `- 1` is a separate term — folding it rewrote the question as
 * `x^2 = 0` and answered x = 0 for a cubic whose root is 1. So a match may
 * not begin straight after a `^` or a letter (it would be part of a power or
 * an implicit product), and may not end straight before one.
 *
 * Brackets are excluded too: in `log2(4^2)` only `4^2` should be worked out,
 * and a pattern reaching for the brackets would either swallow the closing
 * one or strip the brackets the log solver needs.
 */
const NUMERIC = /(?<![\^\w.])\d[\d.]*(?:\s*[+\-*/^×÷]\s*\d[\d.]*)+(?![\w.])/g;

/** A sub-expression is only worth replacing if it does something. */
const HAS_OPERATOR = /[+\-*/^×÷]/;

/**
 * Evaluate a numeric expression with the usual precedence. Returns null for
 * anything it cannot read, so a bad match simply leaves the text alone.
 */
export function evaluate(src: string): number | null {
  const tokens = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!/^[\d.+\-*/^()]+$/.test(tokens)) return null;

  let i = 0;
  const peek = () => tokens[i];
  const eat = (c: string) => (tokens[i] === c ? (i++, true) : false);

  // expression := term (('+'|'-') term)*
  function expression(): number | null {
    let left = term();
    if (left === null) return null;
    for (;;) {
      if (eat('+')) {
        const r = term();
        if (r === null) return null;
        left += r;
      } else if (eat('-')) {
        const r = term();
        if (r === null) return null;
        left -= r;
      } else return left;
    }
  }

  // term := power (('*'|'/') power)*
  function term(): number | null {
    let left = power();
    if (left === null) return null;
    for (;;) {
      if (eat('*')) {
        const r = power();
        if (r === null) return null;
        left *= r;
      } else if (eat('/')) {
        const r = power();
        if (r === null || r === 0) return null; // division by zero is not a value
        left /= r;
      } else return left;
    }
  }

  // power := unary ('^' power)?   — right-associative, as in 2^3^2
  function power(): number | null {
    const base = unary();
    if (base === null) return null;
    if (eat('^')) {
      const exp = power();
      if (exp === null) return null;
      return Math.pow(base, exp);
    }
    return base;
  }

  function unary(): number | null {
    if (eat('-')) {
      const v = unary();
      return v === null ? null : -v;
    }
    if (eat('+')) return unary();
    return atom();
  }

  function atom(): number | null {
    if (eat('(')) {
      const v = expression();
      if (v === null || !eat(')')) return null;
      return v;
    }
    let j = i;
    while (j < tokens.length && /[\d.]/.test(tokens[j])) j++;
    if (j === i) return null;
    const n = Number(tokens.slice(i, j));
    i = j;
    return Number.isFinite(n) ? n : null;
  }

  const value = expression();
  if (value === null || i !== tokens.length || !Number.isFinite(value)) return null;
  void peek;
  return value;
}

/** Write a computed value back into the question without floating-point litter. */
function show(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Twelve figures is far more than any solver needs and clears the noise
  // left by binary floating point (0.30000000000000004 and friends).
  return String(Number(n.toPrecision(12)));
}

/**
 * Replace every purely numeric sub-expression with its value.
 * Returns the original string when there was nothing to work out.
 */
export function foldArithmetic(text: string): string {
  return text.replace(NUMERIC, (match) => {
    if (!HAS_OPERATOR.test(match)) return match;
    const value = evaluate(match);
    return value === null ? match : show(value);
  });
}

/** True when folding would actually change the question. */
export function hasArithmetic(text: string): boolean {
  return foldArithmetic(text) !== text;
}
