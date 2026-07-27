import { parseExpr, toLatex, evaluateExpr, ExprError } from '../../lib/math/expr';
import { numericSolutionsOf } from '../../lib/math/expand';
import { fmt } from '../../lib/math/num';
import { linearSolver } from './linear';
import { inverseSolver } from './inverse';
import { collectSolver } from './collect';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Absolute value equations (SACE Stage 1/2 — |x − a| = b and |A| = |B|).
 *
 * Nothing else here handles `|...|` or `abs(...)` at all — this was a plain
 * hole, not an overlap with an existing topic. The technique is the standard
 * one: dropping the bars is only valid once the two cases it could have
 * come from are both written down, since |k| and |−k| are the same number.
 *
 * What is inside the bars is solved by handing the case equation to whichever
 * of the other equation solvers can take it — linear first (the common
 * case), then term collecting (brackets), then inverse operations (a
 * function wrapped round x) — rather than re-deriving that working here.
 */

/** Find a single `|...|` or `abs(...)` group and split off what's outside it. */
function extractAbs(text: string): { inner: string; before: string; after: string } | null {
  const fn = /abs\s*\(/i.exec(text);
  if (fn) {
    const start = fn.index + fn[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
      i++;
    }
    if (depth === 0) return { inner: text.slice(start, i - 1), before: text.slice(0, fn.index), after: text.slice(i) };
  }
  const first = text.indexOf('|');
  if (first === -1) return null;
  const second = text.indexOf('|', first + 1);
  if (second === -1) return null;
  return { inner: text.slice(first + 1, second), before: text.slice(0, first), after: text.slice(second + 1) };
}

interface Parsed {
  insideText: string;
  insideLatex: string;
  rhs:
    | { kind: 'const'; value: number }
    | { kind: 'abs'; text: string; latex: string }
    // A right-hand side with x in it, but not itself wrapped in bars — e.g.
    // |x+1| = 2x-1. Splitting into two cases still works, but unlike the
    // |A|=|B| case, a case's root isn't automatically valid: |A| can never be
    // negative, so a root that makes this side negative has to be rejected.
    | { kind: 'expr'; text: string; latex: string };
}

function parse(raw: string): Parsed | null {
  const text = raw.trim();
  if (!text.includes('=') || /[;\n]/.test(text)) return null;
  const [lhsRaw, rhsRaw, ...rest] = text.split('=');
  if (rest.length > 0 || rhsRaw === undefined) return null;

  const lhsAbs = extractAbs(lhsRaw);
  if (!lhsAbs || lhsAbs.before.trim() !== '' || lhsAbs.after.trim() !== '') return null;

  let insideLatex: string;
  try {
    insideLatex = toLatex(parseExpr(lhsAbs.inner));
  } catch (e) {
    if (e instanceof ExprError) return null;
    throw e;
  }

  const rhsAbs = extractAbs(rhsRaw);
  if (rhsAbs && rhsAbs.before.trim() === '' && rhsAbs.after.trim() === '') {
    try {
      const rhsLatex = toLatex(parseExpr(rhsAbs.inner));
      return { insideText: lhsAbs.inner, insideLatex, rhs: { kind: 'abs', text: rhsAbs.inner, latex: rhsLatex } };
    } catch (e) {
      if (!(e instanceof ExprError)) throw e;
      return null;
    }
  }

  let rhsExpr;
  try {
    rhsExpr = parseExpr(rhsRaw);
  } catch (e) {
    if (e instanceof ExprError) return null;
    throw e;
  }
  const value = evaluateExpr(rhsExpr);
  if (Number.isFinite(value)) return { insideText: lhsAbs.inner, insideLatex, rhs: { kind: 'const', value } };
  // Not a constant — a right-hand side with x in it but no bars of its own.
  return { insideText: lhsAbs.inner, insideLatex, rhs: { kind: 'expr', text: rhsRaw, latex: toLatex(rhsExpr) } };
}

/** Solve one case equation, trying each general solver in turn. */
function solveCase(text: string, methodId: string): SolveResult {
  for (const solver of [linearSolver, collectSolver, inverseSolver]) {
    if (solver.detect(text) > 0) {
      const r = solver.solve(text, methodId);
      if (r.ok) return r;
    }
  }
  return { ok: false, error: `Couldn't solve $${text}$.` };
}

function caseSteps(label: string, text: string, methodId: string): { steps: Step[]; answer?: string } | null {
  const r = solveCase(text, methodId);
  if (!r.ok) return null;
  const steps: Step[] = [{ note: label, latex: r.solution.headline.replace(/^Solve \$|\$$/g, '') }, ...r.solution.steps.slice(1)];
  return { steps, answer: r.solution.answerLatex };
}

function solveImpl(input: string, methodId: string): SolveResult {
  const parsed = parse(input);
  if (!parsed) {
    return { ok: false, error: 'Write an absolute-value equation, e.g.  |x - 3| = 5  or  |2x + 1| = |x - 4|.' };
  }
  const { insideText, insideLatex, rhs } = parsed;
  const headline =
    rhs.kind === 'const'
      ? `Solve $\\left|${insideLatex}\\right| = ${fmt(rhs.value)}$`
      : rhs.kind === 'abs'
        ? `Solve $\\left|${insideLatex}\\right| = \\left|${rhs.latex}\\right|$`
        : `Solve $\\left|${insideLatex}\\right| = ${rhs.latex}$`;
  const steps: Step[] = [{ note: 'Write down the equation.', latex: headline.replace(/^Solve \$|\$$/g, '') }];

  if (rhs.kind === 'const' && rhs.value < 0) {
    steps.push({
      note: 'An absolute value is a distance, so it can never be negative — there is no solution.',
      latex: '\\text{No solution}',
    });
    return { ok: true, solution: { headline, methodName: 'Case split', steps } };
  }

  if (rhs.kind === 'const' && rhs.value === 0) {
    steps.push({
      note: 'The only way an absolute value can be zero is if what is inside it is zero.',
      latex: `${insideLatex} = 0`,
    });
    const c = caseSteps('Solve that equation.', `${insideText} = 0`, methodId);
    if (!c) return { ok: false, error: `Couldn't solve $${insideLatex} = 0$.` };
    steps.push(...c.steps);
    return { ok: true, solution: { headline, methodName: 'Case split', steps, answerLatex: c.answer } };
  }

  // Two cases: whatever is inside the bars is +k or −k (or ±the other side),
  // since dropping the sign is exactly what the bars did in the first place.
  const [posText, negText] =
    rhs.kind === 'const'
      ? [`${insideText} = ${fmt(rhs.value)}`, `${insideText} = ${fmt(-rhs.value)}`]
      : [`${insideText} = ${rhs.text}`, `${insideText} = -(${rhs.text})`];

  steps.push({
    note:
      rhs.kind === 'const'
        ? `What is inside the bars can be $${fmt(rhs.value)}$ or $${fmt(-rhs.value)}$ — both give the same absolute value once the sign is dropped. So split into two cases.`
        : rhs.kind === 'abs'
          ? 'Two expressions have the same absolute value exactly when they are equal, or when one is the negative of the other. So split into two cases.'
          : 'What is inside the bars equals the other side, or its negative — both drop to the same absolute value. So split into two cases.',
    latex:
      rhs.kind === 'const'
        ? `${insideLatex} = ${fmt(rhs.value)} \\quad\\text{or}\\quad ${insideLatex} = ${fmt(-rhs.value)}`
        : `${insideLatex} = ${rhs.latex} \\quad\\text{or}\\quad ${insideLatex} = -\\left(${rhs.latex}\\right)`,
    annotation: 'two cases',
  });

  const case1 = caseSteps('Case 1.', posText, methodId);
  const case2 = caseSteps('Case 2.', negText, methodId);
  if (!case1 || !case2) {
    return { ok: false, error: `Couldn't solve one of the two cases from $${insideLatex}$.` };
  }
  steps.push(...case1.steps, ...case2.steps);

  let answers = [case1.answer, case2.answer].filter((a): a is string => a !== undefined);

  // |A| = C(x): C must actually be ≥ 0 at the solution, since an absolute
  // value can never be negative. |A| = |B| never needs this check — both
  // cases already force equality with something that is itself an absolute
  // value, so they can't produce a negative match.
  if (rhs.kind === 'expr') {
    const values = [...numericSolutionsOf(posText), ...numericSolutionsOf(negText)];
    const rejected = values.filter((x) => evaluateExpr(parseExpr(rhs.text), { x }) < -1e-9);
    if (rejected.length) {
      const kept = values.filter((x) => !rejected.includes(x));
      steps.push({
        note: `An absolute value is never negative, so check each case against the right-hand side. $x = ${rejected.map((r) => fmt(r)).join(', ')}$ ${rejected.length > 1 ? 'make' : 'makes'} it negative, so ${rejected.length > 1 ? 'those are' : 'that is'} rejected.`,
        latex: kept.length ? `x = ${kept.map((v) => fmt(v)).join(', \\quad x = ')}` : '\\text{No solution}',
        annotation: 'domain check',
      });
      answers = kept.map((v) => `x = ${fmt(v)}`);
    }
  }

  return {
    ok: true,
    solution: { headline, methodName: 'Case split', steps, answerLatex: answers.length ? answers.join(', \\quad ') : undefined },
  };
}

export const absoluteSolver: Solver = {
  id: 'absolute',
  title: 'Absolute value equations',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve |expression| = k by splitting into the two cases it could have come from.',
  placeholder: 'e.g.  |x - 3| = 5   or   |2x + 1| = |x - 4|',
  methods: [{ id: 'cases', name: 'Case split', blurb: 'Drop the bars into the two cases they could hide, then solve each.' }],
  defaultMethodId: 'cases',
  detect(input) {
    return parse(input) ? 0.9 : 0;
  },
  solve: solveImpl,
};
