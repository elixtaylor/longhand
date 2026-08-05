import {
  parseExpr,
  toLatex,
  evaluateExpr,
  type Expr,
} from '../../lib/math/expr';
import { exprToPolyFrac, numericSolutionsOf } from '../../lib/math/expand';
import { Poly } from '../../lib/math/parse';
import { Rational } from '../../lib/math/rational';
import { fmt } from '../../lib/math/num';
import { collectSolver } from './collect';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Equations where x is wrapped by the same function more than once —
 * `sqrt(x+1) = x`, `ln(x) + ln(x+1) = 2`, `2^x = 3^x` — none of which are
 * "term collecting" in the algebraic sense `collect.ts` handles, because a
 * function is in the way. Each has a legitimate identity that removes the
 * repetition — squaring both sides, combining logarithms, taking logarithms
 * of an exponential equation — after which what's left really is ordinary
 * algebra, handed to `collect.ts` to finish.
 *
 * Squaring is not reversible (it can manufacture a solution that never
 * satisfied the original, e.g. squaring turns "x = −3" into a true statement
 * about x² even though −3 doesn't satisfy "sqrt(...) = x" for a positive
 * root), so every candidate is checked against the ORIGINAL equation before
 * being reported, and silently dropped if it fails the check.
 */

/** Split `a ± b ± c…` at top level only — brackets are not looked inside. */
function splitTopLevel(text: string): { text: string; sign: 1 | -1 }[] {
  const out: { text: string; sign: 1 | -1 }[] = [];
  let depth = 0;
  let start = 0;
  let sign: 1 | -1 = 1;
  const flush = (end: number) => {
    const piece = text.slice(start, end).trim();
    if (piece) out.push({ text: piece, sign });
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && (c === '+' || c === '-') && i > 0) {
      flush(i);
      sign = c === '+' ? 1 : -1;
      start = i + 1;
    }
  }
  flush(text.length);
  return out;
}

/** The inner text if `text` is exactly one `name(...)` call, nothing else. */
function wholeCall(text: string, name: string): string | null {
  const s = text.trim();
  const re = new RegExp(`^${name}\\s*\\(`, 'i');
  const m = re.exec(s);
  if (!m || !s.endsWith(')')) return null;
  let depth = 0;
  for (let i = m[0].length - 1; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0)
        return i === s.length - 1 ? s.slice(m[0].length, i) : null;
    }
  }
  return null;
}

function splitEquation(input: string): [string, string] | null {
  if (/[;\n]/.test(input)) return null;
  const parts = input.split('=');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
  return [parts[0], parts[1]];
}

/** Candidate x-values out of "x = …, \quad x = …". */
function verifyAgainst(original: [string, string], x: number): boolean {
  try {
    const a = evaluateExpr(parseExpr(original[0]), { x });
    const b = evaluateExpr(parseExpr(original[1]), { x });
    return (
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ sqrt */

/** `sqrt(A) = sqrt(B)` or `sqrt(A) = (anything)`: square once. */
function trySqrt(
  sides: [string, string],
): { text: string; note: string; before: string } | null {
  for (const [sq, other] of [sides, [sides[1], sides[0]] as [string, string]]) {
    const inner = wholeCall(sq, 'sqrt') ?? wholeCall(sq, '√');
    if (inner === null) continue;
    const otherSqrt = wholeCall(other, 'sqrt');
    const rhs = otherSqrt !== null ? otherSqrt : `(${other})^2`;
    return {
      text: `${inner} = ${rhs}`,
      note: 'Square both sides to undo the square root.',
      before: `\\sqrt{${toLatex(parseExpr(inner))}} = ${otherSqrt !== null ? `\\sqrt{${toLatex(parseExpr(otherSqrt))}}` : `\\left(${toLatex(parseExpr(other))}\\right)^{2}`}`,
    };
  }
  return null;
}

/* -------------------------------------------------------------------- ln */

/**
 * A sum of `ln(...)` terms (and only that) on one side, `k` on the other.
 *
 * $e^k$ is irrational in general, so this is solved with plain floating-point
 * arithmetic once the logs are combined — feeding an irrational constant into
 * the exact-rational pipeline the other solvers use isn't just unnecessary,
 * it breaks: that pipeline tries to represent the constant as an exact
 * fraction and the denominator it needs is astronomical.
 */
function tryLog(sides: [string, string]): {
  coeffs: number[];
  domain: string[];
  before: string;
  combinedArgument: string;
  exponent: number;
} | null {
  const one = new Poly(new Map([[0, Rational.int(1)]]), 'x');

  for (const [lnSide, kSide] of [
    sides,
    [sides[1], sides[0]] as [string, string],
  ]) {
    const terms = splitTopLevel(lnSide);
    const parsed = terms.map((t) => ({
      inner: wholeCall(t.text, 'ln'),
      sign: t.sign,
    }));
    if (parsed.length === 0 || parsed.some((t) => t.inner === null)) continue;

    let k: number;
    try {
      k = evaluateExpr(parseExpr(kSide));
    } catch {
      continue;
    }
    if (!Number.isFinite(k)) continue;

    let numerator: Poly;
    let denominator: Poly;
    try {
      const factors = parsed.map((t) => ({
        poly: exprToPolyFrac(parseExpr(t.inner as string), 'x'),
        sign: t.sign,
      }));
      if (factors.some((f) => f.poly.den.degree() > 0)) continue; // a log argument with x underneath — not attempted
      numerator = factors
        .filter((f) => f.sign === 1)
        .reduce((acc, f) => acc.mul(f.poly.num), one);
      denominator = factors
        .filter((f) => f.sign === -1)
        .reduce((acc, f) => acc.mul(f.poly.num), one);
    } catch {
      continue;
    }

    // The equation is now `numerator = e^k · denominator`. e^k is irrational
    // in general, so from here the coefficients are plain floats rather than
    // exact fractions — there is nothing exact left to preserve.
    const eK = Math.exp(k);
    const deg = Math.max(numerator.degree(), denominator.degree());
    const coeffs: number[] = [];
    for (let p = 0; p <= deg; p++)
      coeffs[p] =
        numerator.get(p).toNumber() - eK * denominator.get(p).toNumber();

    const beforeTerms = parsed
      .map(
        (t, i) =>
          `${i === 0 ? (t.sign < 0 ? '-' : '') : t.sign < 0 ? ' - ' : ' + '}\\ln\\left(${toLatex(parseExpr(t.inner as string))}\\right)`,
      )
      .join('');
    const numeratorTerms = parsed
      .filter((t) => t.sign === 1)
      .map((t) => `\\left(${toLatex(parseExpr(t.inner as string))}\\right)`);
    const denominatorTerms = parsed
      .filter((t) => t.sign === -1)
      .map((t) => `\\left(${toLatex(parseExpr(t.inner as string))}\\right)`);
    const product = (terms: string[]) =>
      terms.length === 0 ? '1' : terms.join(' \\cdot ');
    const combinedArgument = denominatorTerms.length
      ? `\\dfrac{${product(numeratorTerms)}}{${product(denominatorTerms)}}`
      : product(numeratorTerms);
    return {
      coeffs,
      domain: parsed.map((t) => t.inner as string),
      before: `${beforeTerms} = ${fmt(k)}`,
      combinedArgument,
      exponent: k,
    };
  }
  return null;
}

/* ------------------------------------------------------- polynomial in ln x */

/** Coefficients in ascending powers of u, where u = ln(x). */
type LogPolynomial = number[];

function trimLogPolynomial(coeffs: LogPolynomial): LogPolynomial {
  const out = [...coeffs];
  while (out.length > 1 && Math.abs(out[out.length - 1]) < 1e-12) out.pop();
  return out;
}

function addLogPolynomials(
  left: LogPolynomial,
  right: LogPolynomial,
  sign: 1 | -1 = 1,
): LogPolynomial {
  const length = Math.max(left.length, right.length);
  return Array.from(
    { length },
    (_, power) => (left[power] ?? 0) + sign * (right[power] ?? 0),
  );
}

function multiplyLogPolynomials(
  left: LogPolynomial,
  right: LogPolynomial,
): LogPolynomial {
  const out = new Array(left.length + right.length - 1).fill(0);
  left.forEach((a, i) =>
    right.forEach((b, j) => {
      out[i + j] += a * b;
    }),
  );
  return out;
}

function scaleLogPolynomial(
  polynomial: LogPolynomial,
  factor: number,
): LogPolynomial {
  return polynomial.map((coefficient) => coefficient * factor);
}

function powerLogPolynomial(
  base: LogPolynomial,
  exponent: number,
): LogPolynomial {
  let result: LogPolynomial = [1];
  for (let i = 0; i < exponent; i++)
    result = multiplyLogPolynomials(result, base);
  return result;
}

/**
 * Turn an expression into a polynomial in u = ln(x).
 *
 * Only an exact ln(x) node is treated as u. Other x-containing functions are
 * rejected rather than silently pretending they are constants. This lets the
 * solver handle `(ln x)^2 = 2 ln x + 3` and similar rearrangements while
 * leaving genuinely different transcendental equations to the numerical
 * fallback.
 */
function exprToLogPolynomial(expression: Expr): LogPolynomial | null {
  if (expression.t === 'fn') {
    if (
      expression.name === 'ln' &&
      expression.a.t === 'var' &&
      expression.a.name === 'x'
    )
      return [0, 1];

    // A function with no x is a legitimate numerical constant, for example
    // ln(e). Any function that contains x must be handled as a different
    // equation type and is therefore refused here.
    const value = evaluateExpr(expression);
    return Number.isFinite(value) ? [value] : null;
  }

  switch (expression.t) {
    case 'num':
      return [expression.v];
    case 'var': {
      // e and π are constants in the expression engine; x is the only
      // variable that can become part of ln(x).
      const value = evaluateExpr(expression);
      return Number.isFinite(value) ? [value] : null;
    }
    case 'neg': {
      const inner = exprToLogPolynomial(expression.a);
      return inner ? scaleLogPolynomial(inner, -1) : null;
    }
    case 'add':
    case 'sub': {
      const left = exprToLogPolynomial(expression.a);
      const right = exprToLogPolynomial(expression.b);
      return left && right
        ? addLogPolynomials(left, right, expression.t === 'add' ? 1 : -1)
        : null;
    }
    case 'mul': {
      const left = exprToLogPolynomial(expression.a);
      const right = exprToLogPolynomial(expression.b);
      return left && right ? multiplyLogPolynomials(left, right) : null;
    }
    case 'div': {
      const numerator = exprToLogPolynomial(expression.a);
      const denominator = exprToLogPolynomial(expression.b);
      // Dividing by a polynomial in u would make this a rational equation,
      // not a polynomial one. A non-zero constant denominator is safe.
      if (!numerator || !denominator || denominator.length !== 1) return null;
      if (Math.abs(denominator[0]) < 1e-12) return null;
      return scaleLogPolynomial(numerator, 1 / denominator[0]);
    }
    case 'pow': {
      const base = exprToLogPolynomial(expression.a);
      const exponent = evaluateExpr(expression.b);
      if (
        !base ||
        !Number.isSafeInteger(exponent) ||
        exponent < 0 ||
        exponent > 32
      )
        return null;
      return powerLogPolynomial(base, exponent);
    }
  }
}

/** Print a polynomial in a named variable, omitting zero terms cleanly. */
function polynomialLatex(
  coefficients: LogPolynomial,
  variable: string,
): string {
  const terms: string[] = [];
  const trimmed = trimLogPolynomial(coefficients);
  for (let power = trimmed.length - 1; power >= 0; power--) {
    const coefficient = trimmed[power] ?? 0;
    if (Math.abs(coefficient) < 1e-12) continue;
    const magnitude = Math.abs(coefficient);
    const variablePart =
      power === 0 ? '' : power === 1 ? variable : `${variable}^{${power}}`;
    const body =
      power === 0
        ? fmt(magnitude, 6)
        : Math.abs(magnitude - 1) < 1e-12
          ? variablePart
          : `${fmt(magnitude, 6)}${variablePart}`;
    if (terms.length === 0) terms.push(coefficient < 0 ? `-${body}` : body);
    else terms.push(coefficient < 0 ? `- ${body}` : `+ ${body}`);
  }
  return terms.length ? terms.join(' ') : '0';
}

function tryLogPolynomial(sides: [string, string]): {
  coefficients: LogPolynomial;
  left: LogPolynomial;
  right: LogPolynomial;
} | null {
  let leftExpr: Expr;
  let rightExpr: Expr;
  try {
    leftExpr = parseExpr(sides[0]);
    rightExpr = parseExpr(sides[1]);
  } catch {
    return null;
  }
  const left = exprToLogPolynomial(leftExpr);
  const right = exprToLogPolynomial(rightExpr);
  if (!left || !right) return null;
  const coefficients = trimLogPolynomial(addLogPolynomials(left, right, -1));
  // A genuine equation in ln(x) needs at least a linear term. Identities and
  // constant-only equations belong to the general equation fallback.
  if (coefficients.length <= 1) return null;
  return { coefficients, left, right };
}

function trimCoefficients(coeffs: number[]): number[] {
  const out = [...coeffs];
  while (out.length > 1 && Math.abs(out[out.length - 1]) < 1e-12) out.pop();
  return out;
}

function polynomialValue(coeffs: number[], x: number): number {
  let value = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) value = value * x + coeffs[i];
  return value;
}

function addNumericRoot(roots: number[], candidate: number): void {
  if (!Number.isFinite(candidate)) return;
  if (roots.every((root) => Math.abs(root - candidate) > 1e-7))
    roots.push(candidate);
}

function bisectPolynomial(
  coeffs: number[],
  left: number,
  right: number,
): number {
  let a = left;
  let b = right;
  let fa = polynomialValue(coeffs, a);
  for (let i = 0; i < 90; i++) {
    const middle = (a + b) / 2;
    const fm = polynomialValue(coeffs, middle);
    if (!Number.isFinite(fm)) return middle;
    if (Math.abs(fm) < 1e-12) return middle;
    if (fa * fm <= 0) b = middle;
    else {
      a = middle;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/** Find all real roots of a float-coefficient polynomial by its turning points. */
function polynomialRoots(input: number[]): number[] {
  const coeffs = trimCoefficients(input);
  const degree = coeffs.length - 1;
  if (degree <= 0) return [];
  if (degree === 1) return [-coeffs[0] / coeffs[1]];
  if (degree === 2) {
    const [c, b, a] = coeffs;
    const disc = b * b - 4 * a * c;
    if (disc < -1e-9) return [];
    const s = Math.sqrt(Math.max(disc, 0));
    return disc < 1e-9
      ? [-b / (2 * a)]
      : [(-b + s) / (2 * a), (-b - s) / (2 * a)];
  }

  const leading = coeffs[degree];
  const bound = Math.min(
    1e6,
    1 + Math.max(...coeffs.slice(0, degree).map((c) => Math.abs(c / leading))),
  );
  const derivative = coeffs
    .slice(1)
    .map((coefficient, power) => coefficient * (power + 1));
  const turningPoints = polynomialRoots(derivative)
    .filter((x) => x > -bound && x < bound)
    .sort((a, b) => a - b);
  const points = [-bound, ...turningPoints, bound];
  const roots: number[] = [];
  const scale = Math.max(
    1,
    ...coeffs.map(
      (coefficient) => Math.abs(coefficient) * Math.pow(bound, degree),
    ),
  );
  for (const point of turningPoints) {
    if (Math.abs(polynomialValue(coeffs, point)) < 1e-8 * scale)
      addNumericRoot(roots, point);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const left = points[i];
    const right = points[i + 1];
    const leftValue = polynomialValue(coeffs, left);
    const rightValue = polynomialValue(coeffs, right);
    if (Math.abs(leftValue) < 1e-10) addNumericRoot(roots, left);
    if (leftValue * rightValue < 0)
      addNumericRoot(roots, bisectPolynomial(coeffs, left, right));
  }
  return roots.sort((a, b) => a - b);
}

/** Polynomial equation with plain floats — real roots only. */
function solveNumeric(coeffs: number[]): number[] {
  return polynomialRoots(coeffs);
}

/* ------------------------------------------------------- a^(px+q)=b^(rx+s) */

/** "x + 1", "x - 1", "2x", "-3" — a linear expression in x for display. */
function linTex(p: number, q: number): string {
  const xTerm = p === 0 ? '' : p === 1 ? 'x' : p === -1 ? '-x' : `${fmt(p)}x`;
  if (q === 0) return xTerm || '0';
  const sign = q > 0 ? '+' : '-';
  return xTerm ? `${xTerm} ${sign} ${fmt(Math.abs(q))}` : fmt(q);
}

function tryExponential(sides: [string, string]): {
  a: number;
  b: number;
  pL: number;
  qL: number;
  pR: number;
  qR: number;
  p: number;
  qa: number;
  qb: number;
} | null {
  let left, right;
  try {
    left = parseExpr(sides[0]);
    right = parseExpr(sides[1]);
  } catch {
    return null;
  }
  if (left.t !== 'pow' || right.t !== 'pow') return null;
  const a = evaluateExpr(left.a);
  const b = evaluateExpr(right.a);
  if (!(a > 0) || a === 1 || !(b > 0) || b === 1) return null;

  const atL = (x: number) => evaluateExpr(left.b, { x });
  const atR = (x: number) => evaluateExpr(right.b, { x });
  const qL = atL(0);
  const pL = atL(1) - qL;
  const qR = atR(0);
  const pR = atR(1) - qR;
  if (
    ![atL(2), atR(2)].every(
      (v, i) =>
        Math.abs(v - (2 * (i === 0 ? pL : pR) + (i === 0 ? qL : qR))) < 1e-9,
    )
  )
    return null;

  const p = pL * Math.log(a) - pR * Math.log(b);
  const qa = qL * Math.log(a);
  const qb = qR * Math.log(b);
  return { a, b, pL, qL, pR, qR, p, qa, qb };
}

/* ---------------------------------------------------------------- solver */

function solveImpl(input: string): SolveResult {
  const sides = splitEquation(input);
  if (!sides)
    return {
      ok: false,
      error:
        'Write an equation with one unknown, e.g.  sqrt(x + 1) = x  or  ln(x) + ln(x + 1) = 2.',
    };

  let headlineLatex: string;
  try {
    headlineLatex = `${toLatex(parseExpr(sides[0]))} = ${toLatex(parseExpr(sides[1]))}`;
  } catch {
    return { ok: false, error: 'Could not read that equation.' };
  }
  const headline = `Solve $${headlineLatex}$`;
  const steps: Step[] = [
    { note: 'Write down the equation.', latex: headlineLatex },
  ];

  const sqrt = trySqrt(sides);
  if (sqrt) {
    steps.push({
      note: sqrt.note,
      latex: sqrt.before,
      annotation: 'same to both sides',
    });
    // 'formula' always produces a full answer (unlike 'factorise', which can
    // legitimately stop at "doesn't factor" and expect a student to pick a
    // different tab) — there is no tab picker here, so the method used has to
    // be one that never dead-ends. If the equation turns out linear instead,
    // collect.ts falls back to its own linear default, which always works too.
    const inner = collectSolver.solve(sqrt.text, 'formula');
    if (!inner.ok) return { ok: false, error: inner.error };
    steps.push(...inner.solution.steps.slice(1));

    const candidates = numericSolutionsOf(sqrt.text);
    const valid = candidates.filter((x) => verifyAgainst(sides, x));
    const rejected = candidates.filter((x) => !valid.includes(x));
    if (rejected.length) {
      steps.push({
        note: `Squaring can invent solutions that don't satisfy the original equation. Checking each: $x = ${rejected.map((r) => fmt(r, 6)).join(', ')}$ ${rejected.length > 1 ? "don't" : "doesn't"} satisfy it, so ${rejected.length > 1 ? 'those are' : 'that is'} rejected.`,
        latex: valid.length
          ? `x = ${valid.map((v) => fmt(v, 6)).join(', \\quad x = ')}`
          : '\\text{No solution}',
        annotation: 'extraneous check',
      });
    }
    if (!valid.length && candidates.length) {
      return {
        ok: true,
        solution: { headline, methodName: 'Squaring both sides', steps },
      };
    }
    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Squaring both sides',
        steps,
        answerLatex: valid.length
          ? valid.map((v) => `x = ${fmt(v, 6)}`).join(', \\quad ')
          : inner.solution.answerLatex,
      },
    };
  }

  const log = tryLog(sides);
  if (log) {
    steps.push({
      note: 'Combine the logarithms using the log laws, then undo the remaining logarithm by raising e to the power of each side.',
      latex: log.before,
      annotation: 'log laws',
    });
    steps.push({
      note: 'Use the product and quotient laws to combine the logarithms into one logarithm.',
      latex: `\\ln\\left(${log.combinedArgument}\\right) = ${fmt(log.exponent, 6)}`,
      annotation: 'log laws',
    });
    steps.push({
      note: 'Raise e to both sides to undo the natural logarithm.',
      latex: `${log.combinedArgument} = e^{${fmt(log.exponent, 6)}}`,
      annotation: 'inverse operation',
    });
    const degree = log.coeffs.length - 1;
    const term = (c: number, p: number): string => {
      const varPart = p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`;
      if (p === 0) return fmt(c, 6);
      if (Math.abs(c - 1) < 1e-12) return varPart;
      if (Math.abs(c + 1) < 1e-12) return `-${varPart}`;
      return `${fmt(c, 6)}${varPart}`;
    };
    steps.push({
      note:
        degree <= 1
          ? 'What is left is linear.'
          : degree === 2
            ? 'What is left is a quadratic — solve it with the formula.'
            : `What is left is a degree-${degree} polynomial — solve it numerically.`,
      latex: `${log.coeffs
        .map(term)
        .reverse()
        .join(' + ')
        .replace(/\+ -/g, '- ')} = 0`,
    });

    const candidates = solveNumeric(log.coeffs);
    if (!candidates.length) {
      steps.push({
        note: 'That equation has no real solution.',
        latex: '\\text{No solution}',
      });
      return {
        ok: true,
        solution: { headline, methodName: 'Combining logarithms', steps },
      };
    }
    steps.push({
      note: 'Work it out.',
      latex: candidates.map((c) => `x = ${fmt(c, 6)}`).join(', \\quad '),
    });

    const inDomain = (x: number) =>
      log.domain.every((d) => evaluateExpr(parseExpr(d), { x }) > 0);
    const valid = candidates.filter(
      (x) => inDomain(x) && verifyAgainst(sides, x),
    );
    const rejected = candidates.filter((x) => !valid.includes(x));
    if (rejected.length) {
      steps.push({
        note: `A logarithm needs a positive argument. $x = ${rejected.map((r) => fmt(r, 6)).join(', ')}$ ${rejected.length > 1 ? "don't" : "doesn't"} keep every logarithm's argument positive, so ${rejected.length > 1 ? 'those are' : 'that is'} rejected.`,
        latex: valid.length
          ? `x = ${valid.map((v) => fmt(v, 6)).join(', \\quad x = ')}`
          : '\\text{No solution}',
        annotation: 'domain check',
      });
    }
    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Combining logarithms',
        steps,
        answerLatex: valid.length
          ? valid.map((v) => `x = ${fmt(v, 6)}`).join(', \\quad ')
          : undefined,
      },
    };
  }

  const logPolynomial = tryLogPolynomial(sides);
  if (logPolynomial) {
    const { coefficients, left, right } = logPolynomial;
    const degree = coefficients.length - 1;
    steps.push({
      note: 'Let $u = \\ln x$. This turns the repeated logarithm into one algebraic unknown.',
      latex: 'u = \\ln x',
      annotation: 'substitution',
    });
    steps.push({
      note: 'Substitute $u$ for every occurrence of $\\ln x$.',
      latex: `${polynomialLatex(left, 'u')} = ${polynomialLatex(right, 'u')}`,
    });
    steps.push({
      note:
        degree === 2
          ? 'Move everything to one side. This is now a quadratic in $u$.'
          : degree === 1
            ? 'Move everything to one side. This is now linear in $u$.'
            : `Move everything to one side. This is now a degree-${degree} polynomial in $u$.`,
      latex: `${polynomialLatex(coefficients, 'u')} = 0`,
    });

    const uRoots = solveNumeric(coefficients);
    if (!uRoots.length) {
      steps.push({
        note: 'That equation has no real values of $u$, so it has no real solution for $x$.',
        latex: '\\text{No real solution}',
      });
      return {
        ok: true,
        solution: { headline, methodName: 'Substituting u = ln x', steps },
      };
    }

    if (degree === 2) {
      const [c, b, a] = coefficients;
      steps.push({
        note: 'Solve the quadratic in $u$ with the quadratic formula.',
        latex: `u = \\dfrac{-(${fmt(b, 6)}) \\pm \\sqrt{(${fmt(b, 6)})^{2} - 4(${fmt(a, 6)})(${fmt(c, 6)})}}{2(${fmt(a, 6)})}`,
        annotation: 'quadratic formula',
      });
    } else {
      steps.push({
        note: 'Solve the resulting polynomial for its real values of $u$.',
      });
    }
    steps.push({
      note: 'The real values of $u$ are:',
      latex: uRoots
        .map((u) => `u = ${fmt(u, 6)}`)
        .join(' \\quad\\text{or}\\quad '),
    });

    const finiteRoots = uRoots
      .map((u) => ({ u, x: Math.exp(u) }))
      .filter(({ x }) => Number.isFinite(x) && x > 0)
      .filter(({ x }) => verifyAgainst(sides, x));
    if (!finiteRoots.length) {
      steps.push({
        note: 'Back-substitution produced no values in the domain of the original logarithm.',
        latex: '\\text{No real solution}',
        annotation: 'domain check',
      });
      return {
        ok: true,
        solution: { headline, methodName: 'Substituting u = ln x', steps },
      };
    }

    steps.push({
      note: 'Substitute the values of $u$ back into $u = \\ln x$.',
      latex: finiteRoots
        .map(({ u }) => `\\ln x = ${fmt(u, 6)}`)
        .join(' \\quad\\text{or}\\quad '),
    });
    steps.push({
      note: 'Raise $e$ to both sides to undo the natural logarithm.',
      latex: finiteRoots
        .map(({ u }) => `x = e^{${fmt(u, 6)}}`)
        .join(' \\quad\\text{or}\\quad '),
      annotation: 'inverse operation',
    });
    steps.push({
      note: 'Work out the positive values of $x$.',
      latex: finiteRoots
        .map(({ x }) => `x = ${fmt(x, 6)}`)
        .join(' \\quad\\text{or}\\quad '),
      annotation: 'solved',
    });

    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Substituting u = ln x',
        steps,
        answerLatex: finiteRoots
          .map(({ x }) => `x = ${fmt(x, 6)}`)
          .join(' \\quad\\text{or}\\quad '),
      },
    };
  }

  const exp = tryExponential(sides);
  if (exp) {
    const { a, b, pL, qL, pR, qR, p, qa, qb } = exp;
    if (Math.abs(p) < 1e-12) {
      const consistent = Math.abs(qa - qb) < 1e-9;
      steps.push({
        note: 'Take the natural logarithm of both sides, so the powers come down.',
        latex: `\\ln\\left(${toLatex(parseExpr(sides[0]))}\\right) = \\ln\\left(${toLatex(parseExpr(sides[1]))}\\right)`,
        annotation: 'same to both sides',
      });
      steps.push({
        note: consistent
          ? 'Both sides reduce to the same constant, whatever x is.'
          : 'The two sides can never be equal, whatever x is.',
        latex: consistent
          ? '\\text{Infinitely many solutions}'
          : '\\text{No solution}',
      });
      return {
        ok: true,
        solution: { headline, methodName: 'Taking logarithms', steps },
      };
    }
    const x = (qb - qa) / p;
    steps.push({
      note: 'Take the natural logarithm of both sides, then use the power law $\\ln(m^{n}) = n\\ln m$ to bring the powers down.',
      latex: `\\left(${linTex(pL, qL)}\\right)\\ln ${fmt(a)} = \\left(${linTex(pR, qR)}\\right)\\ln ${fmt(b)}`,
      annotation: 'power law',
    });
    steps.push({
      note: 'Expand the brackets and collect the x-terms on one side — this is now a linear equation in x.',
      latex: `${fmt(p, 6)}x = ${fmt(qb - qa, 6)}`,
    });
    steps.push({
      note: 'Divide to make x the subject.',
      latex: `x = \\dfrac{${fmt(qb - qa, 6)}}{${fmt(p, 6)}} = ${fmt(x, 6)}`,
      annotation: 'solved',
    });
    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Taking logarithms',
        steps,
        answerLatex: `x = ${fmt(x, 6)}`,
      },
    };
  }

  return {
    ok: false,
    error:
      'Write an equation like  sqrt(x + 1) = x,  ln(x) + ln(x + 1) = 2,  or  2^x = 3^x.',
  };
}

export const reduceSolver: Solver = {
  id: 'reduce',
  title: 'Reducing before solving',
  subjects: ['Methods', 'Specialist'],
  blurb:
    'Square out a root, combine logarithms, or take logs of an exponential — then solve what is left.',
  placeholder: 'e.g.  sqrt(x + 1) = x   or   ln(x) + ln(x + 1) = 2',
  methods: [
    {
      id: 'reduce',
      name: 'Reduce, then solve',
      blurb:
        'Apply one valid operation to both sides to remove the repeated function, then collect terms.',
    },
  ],
  defaultMethodId: 'reduce',
  detect(input) {
    try {
      return solveImpl(input).ok ? 0.68 : 0;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    return solveImpl(input);
  },
};
