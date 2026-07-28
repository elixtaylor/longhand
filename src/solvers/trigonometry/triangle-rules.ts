import { fmt, parseParams, formatParams, deg2rad, rad2deg, round } from '../../lib/math/num';
import type { Solver, Step, SolveResult, FieldSchema } from '../../lib/engine/types';

/**
 * Non-right-angled triangles: the sine rule, the cosine rule, and area.
 * Sides a, b, c sit opposite angles A, B, C respectively.
 */
interface Tri {
  a?: number;
  b?: number;
  c?: number;
  A?: number;
  B?: number;
  C?: number;
}

const DEG = '^{\\circ}';

function read(input: string): Tri {
  const p = parseParams(input);
  const t: Tri = {};
  for (const k of ['a', 'b', 'c', 'A', 'B', 'C'] as const) {
    if (p[k] !== undefined) t[k] = p[k];
  }
  return t;
}
function known(t: Tri): number {
  return [t.a, t.b, t.c, t.A, t.B, t.C].filter((v) => v !== undefined).length;
}
function sides(t: Tri): number {
  return [t.a, t.b, t.c].filter((v) => v !== undefined).length;
}
function angles(t: Tri): number {
  return [t.A, t.B, t.C].filter((v) => v !== undefined).length;
}

function finish(steps: Step[], methodName: string, headline: string, answer?: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex: answer } };
}

/**
 * A scale drawing of the triangle once all three sides are known. Any angles
 * not yet worked out are filled in from the cosine rule, so the picture is
 * fully labelled even when the working only asked for one of them.
 */
function diagramStep(a: number, b: number, c: number): Step | null {
  if (![a, b, c].every((s) => Number.isFinite(s) && s > 0)) return null;
  if (a + b <= c || a + c <= b || b + c <= a) return null;
  const ang = (opp: number, x: number, y: number) =>
    rad2deg(Math.acos(Math.max(-1, Math.min(1, (x * x + y * y - opp * opp) / (2 * x * y)))));
  return {
    note: 'The triangle drawn to scale, with every side and angle labelled.',
    visual: {
      kind: 'triangle',
      data: { a, b, c, A: ang(a, b, c), B: ang(b, a, c), C: ang(c, a, b) },
    },
  };
}

/** Pair up each side with its opposite angle. */
const PAIRS: Array<['a' | 'b' | 'c', 'A' | 'B' | 'C']> = [
  ['a', 'A'],
  ['b', 'B'],
  ['c', 'C'],
];

/**
 * Why the given measurements cannot be a triangle, or null if they can.
 *
 * Every solver here assumed its inputs were sane. They are typed by hand, so
 * they are not: a mistyped angle of 200°, or a length entered as −7, produced
 * confident nonsense (including negative areas and negative side lengths)
 * rather than being turned away.
 */
function whyImpossible(t: Tri): string | null {
  for (const k of ['a', 'b', 'c'] as const) {
    const v = t[k];
    if (v !== undefined && v <= 0) {
      return `A side length has to be positive, and ${k} = ${fmt(v)}.`;
    }
  }
  for (const k of ['A', 'B', 'C'] as const) {
    const v = t[k];
    if (v !== undefined && (v <= 0 || v >= 180)) {
      return `An angle in a triangle is between 0° and 180°, and ${k} = ${fmt(v)}°.`;
    }
  }
  const given = (['A', 'B', 'C'] as const).map((k) => t[k]).filter((v): v is number => v !== undefined);
  const sum = given.reduce((x, y) => x + y, 0);
  if (given.length >= 2 && sum >= 180) {
    return `The angles given already add to ${fmt(sum)}°, and a triangle's three angles add to exactly 180°.`;
  }
  return null;
}

/* -------------------------------------------------------------- sine rule */
function bySineRule(t: Tri): SolveResult {
  const steps: Step[] = [
    {
      note: 'The sine rule links each side with the angle opposite it.',
      latex: `\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}`,
    },
  ];
  const tri: Tri = { ...t };

  // With two angles the third follows from the angle sum.
  if (angles(tri) === 2) {
    const [missing, sum] = missingAngle(tri);
    if (missing) {
      tri[missing] = 180 - sum;
      steps.push({
        note: 'The angles in a triangle add to 180°, so find the third angle first.',
        latex: `${missing} = 180${DEG} - ${fmt(sum)}${DEG} = ${fmt(tri[missing]!)}${DEG}`,
      });
    }
  }

  // A complete side/angle pair is the anchor for everything else.
  const anchor = PAIRS.find(([s, ang]) => tri[s] !== undefined && tri[ang] !== undefined);
  if (!anchor) {
    return {
      ok: false,
      error: 'The sine rule needs a matching side and opposite angle (e.g. a=7, A=35) plus one more value.',
    };
  }
  const [as, aa] = anchor;
  const aSide = tri[as]!;
  const aAng = tri[aa]!;

  // Find a side whose opposite angle is known.
  const targetSide = PAIRS.find(([s, ang]) => tri[s] === undefined && tri[ang] !== undefined);
  if (targetSide) {
    const [ts, ta] = targetSide;
    const val = (aSide * Math.sin(deg2rad(tri[ta]!))) / Math.sin(deg2rad(aAng));
    steps.push({
      note: `Use the pair we know to find side ${ts}.`,
      latex: `\\dfrac{${ts}}{\\sin ${fmt(tri[ta]!)}${DEG}} = \\dfrac{${fmt(aSide)}}{\\sin ${fmt(aAng)}${DEG}}`,
    });
    steps.push({
      note: `Multiply both sides by $\\sin ${fmt(tri[ta]!)}${DEG}$.`,
      latex: `${ts} = \\dfrac{${fmt(aSide)} \\times \\sin ${fmt(tri[ta]!)}${DEG}}{\\sin ${fmt(aAng)}${DEG}} = ${fmt(val)}`,
      annotation: 'side found',
    });
    return finish(steps, 'Sine rule', 'Solve the triangle', `${ts} = ${fmt(val)}`);
  }

  // Otherwise find an angle whose opposite side is known (the ambiguous case).
  const targetAng = PAIRS.find(([s, ang]) => tri[ang] === undefined && tri[s] !== undefined);
  if (targetAng) {
    const [ts, ta] = targetAng;
    const sinVal = (tri[ts]! * Math.sin(deg2rad(aAng))) / aSide;
    if (sinVal > 1) {
      // Not a failure to understand the question — a genuine conclusion, and
      // one the exercise is usually testing. Show the working that proves it.
      steps.push({
        note: `Rearrange the sine rule to find angle ${ta}.`,
        latex: `\\sin ${ta} = \\dfrac{${fmt(tri[ts]!)} \\times \\sin ${fmt(aAng)}${DEG}}{${fmt(aSide)}} = ${fmt(sinVal, 4)}`,
      });
      steps.push({
        note: 'But $\\sin$ can never exceed 1, so no angle satisfies this. No such triangle can be drawn.',
        latex: `\\sin ${ta} = ${fmt(sinVal, 4)} > 1 \\;\\Rightarrow\\; \\text{no triangle exists}`,
        annotation: 'the ambiguous case, with no solution',
      });
      steps.push({
        note: `Sense-check: side ${ts} = ${fmt(tri[ts]!)} is longer than side ${as} = ${fmt(aSide)}, so angle ${ta} would have to be bigger than ${fmt(aAng)}${DEG.replace('^{\\circ}', '°')} — and there is no room for that in a triangle.`,
        latex: `${fmt(tri[ts]!)} > ${fmt(aSide)} \\text{ but } ${ta} \\text{ cannot exceed } 180${DEG} - ${fmt(aAng)}${DEG}`,
      });
      return finish(steps, 'Sine rule', 'Solve the triangle');
    }
    const ang = rad2deg(Math.asin(sinVal));
    steps.push({
      note: `Rearrange the sine rule to find angle ${ta}.`,
      latex: `\\dfrac{\\sin ${ta}}{${fmt(tri[ts]!)}} = \\dfrac{\\sin ${fmt(aAng)}${DEG}}{${fmt(aSide)}}`,
    });
    steps.push({
      note: 'Multiply through, then take the inverse sine.',
      latex: `\\sin ${ta} = \\dfrac{${fmt(tri[ts]!)} \\times \\sin ${fmt(aAng)}${DEG}}{${fmt(aSide)}} = ${fmt(sinVal, 4)}`,
    });
    // sin B = sin(180° − B), so there may be a second triangle — but only if
    // its angles still fit inside 180°. Offering "or 156.42°" next to a
    // 30° angle proposes a triangle that cannot be drawn.
    const obtuse = 180 - ang;
    const secondTriangle = obtuse !== ang && obtuse + aAng < 180;
    steps.push({
      note: 'Apply the inverse sine.',
      latex: `${ta} = \\sin^{-1}(${fmt(sinVal, 4)}) = ${fmt(ang)}${DEG}`,
      annotation: secondTriangle ? `or ${fmt(obtuse)}° — check the ambiguous case` : 'angle found',
    });
    if (secondTriangle) {
      steps.push({
        note: `Because $\\sin ${ta} = \\sin(180${DEG} - ${ta})$, a second triangle fits: ${ta} = ${fmt(obtuse)}${DEG.replace('^{\\circ}', '°')} still leaves ${fmt(180 - obtuse - aAng)}${DEG.replace('^{\\circ}', '°')} for the third angle.`,
        latex: `${ta} = ${fmt(ang)}${DEG} \\quad\\text{or}\\quad ${ta} = ${fmt(obtuse)}${DEG}`,
      });
    }
    return finish(steps, 'Sine rule', 'Solve the triangle', `${ta} = ${fmt(ang)}${DEG}`);
  }

  return { ok: false, error: 'Give one more measurement so there is something to find.' };
}

function missingAngle(t: Tri): ['A' | 'B' | 'C' | null, number] {
  const entries: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  const missing = entries.find((k) => t[k] === undefined) ?? null;
  const sum = entries.reduce((acc, k) => acc + (t[k] ?? 0), 0);
  return [missing, sum];
}

/* ------------------------------------------------------------ cosine rule */
function byCosineRule(t: Tri): SolveResult {
  const steps: Step[] = [
    {
      note: 'The cosine rule handles two sides with the angle between them, or all three sides.',
      latex: `c^{2} = a^{2} + b^{2} - 2ab\\cos C`,
    },
  ];

  // SSS → find an angle.
  if (t.a !== undefined && t.b !== undefined && t.c !== undefined) {
    const { a, b, c } = t;
    if (a + b <= c || a + c <= b || b + c <= a) {
      return { ok: false, error: 'Those three lengths can’t form a triangle (two sides must add to more than the third).' };
    }
    const cosC = (a * a + b * b - c * c) / (2 * a * b);
    const C = rad2deg(Math.acos(cosC));
    steps.push({ note: 'All three sides are known, so rearrange to make the angle the subject.', latex: `\\cos C = \\dfrac{a^{2} + b^{2} - c^{2}}{2ab}` });
    steps.push({
      note: 'Substitute the three side lengths.',
      latex: `\\cos C = \\dfrac{${fmt(a)}^{2} + ${fmt(b)}^{2} - ${fmt(c)}^{2}}{2 \\times ${fmt(a)} \\times ${fmt(b)}} = \\dfrac{${fmt(a * a + b * b - c * c, 4)}}{${fmt(2 * a * b, 4)}} = ${fmt(cosC, 4)}`,
    });
    steps.push({ note: 'Take the inverse cosine.', latex: `C = \\cos^{-1}(${fmt(cosC, 4)}) = ${fmt(C)}${DEG}`, annotation: 'angle found' });
    const dia = diagramStep(a, b, c);
    if (dia) steps.push(dia);
    return finish(steps, 'Cosine rule', 'Find the angle from three sides', `C = ${fmt(C)}${DEG}`);
  }

  // SAS → find the third side.
  const sas = PAIRS.find(([s, ang]) => t[s] === undefined && t[ang] !== undefined);
  if (sas) {
    const [ts, ta] = sas;
    const others = (['a', 'b', 'c'] as const).filter((k) => k !== ts);
    const [x, y] = others.map((k) => t[k]);
    if (x === undefined || y === undefined) {
      return { ok: false, error: 'The cosine rule needs two sides and the angle between them, e.g.  a=7, b=9, C=40.' };
    }
    const ang = t[ta]!;
    const sq = x * x + y * y - 2 * x * y * Math.cos(deg2rad(ang));
    const val = Math.sqrt(sq);
    // Note: `sq` and `val` stay at full precision — only the *displayed*
    // intermediate below is rounded, so the answer never inherits rounding
    // from the working.
    steps.push({
      note: `Both sides either side of angle ${ta} are known, so substitute straight in.`,
      latex: `${ts}^{2} = ${fmt(x)}^{2} + ${fmt(y)}^{2} - 2 \\times ${fmt(x)} \\times ${fmt(y)} \\times \\cos ${fmt(ang)}${DEG}`,
    });
    // Each arithmetic move gets its own line. Collapsing them into one
    // "work it out" line is exactly where a student loses the thread —
    // and where a calculator slip hides.
    // Round the cosine *first*, then multiply by the rounded value, so the
    // line a student re-does on a calculator gives exactly the number
    // printed underneath it. Multiplying at full precision and displaying a
    // rounded factor put the printed working out by 6.87 at a=1234, b=5678.
    const twoXY = 2 * x * y;
    const cosA = round(Math.cos(deg2rad(ang)), 6);
    const product = twoXY * cosA;
    steps.push({
      note: `Square the two sides, and multiply out the $2ab$ part: $2 \\times ${fmt(x)} \\times ${fmt(y)} = ${fmt(twoXY, 4)}$.`,
      latex: `${ts}^{2} = ${fmt(x * x, 4)} + ${fmt(y * y, 4)} - ${fmt(twoXY, 4)}\\cos ${fmt(ang)}${DEG}`,
    });
    steps.push({
      // Six figures, so the multiplication on the next line genuinely checks
      // out against what is printed here. Four would round to a value that
      // does not reproduce the product, which is worse than useless to a
      // student re-doing it on a calculator.
      note: 'Look up the cosine of the angle, keeping enough figures to carry through.',
      latex: `\\cos ${fmt(ang)}${DEG} = ${fmt(cosA, 6)}`,
    });
    steps.push({
      note: `Multiply: $${fmt(twoXY, 4)} \\times ${fmt(cosA, 6)} = ${fmt(product, 4)}$.`,
      latex: `${ts}^{2} = ${fmt(x * x + y * y, 4)} - ${fmt(product, 4)}`,
    });
    steps.push({
      note: 'Subtract to get the square of the side.',
      latex: `${ts}^{2} = ${fmt(sq, 4)}`,
    });
    steps.push({
      note: 'Take the square root of both sides — a length is positive, so only the positive root is used.',
      latex: `${ts} = \\sqrt{${fmt(sq, 4)}} = ${fmt(val, 4)}`,
    });
    steps.push({
      note: 'Round to two decimal places.',
      latex: `${ts} = ${fmt(val)}`,
      annotation: 'side found',
    });
    const full = { ...t, [ts]: val } as Tri;
    const dia = diagramStep(full.a!, full.b!, full.c!);
    if (dia) steps.push(dia);
    return finish(steps, 'Cosine rule', 'Find the third side', `${ts} = ${fmt(val)}`);
  }

  return { ok: false, error: 'Give two sides and the angle between them (e.g. a=7, b=9, C=40), or all three sides.' };
}

/* ------------------------------------------------------------------- area */
function byArea(t: Tri): SolveResult {
  const steps: Step[] = [];

  const sas = PAIRS.find(([s, ang]) => t[s] === undefined && t[ang] !== undefined);
  if (sas) {
    const [, ta] = sas;
    const others = (['a', 'b', 'c'] as const).filter((k) => k !== sas[0]);
    const [x, y] = others.map((k) => t[k]);
    if (x !== undefined && y !== undefined) {
      const ang = t[ta]!;
      const area = 0.5 * x * y * Math.sin(deg2rad(ang));
      steps.push({ note: 'With two sides and the angle between them, use the sine area rule.', latex: `\\text{Area} = \\tfrac{1}{2}ab\\sin C` });
      steps.push({
        note: 'Substitute the two sides and the included angle.',
        latex: `\\text{Area} = \\tfrac{1}{2} \\times ${fmt(x)} \\times ${fmt(y)} \\times \\sin ${fmt(ang)}${DEG}`,
      });
      steps.push({ note: 'Work it out.', latex: `\\text{Area} = ${fmt(area)}`, annotation: 'square units' });
      return finish(steps, 'Area (½ab sin C)', 'Find the area of the triangle', `\\text{Area} = ${fmt(area)}`);
    }
  }

  if (t.a !== undefined && t.b !== undefined && t.c !== undefined) {
    const { a, b, c } = t;
    if (a + b <= c || a + c <= b || b + c <= a) {
      return { ok: false, error: 'Those three lengths can’t form a triangle.' };
    }
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    steps.push({ note: 'With all three sides known, use Heron’s formula.', latex: `\\text{Area} = \\sqrt{s(s-a)(s-b)(s-c)}, \\quad s = \\dfrac{a+b+c}{2}` });
    steps.push({ note: 'Find the semi-perimeter.', latex: `s = \\dfrac{${fmt(a)} + ${fmt(b)} + ${fmt(c)}}{2} = ${fmt(s)}` });
    steps.push({
      note: 'Substitute into Heron’s formula.',
      latex: `\\text{Area} = \\sqrt{${fmt(s)}(${fmt(s - a)})(${fmt(s - b)})(${fmt(s - c)})} = ${fmt(area)}`,
      annotation: 'square units',
    });
    return finish(steps, 'Area (Heron’s formula)', 'Find the area of the triangle', `\\text{Area} = ${fmt(area)}`);
  }

  return { ok: false, error: 'For area, give two sides and the angle between them, or all three sides.' };
}

// Shared by all three methods below: which one applies follows from which
// values are filled in, not from which tab is open, so every tab offers the
// same six fields rather than each defining their own.
const TRI_FIELDS: FieldSchema[] = [
  { id: 'a', label: 'a', kind: 'number', optional: true },
  { id: 'b', label: 'b', kind: 'number', optional: true },
  { id: 'c', label: 'c', kind: 'number', optional: true },
  { id: 'A', label: 'A', kind: 'number', optional: true },
  { id: 'B', label: 'B', kind: 'number', optional: true },
  { id: 'C', label: 'C', kind: 'number', optional: true },
];

export const triangleRulesSolver: Solver = {
  id: 'triangle-rules',
  title: 'Sine & cosine rules',
  subjects: ['General', 'Specialist'],
  blurb: 'Solve any triangle — sine rule, cosine rule, and area.',
  placeholder: 'e.g.  a=7, b=9, C=40',
  methods: [
    {
      id: 'sine-rule',
      name: 'Sine rule',
      blurb: 'a/sin A = b/sin B. Use it with a matching side–angle pair.',
      fields: TRI_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'cosine-rule',
      name: 'Cosine rule',
      blurb: 'c² = a² + b² − 2ab cos C. Use it for two sides + included angle, or three sides.',
      fields: TRI_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'area',
      name: 'Area',
      blurb: '½ab sin C when you have the included angle, otherwise Heron’s formula.',
      fields: TRI_FIELDS,
      serialize: formatParams,
    },
  ],
  defaultMethodId: 'cosine-rule',
  detect(input) {
    const t = read(input);
    if (known(t) < 3) return 0;
    const explicit = /sine rule|cosine rule|triangle|area/i.test(input);
    if (sides(t) >= 2 && known(t) >= 3) return explicit ? 0.96 : 0.82;
    if (angles(t) >= 2 && sides(t) >= 1) return explicit ? 0.96 : 0.82;
    return 0;
  },
  solve(input, methodId): SolveResult {
    const t = read(input);
    if (known(t) < 3) {
      return { ok: false, error: 'A triangle needs three measurements, e.g.  a=7, b=9, C=40.' };
    }
    // Check the givens describe a triangle before working with them. Without
    // this the cosine rule happily accepted C = 200° and a = −7, and the area
    // method returned a *negative area* — an answer with no meaning at all.
    const impossible = whyImpossible(t);
    if (impossible) return { ok: false, error: impossible };

    if (/area/i.test(input) || methodId === 'area') return byArea(t);
    if (methodId === 'sine-rule') return bySineRule(t);
    return byCosineRule(t);
  },
};
