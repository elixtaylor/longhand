import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Matrices (SACE Stage 1 Specialist Topic 5, Stage 2 General "Modelling with
 * matrices"): addition, multiplication, determinant and inverse.
 */
type Matrix = number[][];

function mTex(m: Matrix, dp = 4): string {
  return `\\begin{pmatrix} ${m.map((row) => row.map((x) => fmt(x, dp)).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
}

function parseMatrix(s: string): Matrix {
  const rows = [...s.matchAll(/\[([^\][]*)\]/g)].map((m) => m[1]);
  if (rows.length === 0) throw new Error('Write matrices like  [[1,2],[3,4]].');
  const out = rows.map((r) =>
    r
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((x) => !Number.isNaN(x)),
  );
  const width = out[0].length;
  if (width === 0 || out.some((r) => r.length !== width)) {
    throw new Error('Every row of a matrix needs the same number of entries.');
  }
  return out;
}

/** Split "[[…]] op [[…]]" into the two matrices and the operator. */
function splitMatrices(input: string): { a: Matrix; b?: Matrix; op: string; k?: number } {
  const s = input.trim();

  const det = s.match(/^(?:det|determinant)\s*(.+)$/i);
  if (det) return { a: parseMatrix(det[1]), op: 'det' };

  const inv = s.match(/^(?:inv|inverse)\s*(.+)$/i);
  if (inv) return { a: parseMatrix(inv[1]), op: 'inverse' };

  const scalar = s.match(/^(-?\d*\.?\d+)\s*[*×]?\s*(\[\[.+\]\])$/);
  if (scalar) return { a: parseMatrix(scalar[2]), op: 'scale', k: Number(scalar[1]) };

  const parts = s.match(/^(\[\[.*?\]\])\s*([+\-*×])\s*(\[\[.*?\]\])$/);
  if (parts) {
    return { a: parseMatrix(parts[1]), b: parseMatrix(parts[3]), op: parts[2] === '×' ? '*' : parts[2] };
  }

  // A lone matrix: show its determinant if square.
  if (/^\[\[.*\]\]$/.test(s)) return { a: parseMatrix(s), op: 'det' };

  throw new Error('Try  [[1,2],[3,4]] * [[5,6],[7,8]],  det [[1,2],[3,4]]  or  inverse [[1,2],[3,4]].');
}

function determinant(m: Matrix): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  // Laplace expansion along the first row.
  return m[0].reduce((sum, v, j) => {
    const minor = m.slice(1).map((row) => row.filter((_, jj) => jj !== j));
    return sum + (j % 2 === 0 ? 1 : -1) * v * determinant(minor);
  }, 0);
}

export const matricesSolver: Solver = {
  id: 'matrices',
  title: 'Matrices',
  subjects: ['General', 'Specialist'],
  blurb: 'Add, multiply, and find determinants and inverses.',
  placeholder: 'e.g.  [[1,2],[3,4]] * [[5,6],[7,8]]',
  methods: [
    { id: 'standard', name: 'Standard operations', blurb: 'Row-by-column multiplication, and the ad − bc rule for 2×2 determinants.' },
  ],
  defaultMethodId: 'standard',
  detect(input) {
    if (!/\[\[/.test(input)) return 0;
    try {
      splitMatrices(input);
      return 0.96;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let parsed: { a: Matrix; b?: Matrix; op: string; k?: number };
    try {
      parsed = splitMatrices(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that matrix.' };
    }
    const { a, b, op, k } = parsed;

    if (op === '+' || op === '-') {
      if (!b || a.length !== b.length || a[0].length !== b[0].length) {
        return { ok: false, error: 'To add or subtract, both matrices must be the same size.' };
      }
      const sign = op === '+' ? 1 : -1;
      const out = a.map((row, i) => row.map((v, j) => v + sign * b[i][j]));
      return {
        ok: true,
        solution: {
          headline: `Work out $${mTex(a)} ${op} ${mTex(b)}$`,
          methodName: op === '+' ? 'Matrix addition' : 'Matrix subtraction',
          steps: [
            { note: `${op === '+' ? 'Add' : 'Subtract'} the entries in matching positions.`, latex: `${mTex(a)} ${op} ${mTex(b)}` },
            {
              note: 'Work through position by position.',
              latex: `= \\begin{pmatrix} ${a.map((row, i) => row.map((v, j) => `${fmt(v)} ${op} ${fmt(b[i][j])}`).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`,
            },
            { note: 'Simplify.', latex: `= ${mTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: mTex(out),
        },
      };
    }

    if (op === 'scale') {
      const out = a.map((row) => row.map((v) => v * k!));
      return {
        ok: true,
        solution: {
          headline: `Work out $${fmt(k!)}${mTex(a)}$`,
          methodName: 'Scalar multiplication',
          steps: [
            { note: 'Multiply every entry by the scalar.', latex: `${fmt(k!)} ${mTex(a)}` },
            { note: 'Work through each entry.', latex: `= ${mTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: mTex(out),
        },
      };
    }

    if (op === '*') {
      if (!b) return { ok: false, error: 'Multiplication needs two matrices.' };
      if (a[0].length !== b.length) {
        return {
          ok: false,
          error: `You can't multiply a ${a.length}×${a[0].length} by a ${b.length}×${b[0].length} — the first matrix's columns must match the second's rows.`,
        };
      }
      const out = a.map((row) => b[0].map((_, j) => row.reduce((s, v, kk) => s + v * b[kk][j], 0)));
      const workings = a
        .map((row) =>
          b[0]
            .map((_, j) => row.map((v, kk) => `${fmt(v)}\\times${fmt(b[kk][j])}`).join(' + '))
            .join(' & '),
        )
        .join(' \\\\ ');
      return {
        ok: true,
        solution: {
          headline: `Work out $${mTex(a)}${mTex(b)}$`,
          methodName: 'Matrix multiplication',
          steps: [
            {
              note: `Check the sizes match: a ${a.length}×${a[0].length} times a ${b.length}×${b[0].length} gives a ${a.length}×${b[0].length}.`,
              latex: `(${a.length} \\times ${a[0].length})(${b.length} \\times ${b[0].length}) \\rightarrow ${a.length} \\times ${b[0].length}`,
              annotation: 'inner numbers match',
            },
            {
              note: 'Each entry is a row of the first matrix dotted with a column of the second.',
              latex: `= \\begin{pmatrix} ${workings} \\end{pmatrix}`,
            },
            { note: 'Work out each entry.', latex: `= ${mTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: mTex(out),
        },
      };
    }

    // Determinant and inverse both need a square matrix.
    if (a.length !== a[0].length) {
      return { ok: false, error: 'Only a square matrix has a determinant or an inverse.' };
    }
    const det = determinant(a);

    if (op === 'det') {
      const steps: Step[] = [{ note: 'Write down the matrix.', latex: mTex(a) }];
      if (a.length === 2) {
        steps.push({ note: 'For a 2×2 matrix the determinant is $ad - bc$.', latex: `\\det = ad - bc` });
        steps.push({
          note: 'Substitute the entries.',
          latex: `\\det = (${fmt(a[0][0])})(${fmt(a[1][1])}) - (${fmt(a[0][1])})(${fmt(a[1][0])}) = ${fmt(a[0][0] * a[1][1])} - ${fmt(a[0][1] * a[1][0])}`,
        });
      } else {
        steps.push({ note: 'Expand along the first row, alternating the signs.', latex: `\\det = \\sum_{j} (-1)^{1+j} a_{1j} M_{1j}` });
      }
      steps.push({
        note: 'Work it out.',
        latex: `\\det = ${fmt(det)}`,
        annotation: det === 0 ? 'zero → singular, no inverse' : 'determinant',
      });
      return {
        ok: true,
        solution: { headline: `Find the determinant of $${mTex(a)}$`, methodName: 'Determinant', steps, answerLatex: `\\det = ${fmt(det)}` },
      };
    }

    // Inverse (2×2 only — the SACE case).
    if (a.length !== 2) {
      return { ok: false, error: 'This handles inverses of 2×2 matrices. For the determinant of a bigger matrix, try  det [[…]].' };
    }
    if (det === 0) {
      return {
        ok: true,
        solution: {
          headline: `Find the inverse of $${mTex(a)}$`,
          methodName: 'Inverse',
          steps: [
            { note: 'Start with the determinant — a matrix only has an inverse when it isn’t zero.', latex: `\\det = ad - bc = (${fmt(a[0][0])})(${fmt(a[1][1])}) - (${fmt(a[0][1])})(${fmt(a[1][0])}) = 0` },
            { note: 'The determinant is zero, so this matrix is singular and has no inverse.', latex: `\\text{No inverse exists}`, annotation: 'singular' },
          ],
        },
      };
    }
    const [[p, q], [r, s]] = a;
    const out = [
      [s / det, -q / det],
      [-r / det, p / det],
    ];
    return {
      ok: true,
      solution: {
        headline: `Find the inverse of $${mTex(a)}$`,
        methodName: 'Inverse of a 2×2 matrix',
        steps: [
          { note: 'First find the determinant.', latex: `\\det = ad - bc = (${fmt(p)})(${fmt(s)}) - (${fmt(q)})(${fmt(r)}) = ${fmt(det)}`, annotation: 'not zero → an inverse exists' },
          { note: 'Swap the entries on the leading diagonal and negate the other two.', latex: `\\text{adj} = \\begin{pmatrix} ${fmt(s)} & ${fmt(-q)} \\\\ ${fmt(-r)} & ${fmt(p)} \\end{pmatrix}` },
          { note: 'Divide by the determinant.', latex: `A^{-1} = \\dfrac{1}{${fmt(det)}}\\begin{pmatrix} ${fmt(s)} & ${fmt(-q)} \\\\ ${fmt(-r)} & ${fmt(p)} \\end{pmatrix}` },
          { note: 'Work out each entry.', latex: `A^{-1} = ${mTex(out)}`, annotation: 'inverse' },
        ],
        answerLatex: mTex(out),
      },
    };
  },
};
