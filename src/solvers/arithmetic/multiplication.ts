import type { Solver, Step, SolveResult } from '../../lib/engine/types';
import type { GridMultiplyData } from '../../lib/engine/visuals';

function parsePair(input: string): { a: number; b: number } {
  const cleaned = input.replace(/[×⋅*]/g, '*').replace(/\s+/g, '');
  const parts = cleaned.split('*');
  if (parts.length !== 2 || parts.some((p) => !/^-?\d+$/.test(p))) {
    throw new Error('Enter two whole numbers to multiply, e.g.  234 × 56');
  }
  return { a: parseInt(parts[0], 10), b: parseInt(parts[1], 10) };
}

/** Place-value parts of |n|, largest first, skipping zero places: 234 → [200,30,4]. */
function partsOf(n: number): number[] {
  const s = String(Math.abs(n));
  const parts: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    if (d !== 0) parts.push(d * Math.pow(10, s.length - 1 - i));
  }
  return parts;
}

const PLACE_NAMES = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands'];

/* -------------------------------------------------------------- column method */
function solveByColumn(a: number, b: number): SolveResult {
  const A = Math.abs(a);
  const B = Math.abs(b);
  const neg = a * b < 0;
  const bStr = String(B);

  const partials: { digit: number; place: number; value: number }[] = [];
  for (let i = 0; i < bStr.length; i++) {
    const digit = Number(bStr[i]);
    const place = Math.pow(10, bStr.length - 1 - i);
    if (digit !== 0) partials.push({ digit, place, value: A * digit * place });
  }

  const steps: Step[] = [
    {
      note: 'Set the numbers out in a column, larger number on top.',
      latex: `\\begin{array}{r} ${A} \\\\ \\times\\; ${B} \\\\ \\hline \\end{array}`,
    },
  ];

  partials.forEach((p) => {
    const placeName = PLACE_NAMES[Math.log10(p.place)] ?? `×${p.place}`;
    steps.push({
      note: `Multiply ${A} by the ${placeName} digit (${p.digit}).`,
      latex: `${A} \\times ${p.digit}${p.place > 1 ? ` \\times ${p.place}` : ''} = ${p.value}`,
    });
  });

  const total = A * B;
  if (partials.length > 1) {
    steps.push({
      note: 'Add the partial products.',
      latex: `\\begin{array}{r} ${partials.map((p) => p.value).join(' \\\\ ')} \\\\ \\hline ${total} \\end{array}`,
    });
  }

  steps.push({
    note: neg ? 'Apply the sign — one number was negative.' : 'That gives the product.',
    latex: `${a} \\times ${b} = ${neg ? -total : total}`,
    annotation: 'product',
  });

  return {
    ok: true,
    solution: {
      headline: `Work out $${a} \\times ${b}$`,
      methodName: 'Column (long) multiplication',
      steps,
      answerLatex: `${neg ? -total : total}`,
    },
  };
}

/* ---------------------------------------------------------------- grid method */
function solveByGrid(a: number, b: number): SolveResult {
  const A = Math.abs(a);
  const B = Math.abs(b);
  const neg = a * b < 0;
  const colParts = partsOf(A);
  const rowParts = partsOf(B);
  const total = A * B;

  const data: GridMultiplyData = { a: A, b: B, colParts, rowParts, total };

  const steps: Step[] = [
    {
      note: 'Split each number into its place-value parts.',
      latex: `${A} = ${colParts.join(' + ')} \\qquad ${B} = ${rowParts.join(' + ')}`,
    },
    {
      note: 'Multiply every row part by every column part and fill the grid.',
      visual: { kind: 'grid-multiply', data },
    },
    {
      note: 'Add all the parts of the grid together.',
      latex: `${allCells(colParts, rowParts).join(' + ')} = ${total}`,
    },
    {
      note: neg ? 'Apply the sign — one number was negative.' : 'That gives the product.',
      latex: `${a} \\times ${b} = ${neg ? -total : total}`,
      annotation: 'product',
    },
  ];

  return {
    ok: true,
    solution: {
      headline: `Work out $${a} \\times ${b}$`,
      methodName: 'Grid (area) method',
      steps,
      answerLatex: `${neg ? -total : total}`,
    },
  };
}

function allCells(colParts: number[], rowParts: number[]): number[] {
  const out: number[] = [];
  for (const r of rowParts) for (const c of colParts) out.push(r * c);
  return out;
}

export const multiplicationSolver: Solver = {
  id: 'multiplication',
  title: 'Multiplication',
  subjects: ['Foundations'],
  blurb: 'Multiply two whole numbers, step by step.',
  placeholder: 'e.g.  234 × 56',
  methods: [
    { id: 'grid', name: 'Grid / box', blurb: 'Split by place value into a grid, multiply each cell, then add. Great for seeing why it works.' },
    { id: 'column', name: 'Column (long)', blurb: 'The traditional vertical algorithm with partial products.' },
  ],
  defaultMethodId: 'grid',
  detect(input) {
    const s = input.replace(/\s+/g, '');
    if (/[a-zA-Z]/.test(s)) return 0;
    return /^-?\d+[×*⋅]-?\d+$/.test(s) ? 0.95 : 0;
  },
  solve(input, methodId): SolveResult {
    let pair: { a: number; b: number };
    try {
      pair = parsePair(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
    return methodId === 'column' ? solveByColumn(pair.a, pair.b) : solveByGrid(pair.a, pair.b);
  },
};
