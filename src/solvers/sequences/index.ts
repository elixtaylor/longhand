import { fmt, parseParams, parseNumberList } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Arithmetic and geometric sequences and series
 * (SACE Stage 1 Specialist Mathematics, Topic 1).
 */
interface Seq {
  a: number; // first term
  step: number; // common difference d, or common ratio r
  kind: 'arithmetic' | 'geometric';
  n: number; // which term / how many terms
  terms?: number[]; // the list they typed, when they typed one
}

const EPS = 1e-9;

/** Work out whether a list of numbers is arithmetic or geometric. */
function classify(list: number[]): 'arithmetic' | 'geometric' | null {
  if (list.length < 3) return null;
  const d = list[1] - list[0];
  if (list.every((v, i) => i === 0 || Math.abs(v - list[i - 1] - d) < EPS)) return 'arithmetic';
  if (list[0] !== 0) {
    const r = list[1] / list[0];
    if (list.every((v, i) => i === 0 || Math.abs(v - list[i - 1] * r) < EPS)) return 'geometric';
  }
  return null;
}

/**
 * Pull a typed list of terms out of an input, ignoring any key=value pairs.
 * "n=10  3, 7, 11, 15" asks for the 10th term *of a listed sequence*, so the
 * parameters and the list have to coexist.
 */
function listFrom(input: string): number[] | null {
  const listPart = input.replace(/[A-Za-z]\w*\s*=\s*-?\d*\.?\d+/g, ' ');
  if (!/,/.test(listPart)) return null;
  try {
    const list = parseNumberList(listPart);
    return list.length >= 3 ? list : null;
  } catch {
    return null;
  }
}

function read(input: string, methodId: string): Seq {
  const p = parseParams(input);
  const n = p.n ?? 10;

  // A list of numbers is the most natural way to type a sequence.
  const terms = listFrom(input);
  if (terms) {
    const kind = classify(terms);
    if (!kind) {
      throw new Error('That list is neither arithmetic (constant difference) nor geometric (constant ratio).');
    }
    return {
      a: terms[0],
      step: kind === 'arithmetic' ? terms[1] - terms[0] : terms[1] / terms[0],
      kind,
      n: p.n ?? terms.length,
      terms,
    };
  }

  const a = p.a ?? p.a1;
  const d = p.d;
  const r = p.r;
  if (a === undefined || (d === undefined && r === undefined)) {
    throw new Error('Give a list like  3, 7, 11, 15  or values like  a=3, d=4, n=10.');
  }
  const kind = d !== undefined ? 'arithmetic' : 'geometric';
  return { a, step: (d ?? r)!, kind: methodId === 'geometric' && r !== undefined ? 'geometric' : kind, n };
}

function arithmetic(s: Seq): SolveResult {
  const { a, step: d, n, terms } = s;
  const tn = a + (n - 1) * d;
  const sum = (n / 2) * (2 * a + (n - 1) * d);

  const steps: Step[] = [];
  if (terms) {
    steps.push({
      note: 'Check the differences between consecutive terms.',
      latex: terms
        .slice(1)
        .map((v, i) => `${fmt(v)} - ${fmt(terms[i])} = ${fmt(v - terms[i])}`)
        .join(', \\quad '),
      annotation: 'constant → arithmetic',
    });
  }
  steps.push({
    note: 'Write down the first term and the common difference.',
    latex: `a = ${fmt(a)}, \\quad d = ${fmt(d)}`,
  });
  steps.push({ note: 'The rule for the nth term of an arithmetic sequence:', latex: `t_n = a + (n-1)d` });
  steps.push({
    note: 'Substitute a and d to get the rule for this sequence.',
    latex: `t_n = ${fmt(a)} + (n-1)(${fmt(d)}) = ${ruleLatex(a, d)}`,
    annotation: 'nth term rule',
  });
  steps.push({
    note: `Find the ${n}th term.`,
    latex: `t_{${n}} = ${fmt(a)} + (${n}-1)(${fmt(d)}) = ${fmt(tn)}`,
  });
  steps.push({ note: 'The sum of the first n terms:', latex: `S_n = \\dfrac{n}{2}\\left(2a + (n-1)d\\right)` });
  steps.push({
    note: `Substitute to find the sum of the first ${n} terms.`,
    latex: `S_{${n}} = \\dfrac{${n}}{2}\\left(2(${fmt(a)}) + (${n}-1)(${fmt(d)})\\right) = ${fmt(sum)}`,
    annotation: 'sum',
  });

  return {
    ok: true,
    solution: {
      headline: `Arithmetic sequence: $a = ${fmt(a)}$, $d = ${fmt(d)}$`,
      methodName: 'Arithmetic sequence',
      steps,
      answerLatex: `t_n = ${ruleLatex(a, d)}, \\quad t_{${n}} = ${fmt(tn)}, \\quad S_{${n}} = ${fmt(sum)}`,
    },
  };
}

/** Tidy "a + (n−1)d" into the simplified linear rule. */
function ruleLatex(a: number, d: number): string {
  const c = a - d;
  if (c === 0) return `${fmt(d)}n`;
  const coeff = d === 1 ? 'n' : d === -1 ? '-n' : `${fmt(d)}n`;
  return `${coeff} ${c < 0 ? '-' : '+'} ${fmt(Math.abs(c))}`;
}

function geometric(s: Seq): SolveResult {
  const { a, step: r, n, terms } = s;
  const tn = a * Math.pow(r, n - 1);

  const steps: Step[] = [];
  if (terms) {
    steps.push({
      note: 'Check the ratios between consecutive terms.',
      latex: terms
        .slice(1)
        .map((v, i) => `\\dfrac{${fmt(v)}}{${fmt(terms[i])}} = ${fmt(v / terms[i], 4)}`)
        .join(', \\quad '),
      annotation: 'constant → geometric',
    });
  }
  steps.push({ note: 'Write down the first term and the common ratio.', latex: `a = ${fmt(a)}, \\quad r = ${fmt(r)}` });
  steps.push({ note: 'The rule for the nth term of a geometric sequence:', latex: `t_n = a r^{\\,n-1}` });
  steps.push({
    note: 'Substitute a and r to get the rule for this sequence.',
    latex: `t_n = ${fmt(a)} \\times (${fmt(r)})^{\\,n-1}`,
    annotation: 'nth term rule',
  });
  steps.push({
    note: `Find the ${n}th term.`,
    latex: `t_{${n}} = ${fmt(a)} \\times (${fmt(r)})^{${n - 1}} = ${fmt(tn, 4)}`,
  });

  let answer = `t_{${n}} = ${fmt(tn, 4)}`;
  if (Math.abs(r - 1) < EPS) {
    steps.push({ note: 'With r = 1 every term is the same, so the sum is just n × a.', latex: `S_{${n}} = ${n} \\times ${fmt(a)} = ${fmt(n * a)}` });
    answer += `, \\quad S_{${n}} = ${fmt(n * a)}`;
  } else {
    const sum = (a * (Math.pow(r, n) - 1)) / (r - 1);
    steps.push({ note: 'The sum of the first n terms:', latex: `S_n = \\dfrac{a(r^{n} - 1)}{r - 1}` });
    steps.push({
      note: `Substitute to find the sum of the first ${n} terms.`,
      latex: `S_{${n}} = \\dfrac{${fmt(a)}\\left((${fmt(r)})^{${n}} - 1\\right)}{${fmt(r)} - 1} = ${fmt(sum, 4)}`,
      annotation: 'sum',
    });
    answer += `, \\quad S_{${n}} = ${fmt(sum, 4)}`;

    if (Math.abs(r) < 1) {
      const inf = a / (1 - r);
      steps.push({
        note: 'Because $|r| < 1$ the terms shrink towards zero, so the series converges to a limiting sum.',
        latex: `S_{\\infty} = \\dfrac{a}{1 - r} = \\dfrac{${fmt(a)}}{1 - ${fmt(r)}} = ${fmt(inf, 4)}`,
        annotation: 'limiting sum',
      });
      answer += `, \\quad S_{\\infty} = ${fmt(inf, 4)}`;
    }
  }

  return {
    ok: true,
    solution: {
      headline: `Geometric sequence: $a = ${fmt(a)}$, $r = ${fmt(r)}$`,
      methodName: 'Geometric sequence',
      steps,
      answerLatex: answer,
    },
  };
}

export const sequencesSolver: Solver = {
  id: 'sequences',
  title: 'Sequences & series',
  subjects: ['Specialist', 'General'],
  blurb: 'Arithmetic and geometric sequences: nth term and sums.',
  placeholder: 'e.g.  3, 7, 11, 15   or   a=3, r=2, n=10',
  methods: [
    { id: 'arithmetic', name: 'Arithmetic', blurb: 'Constant difference: tₙ = a + (n−1)d, Sₙ = n/2(2a + (n−1)d).' },
    { id: 'geometric', name: 'Geometric', blurb: 'Constant ratio: tₙ = arⁿ⁻¹, Sₙ = a(rⁿ−1)/(r−1), plus the limiting sum.' },
  ],
  defaultMethodId: 'arithmetic',
  detect(input) {
    const explicit = /sequence|series|nth term|arithmetic|geometric|common (difference|ratio)/i.test(input);
    // A list of three or more numbers that follows a constant pattern. Any
    // key=value pairs are set aside first, so "n=10  3, 7, 11, 15" — asking
    // for the 10th term of a listed sequence — still reads as a list.
    const list = listFrom(input);
    if (list && classify(list)) return explicit ? 0.97 : 0.9;
    const p = parseParams(input);
    if (p.a !== undefined && (p.d !== undefined || p.r !== undefined)) return explicit ? 0.97 : 0.85;
    return 0;
  },
  solve(input, methodId): SolveResult {
    let s: Seq;
    try {
      s = read(input, methodId);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that sequence.' };
    }
    // A typed list tells us which kind it is; otherwise trust the chosen tab.
    const kind = s.terms ? s.kind : methodId === 'geometric' ? 'geometric' : s.kind;
    return kind === 'geometric' ? geometric({ ...s, kind }) : arithmetic({ ...s, kind });
  },
};
