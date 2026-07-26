import { Rational } from '../../lib/math/rational';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

type Op = '+' | '-' | '*' | '÷';

interface Frac {
  num: number;
  den: number;
}
interface Problem {
  a: Frac;
  b: Frac;
  op: Op;
}

function parseFrac(tok: string): Frac {
  if (tok.includes('/')) {
    const [n, d] = tok.split('/');
    return { num: parseInt(n, 10), den: parseInt(d, 10) };
  }
  return { num: parseInt(tok, 10), den: 1 };
}

function parseProblem(input: string): Problem {
  const s = input.replace(/×/g, '*').replace(/\s+/g, '');
  const m = s.match(/^(-?\d+(?:\/\d+)?)([+\-*÷])(-?\d+(?:\/\d+)?)$/);
  if (!m) {
    throw new Error('Enter two fractions and an operation, e.g.  3/4 + 1/6  or  2/3 × 5/7');
  }
  const a = parseFrac(m[1]);
  const b = parseFrac(m[3]);
  if (a.den === 0 || b.den === 0) throw new Error('A denominator can’t be zero.');
  return { a, b, op: m[2] as Op };
}

function igcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function ilcm(a: number, b: number): number {
  return Math.abs((a / igcd(a, b)) * b);
}

function fracLatex(num: number, den: number): string {
  if (den === 1) return String(num);
  return `${num < 0 ? '-' : ''}\\frac{${Math.abs(num)}}{${den}}`;
}
function opSymbol(op: Op): string {
  return op === '*' ? '\\times' : op === '÷' ? '\\div' : op;
}

function reduceStepIfNeeded(rawNum: number, rawDen: number, reduced: Rational, steps: Step[]) {
  const same = Math.abs(rawNum) === Math.abs(reduced.n) && rawDen === reduced.d;
  if (!same) {
    steps.push({
      note: 'Simplify by dividing top and bottom by their common factor.',
      latex: `= ${fracLatex(reduced.n, reduced.d)}`,
    });
  }
}

export function solveFraction(p: Problem): SolveResult {
  const { a, b, op } = p;
  const start = `${fracLatex(a.num, a.den)} ${opSymbol(op)} ${fracLatex(b.num, b.den)}`;
  const steps: Step[] = [{ note: 'Write out the calculation.', latex: start }];

  let reduced: Rational;

  if (op === '+' || op === '-') {
    const L = ilcm(a.den, b.den);
    const an = a.num * (L / a.den);
    const bn = b.num * (L / b.den);
    if (a.den !== b.den) {
      steps.push({
        note: `Rewrite both over a common denominator of ${L}.`,
        latex: `= \\frac{${an}}{${L}} ${op} \\frac{${bn}}{${L}}`,
        annotation: 'same bottom number',
      });
    }
    const resN = op === '+' ? an + bn : an - bn;
    steps.push({
      note: `${op === '+' ? 'Add' : 'Subtract'} the numerators, keep the denominator.`,
      latex: `= \\frac{${resN}}{${L}}`,
    });
    reduced = new Rational(resN, L);
    reduceStepIfNeeded(resN, L, reduced, steps);
  } else if (op === '*') {
    const rn = a.num * b.num;
    const rd = a.den * b.den;
    steps.push({
      note: 'Multiply the numerators together, and the denominators together.',
      latex: `= \\frac{${a.num} \\times ${b.num}}{${a.den} \\times ${b.den}} = ${fracLatex(rn, rd)}`,
    });
    reduced = new Rational(rn, rd);
    reduceStepIfNeeded(rn, rd, reduced, steps);
  } else {
    // division: multiply by the reciprocal
    steps.push({
      note: 'Dividing by a fraction is multiplying by its reciprocal — flip the second fraction.',
      latex: `= ${fracLatex(a.num, a.den)} \\times ${fracLatex(b.den, b.num)}`,
    });
    let rn = a.num * b.den;
    let rd = a.den * b.num;
    if (rd < 0) {
      rn = -rn;
      rd = -rd;
    }
    steps.push({
      note: 'Multiply across.',
      latex: `= ${fracLatex(rn, rd)}`,
    });
    reduced = new Rational(rn, rd);
    reduceStepIfNeeded(rn, rd, reduced, steps);
  }

  const answerLatex = fracLatex(reduced.n, reduced.d);
  // When the previous step already reached the reduced fraction, a "final
  // answer" line just restates it. Mark that line as the answer instead.
  if (steps[steps.length - 1]?.latex === `= ${answerLatex}`) {
    steps[steps.length - 1].annotation = 'answer';
  } else {
    steps.push({ note: 'Final answer.', latex: `= ${answerLatex}`, annotation: 'answer' });
  }

  return {
    ok: true,
    solution: {
      headline: `Work out $${start}$`,
      methodName: 'Common denominator',
      steps,
      answerLatex,
    },
  };
}

export const fractionsSolver: Solver = {
  id: 'fractions',
  title: 'Fractions',
  subjects: ['Foundations'],
  blurb: 'Add, subtract, multiply or divide two fractions.',
  placeholder: 'e.g.  3/4 + 1/6',
  methods: [{ id: 'standard', name: 'Common denominator', blurb: 'Line up denominators for + and −; multiply across for × and ÷.' }],
  defaultMethodId: 'standard',
  detect(input) {
    const s = input.replace(/\s+/g, '');
    if (/[a-zA-Z]/.test(s)) return 0;
    // Needs a real fraction AND a binary operation, so "864÷24" stays division.
    if (!s.includes('/')) return 0;
    return /^-?\d+(\/\d+)?[+\-*×÷]-?\d+(\/\d+)?$/.test(s) ? 0.95 : 0;
  },
  solve(input): SolveResult {
    try {
      return solveFraction(parseProblem(input));
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
  },
};
