import { Rational } from '../../lib/math/rational';
import { Poly, detectVariable } from '../../lib/math/parse';
import { polyLatex, rl, rlPlain } from '../../lib/math/format';
import { fmt } from '../../lib/math/num';
import { realRoots } from '../../lib/math/roots';
import { parseExpr, toLatex, ExprError } from '../../lib/math/expr';
import { exprToPolyFrac, polyAscii, ExpandError, type PolyFrac } from '../../lib/math/expand';
import { linearSolver } from './linear';
import { quadraticsSolver, quadraticRoots } from '../quadratics/index';
import { candidates, syntheticDivide, evaluate } from './polynomials';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Term collecting — the general case the shape-matching solvers can't reach.
 *
 * `linear.ts` parses a sum of monomials: no brackets. So `3x + 5 = x + 11`
 * works, and `2(x + 3) = 3(x - 1)` — the same technique, one bracket later —
 * does not parse at all. Nor do products of factors (`(x+1)(x-1) = x+3`,
 * `x(x+2) = x+6`), nor a fraction with x underneath (`3/(x+1) = 2/(x-1)`,
 * `x + 1/x = 3`). None of that is a different topic; it's the same collecting
 * a student already does, just written with more structure around it.
 *
 * The fix is to stop parsing a sum of monomials and instead parse a ratio of
 * two polynomials (a `PolyFrac`, from `lib/math/expand.ts`) built out of
 * `expr.ts`'s already-tested bracket/implicit-multiplication parser. Brackets
 * expand by ordinary polynomial multiplication; a fraction with x underneath
 * clears by cross-multiplying the two ratios. Either way the result is one
 * polynomial equation in standard form — which is exactly what `linear.ts`
 * and `quadratics/index.ts` already know how to teach. So this solver's own
 * job is small: expand or clear fractions, narrate that one move, and hand
 * the tidied equation to whichever of them fits — reusing their balancing,
 * factorising and formula working rather than re-deriving it.
 *
 * Registered below every solver that recognises a specific shape, so a
 * question that already has a topic keeps the working written for it. This
 * one only takes what would otherwise fall through.
 */

const LINEAR_IDS = new Set(linearSolver.methods.map((m) => m.id));
const QUAD_IDS = new Set(quadraticsSolver.methods.map((m) => m.id));

/* ------------------------------------------------------------- reading it in */

interface Sides {
  variable: string;
  lhsLatex: string;
  rhsLatex: string;
  lhs: PolyFrac;
  rhs: PolyFrac;
  hadBrackets: boolean;
}

function readSides(raw: string): Sides | null {
  const text = raw.trim();
  if (/[;\n]/.test(text)) return null; // two equations at once → simultaneous
  const parts = text.split('=');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;

  const variable = detectVariable(text);
  try {
    const lhsExpr = parseExpr(parts[0]);
    const rhsExpr = parseExpr(parts[1]);
    const lhs = exprToPolyFrac(lhsExpr, variable);
    const rhs = exprToPolyFrac(rhsExpr, variable);
    if (lhs.den.isZeroPoly() || rhs.den.isZeroPoly()) return null; // dividing by literal 0
    return {
      variable,
      lhsLatex: toLatex(lhsExpr),
      rhsLatex: toLatex(rhsExpr),
      lhs,
      rhs,
      hadBrackets: /\(/.test(text),
    };
  } catch (e) {
    if (e instanceof ExprError || e instanceof ExpandError) return null;
    throw e;
  }
}

/** Where the original equation is undefined — every value here is excluded. */
function exclusionsFor(sides: Sides): number[] {
  const vals: number[] = [];
  if (sides.lhs.den.degree() > 0) vals.push(...realRoots(sides.lhs.den));
  if (sides.rhs.den.degree() > 0) vals.push(...realRoots(sides.rhs.den));
  return [...new Set(vals.map((v) => Math.round(v * 1e9) / 1e9))];
}

/* -------------------------------------------------------------- degree ≥ 3 */

/** Peel rational roots one at a time until degree ≤ 2 remains, or give up. */
function peelToQuadratic(std: Poly): { roots: Rational[]; remaining: Poly; steps: Step[] } | null {
  let current = std;
  const roots: Rational[] = [];
  const steps: Step[] = [];
  let guard = 0;
  while (current.degree() > 2 && guard++ < 6) {
    const root = candidates(current).find((r) => evaluate(current, r).isZero());
    if (!root) return null;
    const { quotient } = syntheticDivide(current, root);
    steps.push({
      note: `Test whether $x = ${rl(root)}$ is a root: substituting it in gives zero, so $(x ${root.isNeg() ? '+' : '-'} ${rl(root.abs())})$ is a factor.`,
      latex: `${polyLatex(current)} = 0`,
      annotation: `x = ${rlPlain(root)} is a root`,
    });
    roots.push(root);
    current = quotient;
    steps.push({ note: 'Divide by that factor to bring the degree down.', latex: `${polyLatex(current)} = 0` });
  }
  return current.degree() > 2 ? null : { roots, remaining: current, steps };
}

function integerAbc(std: Poly): { a: number; b: number; c: number } {
  const g = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  };
  const lcm = (a: number, b: number): number => (a * b) / g(a, b);
  const ra = std.get(2);
  const rb = std.get(1);
  const rc = std.get(0);
  const L = lcm(lcm(ra.d, rb.d), rc.d);
  return { a: ra.n * (L / ra.d), b: rb.n * (L / rb.d), c: rc.n * (L / rc.d) };
}

/* --------------------------------------------------------------- assembly */

function identityOrContradiction(combined: Poly, exclusions: number[]): Step {
  if (!combined.isZeroPoly()) {
    return { note: 'The two sides can never be equal, whatever x is — there is no solution.', latex: '\\text{No solution}' };
  }
  const caveat = exclusions.length ? ` (except $x = ${exclusions.map((v) => fmt(v)).join(', ')}$, where the original is undefined)` : '';
  return {
    note: `Both sides are identical, so every value of $x$ works${caveat}.`,
    latex: '\\text{Infinitely many solutions}',
  };
}

/** Numeric roots of `combined`, with anything the domain excludes filtered out. */
function surviving(combined: Poly, exclusions: number[]): { kept: number[]; rejected: number[] } {
  const all = realRoots(combined);
  const kept = all.filter((v) => !exclusions.some((e) => Math.abs(e - v) < 1e-6));
  return { kept, rejected: all.filter((v) => !kept.includes(v)) };
}

function exclusionStep(rejected: number[]): Step {
  return {
    note: `$x = ${rejected.map((v) => fmt(v)).join(', ')}$ ${rejected.length > 1 ? 'make' : 'makes'} a denominator zero in the original equation, so ${rejected.length > 1 ? 'those are' : 'that is'} rejected even though the algebra produced ${rejected.length > 1 ? 'them' : 'it'}.`,
    latex: `x \\neq ${rejected.map((v) => fmt(v)).join(', ')}`,
    annotation: 'extraneous',
  };
}

function finalAnswer(kept: number[], rejected: number[], fallback: string | undefined): { steps: Step[]; answerLatex: string | undefined } {
  if (rejected.length === 0) return { steps: [], answerLatex: fallback };
  if (kept.length === 0) {
    return {
      steps: [
        exclusionStep(rejected),
        { note: 'Every solution the algebra found is excluded, so this equation has no valid solution.', latex: '\\text{No solution}' },
      ],
      answerLatex: undefined,
    };
  }
  return {
    steps: [exclusionStep(rejected)],
    answerLatex: kept.map((v) => `x = ${fmt(v)}`).join(', \\quad '),
  };
}

/* ---------------------------------------------------------------- solver */

function solveImpl(input: string, methodId: string): SolveResult {
  const sides = readSides(input);
  if (!sides) {
    return {
      ok: false,
      error: 'Write an equation with one unknown, e.g.  2(x + 3) = 3(x - 1)  or  3/(x + 1) = 2/(x - 1).',
    };
  }
  const { lhs, rhs, lhsLatex, rhsLatex, hadBrackets } = sides;
  const headline = `Solve $${lhsLatex} = ${rhsLatex}$`;

  const hasVarDenominator = lhs.den.degree() > 0 || rhs.den.degree() > 0;
  const leftExpanded = lhs.num.mul(rhs.den);
  const rightExpanded = rhs.num.mul(lhs.den);
  const combined = leftExpanded.sub(rightExpanded);

  const steps: Step[] = [{ note: 'Write down the equation.', latex: `${lhsLatex} = ${rhsLatex}` }];
  if (hasVarDenominator) {
    steps.push({
      note: 'Multiply both sides by every denominator to clear the fractions, then expand and collect like terms.',
      latex: `${polyLatex(leftExpanded)} = ${polyLatex(rightExpanded)}`,
      annotation: 'clears the fractions',
    });
  } else if (hadBrackets) {
    steps.push({
      note: 'Expand the brackets on each side and collect like terms.',
      latex: `${polyLatex(leftExpanded)} = ${polyLatex(rightExpanded)}`,
    });
  }

  const exclusions = hasVarDenominator ? exclusionsFor(sides) : [];
  const deg = combined.degree();

  if (combined.isZeroPoly() || (deg === 0 && !combined.get(0).isZero())) {
    steps.push(identityOrContradiction(combined, exclusions));
    return { ok: true, solution: { headline, methodName: 'Term collecting', steps } };
  }

  if (deg === 1 || deg === 2) {
    const text = `${polyAscii(combined)} = 0`;
    let inner =
      deg === 1
        ? linearSolver.solve(text, LINEAR_IDS.has(methodId) ? methodId : linearSolver.defaultMethodId)
        : quadraticsSolver.solve(text, QUAD_IDS.has(methodId) ? methodId : quadraticsSolver.defaultMethodId);
    if (!inner.ok) return inner; // the standard form is always valid input, but stay honest if not
    // "Factorise" is a legitimate dead end on its own — it means "doesn't
    // factor nicely, try a different tab" — but there is no tab picker once
    // this has already chosen the method for the student, so a dead end here
    // has to be a signal to retry with the method that always finishes, not
    // the final answer.
    if (deg === 2 && !inner.solution.answerLatex && methodId !== 'formula') {
      inner = quadraticsSolver.solve(text, 'formula');
      if (!inner.ok) return inner;
    }
    steps.push(...inner.solution.steps);

    const { kept, rejected } = hasVarDenominator ? surviving(combined, exclusions) : { kept: [], rejected: [] };
    const filtered = finalAnswer(kept, rejected, inner.solution.answerLatex);
    steps.push(...filtered.steps);
    return {
      ok: true,
      solution: { headline, methodName: inner.solution.methodName, steps, answerLatex: filtered.answerLatex },
    };
  }

  // deg >= 3
  const peeled = peelToQuadratic(combined);
  if (!peeled) {
    return {
      ok: false,
      error: `That expands to a degree-${deg} equation with no rational root — beyond what this can factor exactly.`,
    };
  }
  steps.push(...peeled.steps);

  const roots = [...peeled.roots];
  if (peeled.remaining.degree() === 2) {
    const { a, b, c } = integerAbc(peeled.remaining);
    const info = quadraticRoots(a, b, c);
    steps.push({ note: 'What is left is a quadratic — solve it with the formula.', latex: info.answerLatex });
    roots.push(...info.numericRoots.map((n) => Rational.fromDecimal(Math.round(n * 1e9) / 1e9)));
  } else if (peeled.remaining.degree() === 1) {
    const r = peeled.remaining.get(0).neg().div(peeled.remaining.get(1));
    steps.push({ note: 'What is left is linear.', latex: `x = ${rl(r)}` });
    roots.push(r);
  }

  const fallback = roots.map((r) => `x = ${rl(r)}`).join(', \\quad ');
  const { kept, rejected } = hasVarDenominator ? surviving(combined, exclusions) : { kept: [], rejected: [] };
  const filtered = finalAnswer(kept, rejected, fallback);
  steps.push(...filtered.steps);
  return {
    ok: true,
    solution: { headline, methodName: 'Factor theorem', steps, answerLatex: filtered.answerLatex },
  };
}

export const collectSolver: Solver = {
  id: 'collect',
  title: 'Term collecting',
  subjects: ['General', 'Methods', 'Specialist'],
  blurb: 'Expand brackets or clear fractions with x on both sides, then collect like terms.',
  placeholder: 'e.g.  2(x + 3) = 3(x - 1)   or   3/(x + 1) = 2/(x - 1)',
  methods: [...linearSolver.methods, ...quadraticsSolver.methods],
  defaultMethodId: linearSolver.defaultMethodId,
  detect(input) {
    if (!readSides(input)) return 0;
    try {
      const r = solveImpl(input, linearSolver.defaultMethodId);
      return r.ok ? 0.65 : 0;
    } catch {
      return 0;
    }
  },
  solve: solveImpl,
};
