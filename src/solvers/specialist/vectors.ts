import { fmt, rad2deg } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

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
  op: 'add' | 'sub' | 'scale' | 'dot' | 'cross' | 'magnitude' | 'unit' | 'angle';
  a: Vec;
  b?: Vec;
  k?: number;
}

function parse(input: string): Problem {
  const s = input.trim();

  const mag = s.match(new RegExp(`^\\|\\s*(${VEC})\\s*\\|$`)) ?? s.match(/^(?:magnitude|mod|length)\s*(.+)$/i);
  if (mag) return { op: 'magnitude', a: parseVec(mag[1]) };

  const unit = s.match(/^(?:unit|normalise|normalize)\s*(.+)$/i);
  if (unit) return { op: 'unit', a: parseVec(unit[1]) };

  const angle = s.match(new RegExp(`^angle\\s*(?:between\\s*)?(${VEC})\\s*(?:and|,)?\\s*(${VEC})$`, 'i'));
  if (angle) return { op: 'angle', a: parseVec(angle[1]), b: parseVec(angle[2]) };

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

export const vectorsSolver: Solver = {
  id: 'vectors',
  title: 'Vectors',
  subjects: ['Specialist'],
  blurb: 'Add, scale, dot and cross products, magnitude and angles.',
  placeholder: 'e.g.  (3,4) + (1,2)   or   (1,2,3) . (4,5,6)',
  methods: [
    { id: 'component', name: 'Component form', blurb: 'Work with the components directly — the everyday method.' },
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
  solve(input): SolveResult {
    let p: Problem;
    try {
      p = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read those vectors.' };
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
