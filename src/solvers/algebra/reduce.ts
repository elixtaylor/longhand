import { parseExpr, toLatex, evaluateExpr } from '../../lib/math/expr';
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
      if (depth === 0) return i === s.length - 1 ? s.slice(m[0].length, i) : null;
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
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ sqrt */

/** `sqrt(A) = sqrt(B)` or `sqrt(A) = (anything)`: square once. */
function trySqrt(sides: [string, string]): { text: string; note: string; before: string } | null {
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
function tryLog(sides: [string, string]): { coeffs: number[]; domain: string[]; before: string } | null {
  const one = new Poly(new Map([[0, Rational.int(1)]]), 'x');

  for (const [lnSide, kSide] of [sides, [sides[1], sides[0]] as [string, string]]) {
    const terms = splitTopLevel(lnSide);
    const parsed = terms.map((t) => ({ inner: wholeCall(t.text, 'ln'), sign: t.sign }));
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
      const factors = parsed.map((t) => ({ poly: exprToPolyFrac(parseExpr(t.inner as string), 'x'), sign: t.sign }));
      if (factors.some((f) => f.poly.den.degree() > 0)) continue; // a log argument with x underneath — not attempted
      numerator = factors.filter((f) => f.sign === 1).reduce((acc, f) => acc.mul(f.poly.num), one);
      denominator = factors.filter((f) => f.sign === -1).reduce((acc, f) => acc.mul(f.poly.num), one);
    } catch {
      continue;
    }

    // The equation is now `numerator = e^k · denominator`. e^k is irrational
    // in general, so from here the coefficients are plain floats rather than
    // exact fractions — there is nothing exact left to preserve.
    const eK = Math.exp(k);
    const deg = Math.max(numerator.degree(), denominator.degree());
    const coeffs: number[] = [];
    for (let p = 0; p <= deg; p++) coeffs[p] = numerator.get(p).toNumber() - eK * denominator.get(p).toNumber();

    const beforeTerms = parsed
      .map(
        (t, i) =>
          `${i === 0 ? (t.sign < 0 ? '-' : '') : t.sign < 0 ? ' - ' : ' + '}\\ln\\left(${toLatex(parseExpr(t.inner as string))}\\right)`,
      )
      .join('');
    return { coeffs, domain: parsed.map((t) => t.inner as string), before: `${beforeTerms} = ${fmt(k)}` };
  }
  return null;
}

/** ax² + bx + c = 0 (or lower degree) with plain floats — real roots only. */
function solveNumeric(coeffs: number[]): number[] {
  const [c = 0, b = 0, a = 0] = coeffs;
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return [];
    return [-c / b];
  }
  const disc = b * b - 4 * a * c;
  if (disc < -1e-9) return [];
  const s = Math.sqrt(Math.max(disc, 0));
  return disc < 1e-9 ? [-b / (2 * a)] : [(-b + s) / (2 * a), (-b - s) / (2 * a)];
}

/* ------------------------------------------------------- a^(px+q)=b^(rx+s) */

/** "x + 1", "x - 1", "2x", "-3" — a linear expression in x for display. */
function linTex(p: number, q: number): string {
  const xTerm = p === 0 ? '' : p === 1 ? 'x' : p === -1 ? '-x' : `${fmt(p)}x`;
  if (q === 0) return xTerm || '0';
  const sign = q > 0 ? '+' : '-';
  return xTerm ? `${xTerm} ${sign} ${fmt(Math.abs(q))}` : fmt(q);
}

function tryExponential(
  sides: [string, string],
): { a: number; b: number; pL: number; qL: number; pR: number; qR: number; p: number; qa: number; qb: number } | null {
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
  if (![atL(2), atR(2)].every((v, i) => Math.abs(v - (2 * (i === 0 ? pL : pR) + (i === 0 ? qL : qR))) < 1e-9)) return null;

  const p = pL * Math.log(a) - pR * Math.log(b);
  const qa = qL * Math.log(a);
  const qb = qR * Math.log(b);
  return { a, b, pL, qL, pR, qR, p, qa, qb };
}

/* ---------------------------------------------------------------- solver */

function solveImpl(input: string): SolveResult {
  const sides = splitEquation(input);
  if (!sides) return { ok: false, error: 'Write an equation with one unknown, e.g.  sqrt(x + 1) = x  or  ln(x) + ln(x + 1) = 2.' };

  let headlineLatex: string;
  try {
    headlineLatex = `${toLatex(parseExpr(sides[0]))} = ${toLatex(parseExpr(sides[1]))}`;
  } catch {
    return { ok: false, error: 'Could not read that equation.' };
  }
  const headline = `Solve $${headlineLatex}$`;
  const steps: Step[] = [{ note: 'Write down the equation.', latex: headlineLatex }];

  const sqrt = trySqrt(sides);
  if (sqrt) {
    steps.push({ note: sqrt.note, latex: sqrt.before, annotation: 'same to both sides' });
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
        latex: valid.length ? `x = ${valid.map((v) => fmt(v, 6)).join(', \\quad x = ')}` : '\\text{No solution}',
        annotation: 'extraneous check',
      });
    }
    if (!valid.length && candidates.length) {
      return { ok: true, solution: { headline, methodName: 'Squaring both sides', steps } };
    }
    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Squaring both sides',
        steps,
        answerLatex: valid.length ? valid.map((v) => `x = ${fmt(v, 6)}`).join(', \\quad ') : inner.solution.answerLatex,
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
    const degree = log.coeffs.length - 1;
    const term = (c: number, p: number): string => {
      const varPart = p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`;
      if (p === 0) return fmt(c, 6);
      if (Math.abs(c - 1) < 1e-12) return varPart;
      if (Math.abs(c + 1) < 1e-12) return `-${varPart}`;
      return `${fmt(c, 6)}${varPart}`;
    };
    steps.push({
      note: degree <= 1 ? 'What is left is linear.' : 'What is left is a quadratic — solve it with the formula.',
      latex: `${log.coeffs
        .map(term)
        .reverse()
        .join(' + ')
        .replace(/\+ -/g, '- ')} = 0`,
    });

    const candidates = solveNumeric(log.coeffs);
    if (!candidates.length) {
      steps.push({ note: 'That equation has no real solution.', latex: '\\text{No solution}' });
      return { ok: true, solution: { headline, methodName: 'Combining logarithms', steps } };
    }
    steps.push({ note: 'Work it out.', latex: candidates.map((c) => `x = ${fmt(c, 6)}`).join(', \\quad ') });

    const inDomain = (x: number) => log.domain.every((d) => evaluateExpr(parseExpr(d), { x }) > 0);
    const valid = candidates.filter((x) => inDomain(x) && verifyAgainst(sides, x));
    const rejected = candidates.filter((x) => !valid.includes(x));
    if (rejected.length) {
      steps.push({
        note: `A logarithm needs a positive argument. $x = ${rejected.map((r) => fmt(r, 6)).join(', ')}$ ${rejected.length > 1 ? "don't" : "doesn't"} keep every logarithm's argument positive, so ${rejected.length > 1 ? 'those are' : 'that is'} rejected.`,
        latex: valid.length ? `x = ${valid.map((v) => fmt(v, 6)).join(', \\quad x = ')}` : '\\text{No solution}',
        annotation: 'domain check',
      });
    }
    return {
      ok: true,
      solution: {
        headline,
        methodName: 'Combining logarithms',
        steps,
        answerLatex: valid.length ? valid.map((v) => `x = ${fmt(v, 6)}`).join(', \\quad ') : undefined,
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
        note: consistent ? 'Both sides reduce to the same constant, whatever x is.' : 'The two sides can never be equal, whatever x is.',
        latex: consistent ? '\\text{Infinitely many solutions}' : '\\text{No solution}',
      });
      return { ok: true, solution: { headline, methodName: 'Taking logarithms', steps } };
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
    return { ok: true, solution: { headline, methodName: 'Taking logarithms', steps, answerLatex: `x = ${fmt(x, 6)}` } };
  }

  return { ok: false, error: 'Write an equation like  sqrt(x + 1) = x,  ln(x) + ln(x + 1) = 2,  or  2^x = 3^x.' };
}

export const reduceSolver: Solver = {
  id: 'reduce',
  title: 'Reducing before solving',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Square out a root, combine logarithms, or take logs of an exponential — then solve what is left.',
  placeholder: 'e.g.  sqrt(x + 1) = x   or   ln(x) + ln(x + 1) = 2',
  methods: [{ id: 'reduce', name: 'Reduce, then solve', blurb: 'Apply one valid operation to both sides to remove the repeated function, then collect terms.' }],
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
