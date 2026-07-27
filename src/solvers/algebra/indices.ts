import { fmt, gcd } from '../../lib/math/num';
import { simplifySqrt, isPerfectSquare } from '../../lib/math/surd';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Indices and surds (SACE Stage 1 Specialist — Real and Complex Numbers):
 * simplifying surds, rationalising denominators, and the index laws.
 */

function surdLatex(out: number, inside: number): string {
  if (inside === 1) return String(out);
  if (out === 1) return `\\sqrt{${inside}}`;
  return `${out}\\sqrt{${inside}}`;
}

/* ------------------------------------------------------- simplifying surds */
function simplify(n: number): SolveResult {
  const { outside, inside } = simplifySqrt(n);
  const steps: Step[] = [];

  if (isPerfectSquare(n)) {
    steps.push({
      note: `${n} is a perfect square, so the root is exact.`,
      latex: `\\sqrt{${n}} = ${outside}`,
      annotation: 'no surd left',
    });
    return ok(`Simplify $\\sqrt{${n}}$`, 'Largest square factor', steps, String(outside));
  }
  if (outside === 1) {
    steps.push({
      note: `${n} has no square factor bigger than 1, so this surd is already in simplest form.`,
      latex: `\\sqrt{${n}}`,
      annotation: 'already simplified',
    });
    return ok(`Simplify $\\sqrt{${n}}$`, 'Largest square factor', steps, `\\sqrt{${n}}`);
  }

  const square = outside * outside;
  steps.push({
    note: 'Look for the largest perfect square that divides the number.',
    latex: `${n} = ${square} \\times ${inside}`,
    annotation: `${square} = ${outside}^2`,
  });
  steps.push({
    note: 'Split the root over the product.',
    latex: `\\sqrt{${n}} = \\sqrt{${square}} \\times \\sqrt{${inside}}`,
  });
  steps.push({
    note: 'Take the square root of the perfect square.',
    latex: `\\sqrt{${n}} = ${surdLatex(outside, inside)}`,
    annotation: 'simplest form',
  });
  return ok(`Simplify $\\sqrt{${n}}$`, 'Largest square factor', steps, surdLatex(outside, inside));
}

/* ------------------------------------------------------------ rationalising */
function rationalise(num: number, rootOf: number): SolveResult {
  const s = simplifySqrt(rootOf);
  const steps: Step[] = [
    {
      note: 'A surd in the denominator is not simplest form, so multiply top and bottom by that surd.',
      latex: `\\dfrac{${fmt(num)}}{\\sqrt{${rootOf}}} \\times \\dfrac{\\sqrt{${rootOf}}}{\\sqrt{${rootOf}}}`,
      annotation: 'multiplying by 1',
    },
    {
      note: 'The denominator becomes a whole number, because $\\sqrt{a} \\times \\sqrt{a} = a$.',
      latex: `= \\dfrac{${fmt(num)}\\sqrt{${rootOf}}}{${rootOf}}`,
    },
  ];

  // Simplify the surd on top, then cancel any common factor.
  let topCoeff = num * s.outside;
  const inside = s.inside;
  let bottom = rootOf;
  if (s.outside !== 1) {
    steps.push({
      note: 'Simplify the surd on the top.',
      latex: `= \\dfrac{${surdLatex(topCoeff, inside)}}{${bottom}}`,
    });
  }
  const g = gcd(Math.round(topCoeff), bottom);
  if (g > 1) {
    topCoeff /= g;
    bottom /= g;
    steps.push({
      note: `Cancel the common factor of ${g}.`,
      latex: `= \\dfrac{${surdLatex(topCoeff, inside)}}{${bottom}}`,
    });
  }
  const answer = bottom === 1 ? surdLatex(topCoeff, inside) : `\\dfrac{${surdLatex(topCoeff, inside)}}{${bottom}}`;
  steps.push({ note: 'The denominator is now rational.', latex: `= ${answer}`, annotation: 'rationalised' });
  return ok(`Rationalise $\\dfrac{${fmt(num)}}{\\sqrt{${rootOf}}}$`, 'Rationalising the denominator', steps, answer);
}

/* -------------------------------------------------------------- index laws */
interface IndexOp {
  base: number;
  p: number;
  q: number;
  op: '*' | '/' | '^';
}

function indexLaws(o: IndexOp): SolveResult {
  const { base, p, q, op } = o;
  const law =
    op === '*'
      ? { name: 'a^m \\times a^n = a^{m+n}', result: p + q, sign: '+', word: 'add' }
      : op === '/'
        ? { name: '\\dfrac{a^m}{a^n} = a^{m-n}', result: p - q, sign: '-', word: 'subtract' }
        : { name: '\\left(a^m\\right)^n = a^{mn}', result: p * q, sign: '\\times', word: 'multiply' };

  const written =
    op === '*'
      ? `${base}^{${p}} \\times ${base}^{${q}}`
      : op === '/'
        ? `\\dfrac{${base}^{${p}}}{${base}^{${q}}}`
        : `\\left(${base}^{${p}}\\right)^{${q}}`;

  const steps: Step[] = [
    { note: 'The bases match, so use the index law.', latex: law.name, annotation: `${law.word} the indices` },
    { note: 'Apply it to these indices.', latex: `${written} = ${base}^{${p} ${law.sign} ${q}}` },
    { note: 'Simplify the index.', latex: `= ${base}^{${law.result}}`, annotation: 'simplified' },
  ];

  const value = Math.pow(base, law.result);
  if (Number.isInteger(value) && Math.abs(value) < 1e12) {
    steps.push({ note: 'Evaluate if you need a number.', latex: `= ${value}` });
  } else if (law.result < 0) {
    steps.push({
      note: 'A negative index means a reciprocal.',
      latex: `= \\dfrac{1}{${base}^{${-law.result}}} = \\dfrac{1}{${Math.pow(base, -law.result)}}`,
    });
  }
  return ok(`Simplify $${written}$`, 'Index laws', steps, `${base}^{${law.result}}`);
}

/* ------------------------------------------------------------------ parsing */
/**
 * Strip the words that only say what to do, leaving the expression.
 * Anchoring the readers below to what remains is what stops them matching a
 * fragment and ignoring the rest.
 */
function bare(input: string): string {
  return input
    .replace(/\b(?:simplify|rationalise|rationalize|the|denominator|of|surd|express|in|simplest|form)\b/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * A single surd, and nothing else.
 *
 * Anchored deliberately. Unanchored, this matched the first √ anywhere and
 * discarded everything around it: `sqrt(8) + sqrt(18)` simplified only the
 * first term and answered 2√2 for a quantity that is 5√2. Refusing the whole
 * input is right — this solver simplifies one surd, and combining surds is a
 * different question it cannot yet do.
 */
function readSurd(input: string): number | null {
  const m = bare(input).match(/^(?:sqrt|√|squareroot)\(?(\d+)\)?$/i);
  return m ? Number(m[1]) : null;
}

/**
 * `number / √n`, and nothing else. A binomial denominator such as
 * `3/(2+√3)` needs the conjugate method, which this solver does not have —
 * so it must be refused rather than quietly falling through to readSurd and
 * answering √3.
 */
function readRationalise(input: string): { num: number; rootOf: number } | null {
  const m = bare(input).match(/^(-?\d+(?:\.\d+)?)\/(?:sqrt|√)\(?(\d+)\)?$/i);
  return m ? { num: Number(m[1]), rootOf: Number(m[2]) } : null;
}
function readIndex(input: string): IndexOp | null {
  const s = input.replace(/\s+/g, '');
  let m = s.match(/^(\d+)\^\(?(-?\d+)\)?[×*](\d+)\^\(?(-?\d+)\)?$/);
  if (m && m[1] === m[3]) return { base: Number(m[1]), p: Number(m[2]), q: Number(m[4]), op: '*' };
  m = s.match(/^(\d+)\^\(?(-?\d+)\)?[÷/](\d+)\^\(?(-?\d+)\)?$/);
  if (m && m[1] === m[3]) return { base: Number(m[1]), p: Number(m[2]), q: Number(m[4]), op: '/' };
  m = s.match(/^\((\d+)\^\(?(-?\d+)\)?\)\^\(?(-?\d+)\)?$/);
  if (m) return { base: Number(m[1]), p: Number(m[2]), q: Number(m[3]), op: '^' };
  return null;
}

function ok(headline: string, methodName: string, steps: Step[], answerLatex: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex } };
}

export const indicesSolver: Solver = {
  id: 'indices',
  title: 'Indices & surds',
  subjects: ['Specialist', 'Methods'],
  blurb: 'Simplify surds, rationalise denominators, apply the index laws.',
  placeholder: 'e.g.  sqrt 48   or   1/sqrt 2   or   2^3 × 2^4',
  methods: [
    { id: 'simplify-surd', name: 'Simplify surd', blurb: 'Pull out the largest perfect-square factor.' },
    { id: 'rationalise', name: 'Rationalise', blurb: 'Clear a surd from the denominator by multiplying top and bottom.' },
    { id: 'index-laws', name: 'Index laws', blurb: 'Add, subtract or multiply indices when the bases match.' },
  ],
  defaultMethodId: 'simplify-surd',
  detect(input) {
    if (readRationalise(input)) return 0.95;
    if (readIndex(input)) return 0.95;
    if (readSurd(input) !== null) return 0.93;
    return 0;
  },
  solve(input, methodId): SolveResult {
    const rat = readRationalise(input);
    if (rat && methodId !== 'index-laws') return rationalise(rat.num, rat.rootOf);

    const idx = readIndex(input);
    if (idx) return indexLaws(idx);

    const n = readSurd(input);
    if (n !== null) {
      if (n < 0) return { ok: false, error: 'A negative number has no real square root — try Complex numbers.' };
      return simplify(n);
    }
    return {
      ok: false,
      error: 'Try  sqrt 48  to simplify a surd,  1/sqrt 2  to rationalise, or  2^3 × 2^4  for the index laws.',
    };
  },
};
