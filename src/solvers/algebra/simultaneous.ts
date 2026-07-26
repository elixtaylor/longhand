import { Rational } from '../../lib/math/rational';
import { normalise, ParseError } from '../../lib/math/parse';
import { rl } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** One equation  a·x + b·y = c. */
interface Eq {
  a: Rational;
  b: Rational;
  c: Rational;
}

function parseSide(sideRaw: string): { x: Rational; y: Rational; k: Rational } {
  let s = normalise(sideRaw).toLowerCase().replace(/\*/g, '');
  if (s === '') s = '0';
  s = s.replace(/-/g, '+-');
  let x = Rational.int(0);
  let y = Rational.int(0);
  let k = Rational.int(0);
  for (const chunk of s.split('+').filter(Boolean)) {
    if (chunk.includes('x')) x = x.add(coeff(chunk.replace('x', '')));
    else if (chunk.includes('y')) y = y.add(coeff(chunk.replace('y', '')));
    else k = k.add(Rational.parse(chunk));
  }
  return { x, y, k };
}
function coeff(str: string): Rational {
  if (str === '' || str === '+') return Rational.int(1);
  if (str === '-') return Rational.int(-1);
  return Rational.parse(str);
}

function parseEq(input: string): Eq {
  const parts = normalise(input).split('=');
  if (parts.length !== 2) throw new ParseError(`Each equation needs one "=" (got "${input}").`);
  const l = parseSide(parts[0]);
  const r = parseSide(parts[1]);
  return { a: l.x.sub(r.x), b: l.y.sub(r.y), c: r.k.sub(l.k) };
}

function parseSystem(input: string): [Eq, Eq] {
  const lines = input
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length !== 2) {
    throw new ParseError('Enter two equations separated by a semicolon or new line, e.g.  2x + 3y = 12 ;  x - y = 1');
  }
  return [parseEq(lines[0]), parseEq(lines[1])];
}

function coeffVar(r: Rational, v: string): string {
  if (r.eq(Rational.int(1))) return v;
  if (r.eq(Rational.int(-1))) return `-${v}`;
  return `${rl(r)}${v}`;
}
function eqLatex(e: Eq): string {
  let lhs = '';
  if (!e.a.isZero()) lhs += coeffVar(e.a, 'x');
  if (!e.b.isZero()) {
    if (lhs === '') lhs += coeffVar(e.b, 'y');
    else lhs += (e.b.isNeg() ? ' - ' : ' + ') + coeffVar(e.b.abs(), 'y');
  }
  if (lhs === '') lhs = '0';
  return `${lhs} = ${rl(e.c)}`;
}
function systemLatex(e1: Eq, e2: Eq): string {
  return `\\begin{cases} ${eqLatex(e1)} \\\\ ${eqLatex(e2)} \\end{cases}`;
}
function scale(e: Eq, k: Rational): Eq {
  return { a: e.a.mul(k), b: e.b.mul(k), c: e.c.mul(k) };
}

interface Solution2 {
  kind: 'unique' | 'none' | 'infinite';
  x?: Rational;
  y?: Rational;
}
function solve2(e1: Eq, e2: Eq): Solution2 {
  const det = e1.a.mul(e2.b).sub(e2.a.mul(e1.b));
  if (det.isZero()) {
    // dependent or inconsistent
    const d2 = e1.a.mul(e2.c).sub(e2.a.mul(e1.c));
    const d3 = e1.c.mul(e2.b).sub(e2.c.mul(e1.b));
    return d2.isZero() && d3.isZero() ? { kind: 'infinite' } : { kind: 'none' };
  }
  const x = e2.b.mul(e1.c).sub(e1.b.mul(e2.c)).div(det);
  const y = e1.a.mul(e2.c).sub(e2.a.mul(e1.c)).div(det);
  return { kind: 'unique', x, y };
}

function answer(sol: Solution2): string | undefined {
  if (sol.kind !== 'unique') return undefined;
  return `x = ${rl(sol.x!)}, \\quad y = ${rl(sol.y!)}`;
}
const HEAD = 'Solve the simultaneous equations';

/* -------------------------------------------------------------- elimination */
function solveByElimination(e1: Eq, e2: Eq, sol: Solution2): SolveResult {
  const steps: Step[] = [
    { note: 'Label the two equations.', latex: systemLatex(e1, e2), annotation: '(1) and (2)' },
  ];
  if (sol.kind !== 'unique') return degenerate(steps, 'Elimination', sol.kind);

  // Eliminate x if possible, else y.
  const elimX = !e1.a.isZero() && !e2.a.isZero();
  const [m1, m2] = elimX ? [e2.a, e1.a] : [e2.b, e1.b];
  const s1 = scale(e1, m1);
  const s2 = scale(e2, m2);

  steps.push({
    note: `Multiply (1) by $${rl(m1)}$ and (2) by $${rl(m2)}$ so the $${elimX ? 'x' : 'y'}$-coefficients match.`,
    latex: systemLatex(s1, s2),
  });

  // Subtract: s1 - s2 removes the matched variable.
  const diff: Eq = { a: s1.a.sub(s2.a), b: s1.b.sub(s2.b), c: s1.c.sub(s2.c) };
  steps.push({
    note: 'Subtract to eliminate it, leaving one variable.',
    latex: `(1') - (2'):\\quad ${eqLatex(diff)}`,
  });

  const solvedVar = elimX ? 'y' : 'x';
  const coeffLeft = elimX ? diff.b : diff.a;
  const val = diff.c.div(coeffLeft);
  steps.push({
    note: `Solve for $${solvedVar}$.`,
    latex: `${solvedVar} = \\dfrac{${rl(diff.c)}}{${rl(coeffLeft)}} = ${rl(val)}`,
  });

  // Back-substitute into (1).
  const backLatex = elimX
    ? `${coeffVar(e1.a, 'x')} + ${coeffVar(e1.b, 'y')} = ${rl(e1.c)} \\;\\Rightarrow\\; ${coeffVar(e1.a, 'x')} = ${rl(e1.c.sub(e1.b.mul(val)))}`
    : `${coeffVar(e1.a, 'x')} + ${coeffVar(e1.b, 'y')} = ${rl(e1.c)} \\;\\Rightarrow\\; ${coeffVar(e1.b, 'y')} = ${rl(e1.c.sub(e1.a.mul(val)))}`;
  steps.push({ note: `Substitute $${solvedVar} = ${rl(val)}$ back into (1).`, latex: backLatex });
  steps.push({ note: 'Solve for the other variable.', latex: answer(sol)!, annotation: 'solved' });

  return { ok: true, solution: { headline: HEAD, methodName: 'Elimination', steps, answerLatex: answer(sol) } };
}

/* ------------------------------------------------------------- substitution */
function solveBySubstitution(e1: Eq, e2: Eq, sol: Solution2): SolveResult {
  const steps: Step[] = [
    { note: 'Label the two equations.', latex: systemLatex(e1, e2), annotation: '(1) and (2)' },
  ];
  if (sol.kind !== 'unique') return degenerate(steps, 'Substitution', sol.kind);

  // Prefer to isolate a variable whose coefficient is ±1 for tidy algebra.
  const candidates: Array<{ eq: Eq; other: Eq; solveFor: 'x' | 'y'; coef: Rational }> = [
    { eq: e1, other: e2, solveFor: 'x' as const, coef: e1.a },
    { eq: e1, other: e2, solveFor: 'y' as const, coef: e1.b },
    { eq: e2, other: e1, solveFor: 'x' as const, coef: e2.a },
    { eq: e2, other: e1, solveFor: 'y' as const, coef: e2.b },
  ].filter((c) => !c.coef.isZero());
  const pick =
    candidates.find((c) => c.coef.abs().eq(Rational.int(1))) ?? candidates[0];

  const { eq, other, solveFor } = pick;
  // Isolate: from  a x + b y = c  →  solved = (c - (otherCoeff)·otherVar) / coef
  const isX = solveFor === 'x';
  const coef = isX ? eq.a : eq.b;
  const otherCoef = isX ? eq.b : eq.a;
  const otherVar = isX ? 'y' : 'x';
  const isolated =
    coef.eq(Rational.int(1)) && otherCoef.isZero()
      ? `${solveFor} = ${rl(eq.c)}`
      : `${solveFor} = \\dfrac{${rl(eq.c)} - (${rl(otherCoef)})${otherVar}}{${rl(coef)}}`;
  steps.push({ note: `Rearrange (1) to make $${solveFor}$ the subject.`, latex: isolated });

  steps.push({
    note: `Substitute this into the other equation and simplify.`,
    latex: `\\text{into }(2):\\quad ${eqLatex(other)}`,
  });

  const otherVal = otherVar === 'y' ? sol.y! : sol.x!;
  const thisVal = isX ? sol.x! : sol.y!;
  steps.push({ note: `Solve for $${otherVar}$.`, latex: `${otherVar} = ${rl(otherVal)}` });
  steps.push({
    note: `Substitute back to find $${solveFor}$.`,
    latex: `${solveFor} = ${rl(thisVal)}`,
    annotation: 'solved',
  });
  steps.push({ note: 'Both values:', latex: answer(sol)! });

  return { ok: true, solution: { headline: HEAD, methodName: 'Substitution', steps, answerLatex: answer(sol) } };
}

function degenerate(steps: Step[], methodName: string, kind: 'none' | 'infinite'): SolveResult {
  steps.push({
    note:
      kind === 'none'
        ? 'The lines are parallel — the equations are inconsistent, so there is no solution.'
        : 'The two equations describe the same line, so there are infinitely many solutions.',
    latex: kind === 'none' ? '\\text{No solution}' : '\\text{Infinitely many solutions}',
  });
  return { ok: true, solution: { headline: HEAD, methodName, steps } };
}

export const simultaneousSolver: Solver = {
  id: 'simultaneous',
  title: 'Simultaneous equations',
  subjects: ['General', 'Methods'],
  blurb: 'Solve two equations in x and y at once.',
  placeholder: 'e.g.  2x + 3y = 12 ;  x - y = 1',
  methods: [
    { id: 'elimination', name: 'Elimination', blurb: 'Scale the equations so one variable cancels when you add or subtract.' },
    { id: 'substitution', name: 'Substitution', blurb: 'Make one variable the subject, then substitute it into the other equation.' },
  ],
  defaultMethodId: 'elimination',
  detect(input) {
    const lines = input
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length !== 2) return 0;
    if (!lines.every((l) => l.includes('='))) return 0;
    return 0.95;
  },
  solve(input, methodId): SolveResult {
    let system: [Eq, Eq];
    try {
      system = parseSystem(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read those equations.' };
    }
    const sol = solve2(system[0], system[1]);
    return methodId === 'substitution'
      ? solveBySubstitution(system[0], system[1], sol)
      : solveByElimination(system[0], system[1], sol);
  },
};
