import { fmt, parseParams, deg2rad, rad2deg } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Right-angled triangles. Sides a and b are the legs, c the hypotenuse;
 * angle A is opposite side a, B opposite b, and C = 90° throughout.
 */
interface RT {
  a?: number;
  b?: number;
  c?: number;
  A?: number;
  B?: number;
}

function read(input: string): RT {
  const p = parseParams(input);
  const rt: RT = {};
  if (p.a !== undefined) rt.a = p.a;
  if (p.b !== undefined) rt.b = p.b;
  if (p.c !== undefined) rt.c = p.c;
  if (p.A !== undefined) rt.A = p.A;
  if (p.B !== undefined) rt.B = p.B;
  // Friendly aliases students actually type.
  if (p.opp !== undefined) rt.a = p.opp;
  if (p.adj !== undefined) rt.b = p.adj;
  if (p.hyp !== undefined) rt.c = p.hyp;
  if (p.angle !== undefined && rt.A === undefined) rt.A = p.angle;
  return rt;
}

function countKnown(rt: RT): number {
  return [rt.a, rt.b, rt.c, rt.A, rt.B].filter((v) => v !== undefined).length;
}

const DEG = '^{\\circ}';

function finish(steps: Step[], methodName: string, headline: string, answer: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex: answer } };
}

/** A scale drawing of the finished triangle, once all three sides are known. */
function diagramStep(a: number, b: number, c: number, A?: number): Step {
  return {
    note: 'The finished triangle, drawn to scale.',
    visual: {
      kind: 'triangle',
      data: {
        a,
        b,
        c,
        C: 90,
        A: A ?? rad2deg(Math.asin(Math.min(1, a / c))),
        B: A !== undefined ? 90 - A : rad2deg(Math.asin(Math.min(1, b / c))),
        rightAngle: true,
      },
    },
  };
}

/* ------------------------------------------------------------- Pythagoras */
function byPythagoras(rt: RT): SolveResult {
  const { a, b, c } = rt;
  const steps: Step[] = [
    {
      note: 'In a right-angled triangle, Pythagoras’ theorem links the three sides.',
      latex: `a^{2} + b^{2} = c^{2}`,
      annotation: 'c is the hypotenuse',
    },
  ];

  if (a !== undefined && b !== undefined) {
    const cc = Math.sqrt(a * a + b * b);
    steps.push({
      note: 'Both short sides are known, so substitute and find the hypotenuse.',
      latex: `c^{2} = ${fmt(a, 4)}^{2} + ${fmt(b, 4)}^{2} = ${fmt(a * a, 4)} + ${fmt(b * b, 4)} = ${fmt(a * a + b * b, 4)}`,
    });
    steps.push({
      note: 'Take the square root of both sides.',
      latex: `c = \\sqrt{${fmt(a * a + b * b, 4)}} = ${fmt(cc)}`,
      annotation: 'hypotenuse',
    });
    steps.push(diagramStep(a, b, cc));
    return finish(steps, 'Pythagoras’ theorem', `Find the missing side ($a = ${fmt(a)}$, $b = ${fmt(b)}$)`, `c = ${fmt(cc)}`);
  }

  const known = a !== undefined ? a : b!;
  const label = a !== undefined ? 'a' : 'b';
  const target = a !== undefined ? 'b' : 'a';
  const hyp = c!;
  if (hyp <= known) {
    return { ok: false, error: 'The hypotenuse (c) must be the longest side of a right-angled triangle.' };
  }
  const other = Math.sqrt(hyp * hyp - known * known);
  steps.push({
    note: 'Rearrange to make the unknown short side the subject.',
    latex: `${target}^{2} = c^{2} - ${label}^{2}`,
  });
  steps.push({
    note: 'Substitute the known lengths.',
    latex: `${target}^{2} = ${fmt(hyp, 4)}^{2} - ${fmt(known, 4)}^{2} = ${fmt(hyp * hyp, 4)} - ${fmt(known * known, 4)} = ${fmt(hyp * hyp - known * known, 4)}`,
  });
  steps.push({
    note: 'Take the square root.',
    latex: `${target} = \\sqrt{${fmt(hyp * hyp - known * known, 4)}} = ${fmt(other)}`,
    annotation: 'missing side',
  });
  steps.push(
    target === 'b' ? diagramStep(known, other, hyp) : diagramStep(other, known, hyp),
  );
  return finish(steps, 'Pythagoras’ theorem', `Find the missing side ($${label} = ${fmt(known)}$, $c = ${fmt(hyp)}$)`, `${target} = ${fmt(other)}`);
}

/* ------------------------------------------------------------ Trig ratios */
function byTrigRatio(rt: RT): SolveResult {
  let { a, b, c, A, B } = rt;
  const steps: Step[] = [
    {
      note: 'Label the sides relative to the known angle, then pick the ratio that uses what you have.',
      latex: `\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}}, \\quad \\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}}, \\quad \\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}`,
      annotation: 'SOH CAH TOA',
    },
  ];

  // A second angle is just 90° minus the first.
  if (A === undefined && B !== undefined) {
    A = 90 - B;
    steps.push({
      note: 'The acute angles in a right-angled triangle add to 90°.',
      latex: `A = 90${DEG} - ${fmt(B)}${DEG} = ${fmt(A)}${DEG}`,
    });
  }

  // Case 1: an angle and a side are known → find a side.
  if (A !== undefined) {
    const r = deg2rad(A);
    if (c !== undefined) {
      const side = c * Math.sin(r);
      steps.push({
        note: 'The hypotenuse is known and we want the side opposite the angle, so use sine.',
        latex: `\\sin ${fmt(A)}${DEG} = \\dfrac{a}{${fmt(c)}}`,
      });
      steps.push({
        note: 'Multiply both sides by the hypotenuse.',
        latex: `a = ${fmt(c)} \\times \\sin ${fmt(A)}${DEG} = ${fmt(side)}`,
        annotation: 'opposite side',
      });
      return finish(steps, 'Trigonometric ratios', `Find the missing side ($A = ${fmt(A)}${DEG}$, $c = ${fmt(c)}$)`, `a = ${fmt(side)}`);
    }
    if (a !== undefined) {
      const hyp = a / Math.sin(r);
      steps.push({
        note: 'The side opposite the angle is known and we want the hypotenuse, so use sine.',
        latex: `\\sin ${fmt(A)}${DEG} = \\dfrac{${fmt(a)}}{c}`,
      });
      steps.push({
        note: 'Rearrange for the hypotenuse.',
        latex: `c = \\dfrac{${fmt(a)}}{\\sin ${fmt(A)}${DEG}} = ${fmt(hyp)}`,
        annotation: 'hypotenuse',
      });
      return finish(steps, 'Trigonometric ratios', `Find the missing side ($A = ${fmt(A)}${DEG}$, $a = ${fmt(a)}$)`, `c = ${fmt(hyp)}`);
    }
    if (b !== undefined) {
      const opp = b * Math.tan(r);
      steps.push({
        note: 'The adjacent side is known and we want the opposite side, so use tangent.',
        latex: `\\tan ${fmt(A)}${DEG} = \\dfrac{a}{${fmt(b)}}`,
      });
      steps.push({
        note: 'Multiply both sides by the adjacent side.',
        latex: `a = ${fmt(b)} \\times \\tan ${fmt(A)}${DEG} = ${fmt(opp)}`,
        annotation: 'opposite side',
      });
      return finish(steps, 'Trigonometric ratios', `Find the missing side ($A = ${fmt(A)}${DEG}$, $b = ${fmt(b)}$)`, `a = ${fmt(opp)}`);
    }
  }

  // Case 2: two sides known → find the angle with an inverse ratio.
  if (a !== undefined && c !== undefined) {
    const ang = rad2deg(Math.asin(a / c));
    steps.push({ note: 'We know the opposite side and the hypotenuse, so use sine.', latex: `\\sin A = \\dfrac{${fmt(a)}}{${fmt(c)}} = ${fmt(a / c, 4)}` });
    steps.push({ note: 'Apply the inverse sine to find the angle.', latex: `A = \\sin^{-1}\\left(${fmt(a / c, 4)}\\right) = ${fmt(ang)}${DEG}`, annotation: 'angle' });
    return finish(steps, 'Trigonometric ratios', `Find the angle ($a = ${fmt(a)}$, $c = ${fmt(c)}$)`, `A = ${fmt(ang)}${DEG}`);
  }
  if (b !== undefined && c !== undefined) {
    const ang = rad2deg(Math.acos(b / c));
    steps.push({ note: 'We know the adjacent side and the hypotenuse, so use cosine.', latex: `\\cos A = \\dfrac{${fmt(b)}}{${fmt(c)}} = ${fmt(b / c, 4)}` });
    steps.push({ note: 'Apply the inverse cosine to find the angle.', latex: `A = \\cos^{-1}\\left(${fmt(b / c, 4)}\\right) = ${fmt(ang)}${DEG}`, annotation: 'angle' });
    return finish(steps, 'Trigonometric ratios', `Find the angle ($b = ${fmt(b)}$, $c = ${fmt(c)}$)`, `A = ${fmt(ang)}${DEG}`);
  }
  if (a !== undefined && b !== undefined) {
    const ang = rad2deg(Math.atan(a / b));
    steps.push({ note: 'We know the opposite and adjacent sides, so use tangent.', latex: `\\tan A = \\dfrac{${fmt(a)}}{${fmt(b)}} = ${fmt(a / b, 4)}` });
    steps.push({ note: 'Apply the inverse tangent to find the angle.', latex: `A = \\tan^{-1}\\left(${fmt(a / b, 4)}\\right) = ${fmt(ang)}${DEG}`, annotation: 'angle' });
    return finish(steps, 'Trigonometric ratios', `Find the angle ($a = ${fmt(a)}$, $b = ${fmt(b)}$)`, `A = ${fmt(ang)}${DEG}`);
  }

  return { ok: false, error: 'Give an angle and a side (e.g. A=30, c=10), or two sides (e.g. a=5, c=13).' };
}

export const rightTriangleSolver: Solver = {
  id: 'right-triangle',
  title: 'Right-angled triangles',
  subjects: ['General', 'Methods'],
  blurb: 'Pythagoras and SOH CAH TOA in a right-angled triangle.',
  placeholder: 'e.g.  a=3, b=4   or   A=30, c=10',
  methods: [
    { id: 'pythagoras', name: 'Pythagoras', blurb: 'a² + b² = c². Use it when you know two sides and want the third.' },
    { id: 'trig-ratio', name: 'SOH CAH TOA', blurb: 'Sine, cosine and tangent ratios — when an angle is involved.' },
  ],
  defaultMethodId: 'pythagoras',
  detect(input) {
    const rt = read(input);
    const n = countKnown(rt);
    if (n !== 2) return 0; // three knowns means a general triangle
    const explicit = /right|pythag|hyp|opp|adj|soh|cah|toa/i.test(input);
    const sides = [rt.a, rt.b, rt.c].filter((v) => v !== undefined).length;
    const angles = [rt.A, rt.B].filter((v) => v !== undefined).length;
    if (sides === 2 || (sides === 1 && angles === 1)) return explicit ? 0.95 : 0.75;
    return 0;
  },
  solve(input, methodId): SolveResult {
    const rt = read(input);
    if (countKnown(rt) < 2) {
      return { ok: false, error: 'Give two known values, e.g.  a=3, b=4  or  A=30, c=10.' };
    }
    const sides = [rt.a, rt.b, rt.c].filter((v) => v !== undefined).length;
    const hasAngle = rt.A !== undefined || rt.B !== undefined;

    // Pythagoras needs two sides; fall back sensibly rather than erroring.
    if (methodId === 'pythagoras') {
      if (sides >= 2) return byPythagoras(rt);
      if (hasAngle) return byTrigRatio(rt);
      return { ok: false, error: 'Pythagoras needs two side lengths, e.g.  a=3, b=4.' };
    }
    if (sides >= 2 && !hasAngle) return byTrigRatio(rt);
    return byTrigRatio(rt);
  },
};
