import { fmt, rad2deg } from '../../lib/math/num';
import type { Solver, Step, SolveResult, FieldSchema } from '../../lib/engine/types';

/**
 * Vectors in the plane and in three dimensions
 * (SACE Stage 1 Specialist Topic 3, Stage 2 Specialist Topic 4).
 */
type Vec = number[];

function vecTex(v: Vec, dp = 4): string {
  return `\\left\\langle ${v.map((x) => fmt(x, dp)).join(',\\, ')} \\right\\rangle`;
}
function colTex(v: Vec, dp = 4): string {
  return `\\begin{pmatrix} ${v.map((x) => fmt(x, dp)).join(' \\\\ ')} \\end{pmatrix}`;
}
function pointTex(label: string, v: Vec, dp = 4): string {
  return `${label}\\left(${v.map((x) => fmt(x, dp)).join(',\\, ')}\\right)`;
}

function parseVec(s: string): Vec {
  const inner = s.trim().replace(/^[([<]|[)\]>]$/g, '');
  const parts = inner.split(',').map((p) => Number(p.trim()));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('Write vectors like  (3, 4)  or  (1, 2, 3).');
  }
  return parts;
}

const VEC = '\\(?\\[?<?\\s*-?\\d*\\.?\\d+\\s*(?:,\\s*-?\\d*\\.?\\d+\\s*){1,2}\\)?\\]?>?';

interface Problem {
  op: 'add' | 'sub' | 'scale' | 'dot' | 'cross' | 'magnitude' | 'unit' | 'angle' | 'collinear' | 'ratio';
  a: Vec;
  b?: Vec;
  /** Third point, for collinear. */
  c?: Vec;
  /** Scalar, for scale. */
  k?: number;
  /** Ratio parts m:n, for ratio (P divides AB so AP:PB = m:n). */
  m?: number;
  n?: number;
}

function parse(input: string): Problem {
  const s = input.trim();

  const mag = s.match(new RegExp(`^\\|\\s*(${VEC})\\s*\\|$`)) ?? s.match(/^(?:magnitude|mod|length)\s*(.+)$/i);
  if (mag) return { op: 'magnitude', a: parseVec(mag[1]) };

  const unit = s.match(/^(?:unit|normalise|normalize)\s*(.+)$/i);
  if (unit) return { op: 'unit', a: parseVec(unit[1]) };

  const angle = s.match(new RegExp(`^angle\\s*(?:between\\s*)?(${VEC})\\s*(?:and|,)?\\s*(${VEC})$`, 'i'));
  if (angle) return { op: 'angle', a: parseVec(angle[1]), b: parseVec(angle[2]) };

  const collinear = s.match(new RegExp(`^collinear\\s+(${VEC})\\s+(${VEC})\\s+(${VEC})$`, 'i'));
  if (collinear) {
    return { op: 'collinear', a: parseVec(collinear[1]), b: parseVec(collinear[2]), c: parseVec(collinear[3]) };
  }

  const ratio = s.match(new RegExp(`^ratio\\s+(${VEC})\\s+(${VEC})\\s+(-?\\d+)\\s*:\\s*(-?\\d+)$`, 'i'));
  if (ratio) {
    return {
      op: 'ratio',
      a: parseVec(ratio[1]),
      b: parseVec(ratio[2]),
      m: Number(ratio[3]),
      n: Number(ratio[4]),
    };
  }

  const scale = s.match(new RegExp(`^(-?\\d*\\.?\\d+)\\s*[*×]?\\s*(${VEC})$`));
  if (scale) return { op: 'scale', a: parseVec(scale[2]), k: Number(scale[1]) };

  const bin = s.match(new RegExp(`^(${VEC})\\s*([+\\-]|[.·]|[x×])\\s*(${VEC})$`, 'i'));
  if (bin) {
    const opRaw = bin[2].toLowerCase();
    const op: Problem['op'] =
      opRaw === '+' ? 'add' : opRaw === '-' ? 'sub' : opRaw === '.' || opRaw === '·' ? 'dot' : 'cross';
    return { op, a: parseVec(bin[1]), b: parseVec(bin[3]) };
  }

  throw new Error('Try  (3,4) + (1,2),  (1,2,3) . (4,5,6),  |(3,4)|  or  angle (1,0) (1,1).');
}

const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
const mag = (a: Vec) => Math.sqrt(dot(a, a));

const POINT_FIELDS_3: FieldSchema[] = [
  { id: 'a', label: 'Point A', kind: 'point' },
  { id: 'b', label: 'Point B', kind: 'point' },
  { id: 'c', label: 'Point C', kind: 'point' },
];
const RATIO_FIELDS: FieldSchema[] = [
  { id: 'a', label: 'Point A', kind: 'point' },
  { id: 'b', label: 'Point B', kind: 'point' },
  { id: 'ratio', label: 'Ratio m : n', kind: 'ratio' },
];

export const vectorsSolver: Solver = {
  id: 'vectors',
  title: 'Vectors',
  subjects: ['Specialist'],
  blurb: 'Add, scale, dot and cross products, magnitude and angles.',
  placeholder: 'e.g.  (3,4) + (1,2)   or   (1,2,3) . (4,5,6)',
  methods: [
    { id: 'component', name: 'Component form', blurb: 'Work with the components directly — the everyday method.' },
    {
      id: 'collinear',
      name: 'Collinearity',
      blurb: 'Test whether three points all lie on one straight line.',
      fields: POINT_FIELDS_3,
      serialize: (v) => `collinear (${v.a.join(',')}) (${v.b.join(',')}) (${v.c.join(',')})`,
    },
    {
      id: 'ratio',
      name: 'Ratio of division',
      blurb: 'Find the point that divides a segment AB in a given ratio.',
      fields: RATIO_FIELDS,
      serialize: (v) => `ratio (${v.a.join(',')}) (${v.b.join(',')}) ${v.ratio[0]}:${v.ratio[1]}`,
    },
  ],
  defaultMethodId: 'component',
  detect(input) {
    try {
      parse(input);
      return 0.94;
    } catch {
      return 0;
    }
  },
  solve(input, methodId): SolveResult {
    let p: Problem;
    try {
      p = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read those vectors.' };
    }
    // Each method owns a disjoint set of ops — collinear/ratio input isn't a
    // wrong answer under 'component', it's simply not what that method
    // does. Without this, every method "succeeds" identically on any input
    // that parses at all, and distinctMethods (which probes each method id
    // against the same text to see whether they actually differ) collapses
    // all three into one, silently switching back to Component form the
    // moment a structured form's own submission is fingerprinted against it.
    if (methodId === 'collinear' && p.op !== 'collinear') {
      return { ok: false, error: 'Enter three points to test for collinearity.' };
    }
    if (methodId === 'ratio' && p.op !== 'ratio') {
      return { ok: false, error: 'Enter two points and a ratio.' };
    }
    if (methodId === 'component' && (p.op === 'collinear' || p.op === 'ratio')) {
      return { ok: false, error: 'Use the Collinearity or Ratio of division method for that.' };
    }
    const { a, b, k } = p;
    if (b && a.length !== b.length) {
      return { ok: false, error: 'Both vectors need the same number of components.' };
    }

    if (p.op === 'add' || p.op === 'sub') {
      const sign = p.op === 'add' ? 1 : -1;
      const out = a.map((x, i) => x + sign * b![i]);
      const symbol = p.op === 'add' ? '+' : '-';
      return {
        ok: true,
        solution: {
          headline: `Work out $${vecTex(a)} ${symbol} ${vecTex(b!)}$`,
          methodName: p.op === 'add' ? 'Vector addition' : 'Vector subtraction',
          steps: [
            { note: `${p.op === 'add' ? 'Add' : 'Subtract'} the matching components.`, latex: `${colTex(a)} ${symbol} ${colTex(b!)}` },
            {
              note: 'Work through component by component.',
              latex: `= \\begin{pmatrix} ${a.map((x, i) => `${fmt(x)} ${symbol} ${fmt(b![i])}`).join(' \\\\ ')} \\end{pmatrix}`,
            },
            { note: 'Simplify.', latex: `= ${colTex(out)} = ${vecTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: vecTex(out),
        },
      };
    }

    if (p.op === 'scale') {
      const out = a.map((x) => x * k!);
      return {
        ok: true,
        solution: {
          headline: `Work out $${fmt(k!)}${vecTex(a)}$`,
          methodName: 'Scalar multiple',
          steps: [
            { note: 'Multiply every component by the scalar.', latex: `${fmt(k!)} ${colTex(a)}` },
            { note: 'Work through each one.', latex: `= \\begin{pmatrix} ${a.map((x) => `${fmt(k!)} \\times ${fmt(x)}`).join(' \\\\ ')} \\end{pmatrix} = ${colTex(out)}` },
            { note: 'The direction is unchanged; the length is scaled.', latex: `= ${vecTex(out)}`, annotation: k! < 0 ? 'negative → reverses direction' : 'answer' },
          ],
          answerLatex: vecTex(out),
        },
      };
    }

    if (p.op === 'magnitude') {
      const m = mag(a);
      return {
        ok: true,
        solution: {
          headline: `Find $|${vecTex(a)}|$`,
          methodName: 'Magnitude',
          steps: [
            { note: 'The magnitude is the length — Pythagoras in as many dimensions as you have.', latex: `|\\mathbf{a}| = \\sqrt{${a.map((_, i) => `a_{${i + 1}}^{2}`).join(' + ')}}` },
            { note: 'Substitute the components.', latex: `= \\sqrt{${a.map((x) => `${fmt(x)}^{2}`).join(' + ')}} = \\sqrt{${fmt(dot(a, a))}}` },
            { note: 'Work it out.', latex: `= ${fmt(m, 4)}`, annotation: 'length' },
          ],
          answerLatex: `|\\mathbf{a}| = ${fmt(m, 4)}`,
        },
      };
    }

    if (p.op === 'unit') {
      const m = mag(a);
      if (m === 0) return { ok: false, error: 'The zero vector has no direction, so it has no unit vector.' };
      const out = a.map((x) => x / m);
      return {
        ok: true,
        solution: {
          headline: `Find the unit vector of $${vecTex(a)}$`,
          methodName: 'Unit vector',
          steps: [
            { note: 'A unit vector points the same way but has length 1.', latex: `\\hat{\\mathbf{a}} = \\dfrac{\\mathbf{a}}{|\\mathbf{a}|}` },
            { note: 'First find the magnitude.', latex: `|\\mathbf{a}| = \\sqrt{${fmt(dot(a, a))}} = ${fmt(m, 4)}` },
            { note: 'Divide each component by it.', latex: `\\hat{\\mathbf{a}} = \\dfrac{1}{${fmt(m, 4)}}${colTex(a)} = ${colTex(out)}`, annotation: 'length 1' },
          ],
          answerLatex: vecTex(out),
        },
      };
    }

    if (p.op === 'dot') {
      const d = dot(a, b!);
      const ma = mag(a);
      const mb = mag(b!);
      const steps: Step[] = [
        { note: 'The dot product multiplies matching components and adds the results.', latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${a.map((_, i) => `a_{${i + 1}}b_{${i + 1}}`).join(' + ')}` },
        { note: 'Substitute the components.', latex: `= ${a.map((x, i) => `(${fmt(x)})(${fmt(b![i])})`).join(' + ')}` },
        { note: 'Work it out.', latex: `= ${a.map((x, i) => fmt(x * b![i])).join(' + ')} = ${fmt(d)}`, annotation: 'scalar — not a vector' },
      ];
      if (ma > 0 && mb > 0) {
        const cos = d / (ma * mb);
        steps.push({
          note: 'The dot product also gives the angle between them.',
          latex: `\\cos\\theta = \\dfrac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|} = \\dfrac{${fmt(d)}}{${fmt(ma, 4)} \\times ${fmt(mb, 4)}} = ${fmt(cos, 4)}`,
        });
        steps.push({
          note: 'Take the inverse cosine.',
          latex: `\\theta = ${fmt(rad2deg(Math.acos(Math.max(-1, Math.min(1, cos)))), 2)}^{\\circ}`,
          annotation: Math.abs(d) < 1e-12 ? 'zero → perpendicular' : undefined,
        });
      }
      return {
        ok: true,
        solution: {
          headline: `Work out $${vecTex(a)} \\cdot ${vecTex(b!)}$`,
          methodName: 'Dot product',
          steps,
          answerLatex: `\\mathbf{a} \\cdot \\mathbf{b} = ${fmt(d)}`,
        },
      };
    }

    if (p.op === 'angle') {
      const d = dot(a, b!);
      const ma = mag(a);
      const mb = mag(b!);
      if (ma === 0 || mb === 0) return { ok: false, error: 'The zero vector has no direction, so there is no angle.' };
      const cos = Math.max(-1, Math.min(1, d / (ma * mb)));
      const deg = rad2deg(Math.acos(cos));
      return {
        ok: true,
        solution: {
          headline: `Find the angle between $${vecTex(a)}$ and $${vecTex(b!)}$`,
          methodName: 'Angle via the dot product',
          steps: [
            { note: 'Rearrange the dot product formula to make the angle the subject.', latex: `\\cos\\theta = \\dfrac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|}` },
            { note: 'Work out the dot product.', latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${a.map((x, i) => `(${fmt(x)})(${fmt(b![i])})`).join(' + ')} = ${fmt(d)}` },
            { note: 'Work out both magnitudes.', latex: `|\\mathbf{a}| = ${fmt(ma, 4)}, \\quad |\\mathbf{b}| = ${fmt(mb, 4)}` },
            { note: 'Substitute and take the inverse cosine.', latex: `\\theta = \\cos^{-1}\\!\\left(\\dfrac{${fmt(d)}}{${fmt(ma * mb, 4)}}\\right) = ${fmt(deg, 2)}^{\\circ}`, annotation: 'angle between' },
          ],
          answerLatex: `\\theta = ${fmt(deg, 2)}^{\\circ}`,
        },
      };
    }

    if (p.op === 'collinear') {
      const [A, B, C] = [a, b!, p.c!];
      if (![B, C].every((v) => v.length === A.length)) {
        return { ok: false, error: 'All three points need the same number of components.' };
      }
      const ab = B.map((x, i) => x - A[i]);
      const ac = C.map((x, i) => x - A[i]);
      const EPS = 1e-9;
      const pivot = ab.findIndex((x) => Math.abs(x) > EPS);
      if (pivot === -1) {
        return { ok: false, error: 'A and B must be different points to test collinearity.' };
      }
      const k = ac[pivot] / ab[pivot];
      const collinear = ac.every((x, j) => Math.abs(x - k * ab[j]) < EPS);
      const steps: Step[] = [
        {
          note: 'If three points are collinear, the vectors between them all point along the same line. Find two vectors that start from the same point, A.',
          latex: `\\vec{AB} = B - A, \\quad \\vec{AC} = C - A`,
        },
        {
          note: 'Substitute the coordinates.',
          latex: `\\vec{AB} = ${colTex(B)} - ${colTex(A)}, \\quad \\vec{AC} = ${colTex(C)} - ${colTex(A)}`,
        },
        {
          note: 'Work out each one.',
          latex: `\\vec{AB} = ${colTex(ab)}, \\quad \\vec{AC} = ${colTex(ac)}`,
        },
        {
          note: 'If A, B, C are collinear, AC is a scalar multiple of AB. Try matching one component to find that scalar.',
          latex: `k = \\dfrac{${fmt(ac[pivot])}}{${fmt(ab[pivot])}} = ${fmt(k, 4)}`,
          annotation: `component ${pivot + 1}`,
        },
      ];
      if (collinear) {
        steps.push({
          note: 'Check that the same k works for every other component too — it does.',
          latex: `\\vec{AC} = ${fmt(k, 4)}\\,\\vec{AB}`,
          annotation: 'true for every component',
        });
        steps.push({
          note: 'AB and AC point along the same line through A, so the three points are collinear.',
          latex: `A,\\ B,\\ C\\ \\text{are collinear}`,
          annotation: 'collinear',
        });
      } else {
        steps.push({
          note: 'Check the other components — at least one does not match, so no single k works for all of them.',
          latex: `\\vec{AC} \\neq ${fmt(k, 4)}\\,\\vec{AB}`,
          annotation: 'fails for another component',
        });
        steps.push({
          note: 'AB and AC are not parallel, so the three points do not all lie on one line.',
          latex: `A,\\ B,\\ C\\ \\text{are not collinear}`,
          annotation: 'not collinear',
        });
      }
      return {
        ok: true,
        solution: {
          headline: `Test whether $${pointTex('A', A)}, ${pointTex('B', B)}, ${pointTex('C', C)}$ are collinear`,
          methodName: 'Collinearity',
          steps,
          answerLatex: collinear ? `A,\\ B,\\ C\\ \\text{are collinear}` : `A,\\ B,\\ C\\ \\text{are not collinear}`,
        },
      };
    }

    if (p.op === 'ratio') {
      const [A, B] = [a, b!];
      const { m, n } = p;
      if (m === undefined || n === undefined || !Number.isFinite(m) || !Number.isFinite(n) || m <= 0 || n <= 0) {
        return { ok: false, error: 'Both parts of the ratio must be positive numbers.' };
      }
      const numerator = A.map((x, i) => n * x + m * B[i]);
      const P = numerator.map((x) => x / (m + n));
      return {
        ok: true,
        solution: {
          headline: `Find the point $P$ dividing $AB$ in the ratio $${fmt(m)}:${fmt(n)}$`,
          methodName: 'Ratio of division',
          steps: [
            {
              note: `The section formula for the point P dividing AB internally so that AP : PB = ${fmt(m)} : ${fmt(n)}.`,
              latex: `P = \\dfrac{n\\,A + m\\,B}{m + n}`,
            },
            {
              note: 'Substitute the ratio and the two points.',
              latex: `P = \\dfrac{${fmt(n)}${colTex(A)} + ${fmt(m)}${colTex(B)}}{${fmt(m)} + ${fmt(n)}}`,
            },
            {
              note: 'Work out the numerator.',
              latex: `P = \\dfrac{${colTex(numerator)}}{${fmt(m + n)}}`,
            },
            {
              note: `Divide every component by ${fmt(m + n)}.`,
              latex: `P = ${colTex(P)} = ${pointTex('P', P)}`,
              annotation: 'point of division',
            },
          ],
          answerLatex: pointTex('P', P),
        },
      };
    }

    // Cross product — three dimensions only.
    if (a.length !== 3) {
      return { ok: false, error: 'The cross product is only defined for three-dimensional vectors.' };
    }
    const [a1, a2, a3] = a;
    const [b1, b2, b3] = b!;
    const out = [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
    return {
      ok: true,
      solution: {
        headline: `Work out $${vecTex(a)} \\times ${vecTex(b!)}$`,
        methodName: 'Cross product',
        steps: [
          {
            note: 'Set up the determinant with the unit vectors along the top.',
            latex: `\\mathbf{a} \\times \\mathbf{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${fmt(a1)} & ${fmt(a2)} & ${fmt(a3)} \\\\ ${fmt(b1)} & ${fmt(b2)} & ${fmt(b3)} \\end{vmatrix}`,
          },
          {
            note: 'Expand along the top row.',
            latex: `= \\mathbf{i}(${fmt(a2)}\\times${fmt(b3)} - ${fmt(a3)}\\times${fmt(b2)}) - \\mathbf{j}(${fmt(a1)}\\times${fmt(b3)} - ${fmt(a3)}\\times${fmt(b1)}) + \\mathbf{k}(${fmt(a1)}\\times${fmt(b2)} - ${fmt(a2)}\\times${fmt(b1)})`,
          },
          { note: 'Work out each component.', latex: `= ${colTex(out)} = ${vecTex(out)}`, annotation: 'perpendicular to both' },
        ],
        answerLatex: vecTex(out),
      },
    };
  },
};
