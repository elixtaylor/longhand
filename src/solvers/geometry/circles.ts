import { deg2rad, formatParams, fmt, parseParams } from '../../lib/math/num';
import type {
  FieldSchema,
  SolveResult,
  Solver,
  Step,
} from '../../lib/engine/types';

/**
 * Circle geometry for SACE Methods and Specialist mathematics.
 *
 * Angles are entered in degrees, matching the convention used in school
 * geometry. The solver keeps the theorem visible in the working so the
 * calculator is useful for both measurement and proof-style questions.
 */

const DEG = '^{\\circ}';

function fields(ids: Array<[string, string, boolean]>): FieldSchema[] {
  return ids.map(([id, label, optional]) => ({
    id,
    label,
    kind: 'number',
    ...(optional ? { optional: true } : {}),
  }));
}

function positive(value: number | undefined, label: string): string | null {
  if (value === undefined) return null;
  return value > 0 ? null : `${label} must be greater than zero.`;
}

function angle(
  value: number | undefined,
  label: string,
  max = 360,
): string | null {
  if (value === undefined) return null;
  return value > 0 && value <= max
    ? null
    : `${label} must be between 0° and ${max}°.`;
}

function solveMeasurement(input: string): SolveResult {
  const p = parseParams(input);
  let r = p.r;
  let d = p.d;
  if (r === undefined && d === undefined) {
    return { ok: false, error: 'Give a radius r=… or diameter d=….' };
  }
  if (r !== undefined && d !== undefined && Math.abs(d - 2 * r) > 1e-8) {
    return { ok: false, error: 'The diameter must be twice the radius.' };
  }
  if (r === undefined) r = d! / 2;
  if (d === undefined) d = 2 * r;
  const invalid = positive(r, 'The radius');
  if (invalid) return { ok: false, error: invalid };
  const circumference = 2 * Math.PI * r;
  const area = Math.PI * r * r;
  const steps: Step[] = [
    {
      note: 'Relate the radius and diameter.',
      latex: `d = 2r = 2 \\times ${fmt(r)} = ${fmt(d!)}`,
    },
    {
      note: 'Use the circumference formula.',
      latex: 'C = 2\\pi r',
    },
    {
      note: 'Substitute the radius.',
      latex: `C = 2\\pi \\times ${fmt(r)} = ${fmt(circumference)}`,
    },
    {
      note: 'Use the area formula.',
      latex: 'A = \\pi r^{2}',
    },
    {
      note: 'Substitute the radius and simplify.',
      latex: `A = \\pi \\times ${fmt(r)}^{2} = ${fmt(area)}`,
      annotation: 'circle measures',
    },
  ];
  return {
    ok: true,
    solution: {
      headline: `Measure a circle with radius $r=${fmt(r)}$`,
      methodName: 'Circle measurements',
      steps,
      answerLatex: `C = ${fmt(circumference)},\\quad A = ${fmt(area)}`,
      derivedValues: { r, d },
    },
  };
}

function solveArcSector(input: string): SolveResult {
  const { r, theta } = parseParams(input);
  const invalidRadius = positive(r, 'The radius');
  const invalidAngle = angle(theta, 'The central angle');
  if (invalidRadius || invalidAngle || r === undefined || theta === undefined) {
    return {
      ok: false,
      error:
        invalidRadius ??
        invalidAngle ??
        'Give both r=… and theta=… in degrees.',
    };
  }
  const fraction = theta / 360;
  const arc = fraction * 2 * Math.PI * r;
  const sector = fraction * Math.PI * r * r;
  return {
    ok: true,
    solution: {
      headline: `Find the arc and sector for $r=${fmt(r)},\\;\\theta=${fmt(theta)}${DEG}$`,
      methodName: 'Arc length and sector area',
      steps: [
        {
          note: 'Use the fraction of a full turn made by the central angle.',
          latex: `\\text{fraction} = \\dfrac{${fmt(theta)}}{360}`,
        },
        {
          note: 'Find the arc length from the circumference fraction.',
          latex: `L = \\dfrac{\\theta}{360}2\\pi r = \\dfrac{${fmt(theta)}}{360} \\times 2\\pi \\times ${fmt(r)} = ${fmt(arc)}`,
        },
        {
          note: 'Find the sector area from the same fraction of the circle.',
          latex: `A_{sector} = \\dfrac{${fmt(theta)}}{360}\\pi(${fmt(r)})^{2} = ${fmt(sector)}`,
          annotation: 'arc and sector',
        },
      ],
      answerLatex: `L = ${fmt(arc)},\\quad A_{sector} = ${fmt(sector)}`,
    },
  };
}

function solveChord(input: string): SolveResult {
  const { r, theta } = parseParams(input);
  const invalidRadius = positive(r, 'The radius');
  const invalidAngle = angle(theta, 'The central angle');
  if (invalidRadius || invalidAngle || r === undefined || theta === undefined) {
    return {
      ok: false,
      error:
        invalidRadius ??
        invalidAngle ??
        'Give both r=… and theta=… in degrees.',
    };
  }
  const chord = 2 * r * Math.sin(deg2rad(theta / 2));
  const distance = r * Math.cos(deg2rad(theta / 2));
  const segment =
    (theta / 360) * Math.PI * r * r - 0.5 * r * r * Math.sin(deg2rad(theta));
  return {
    ok: true,
    solution: {
      headline: `Find the chord for $r=${fmt(r)},\\;\\theta=${fmt(theta)}${DEG}$`,
      methodName: 'Chord and segment geometry',
      steps: [
        {
          note: 'Drop a perpendicular from the centre to the chord. It bisects the chord.',
          latex: `d = r\\cos\\left(\\dfrac{\\theta}{2}\\right),\\quad \\dfrac{c}{2} = r\\sin\\left(\\dfrac{\\theta}{2}\\right)`,
        },
        {
          note: 'Find the full chord length.',
          latex: `c = 2r\\sin\\left(\\dfrac{${fmt(theta)}}{2}\\right) = ${fmt(chord)}`,
        },
        {
          note: 'Find the centre-to-chord distance.',
          latex: `d = ${fmt(r)}\\cos\\left(\\dfrac{${fmt(theta)}}{2}\\right) = ${fmt(distance)}`,
        },
        {
          note: 'Subtract the isosceles triangle from the sector for the minor segment.',
          latex: `A_{segment} = A_{sector} - \\tfrac12r^{2}\\sin\\theta = ${fmt(segment)}`,
          annotation: 'chord theorem',
        },
      ],
      answerLatex: `c = ${fmt(chord)},\\quad d = ${fmt(distance)},\\quad A_{segment} = ${fmt(segment)}`,
    },
  };
}

function solveCentreAngle(input: string): SolveResult {
  const p = parseParams(input);
  let centre = p.centre;
  let circumference = p.circumference;
  if (centre === undefined && circumference === undefined) {
    return { ok: false, error: 'Give centre=… or circumference=….' };
  }
  const invalidCentre = angle(centre, 'The angle at the centre');
  const invalidCircumference = angle(
    circumference,
    'The angle at the circumference',
    180,
  );
  if (invalidCentre || invalidCircumference) {
    return { ok: false, error: invalidCentre ?? invalidCircumference! };
  }
  if (centre !== undefined && circumference !== undefined) {
    if (Math.abs(centre - 2 * circumference) > 1e-8) {
      return {
        ok: false,
        error:
          'The angle at the centre must be twice the angle at the circumference.',
      };
    }
  } else if (centre !== undefined) circumference = centre / 2;
  else centre = circumference! * 2;
  return {
    ok: true,
    solution: {
      headline: 'Use the angle at the centre theorem',
      methodName: 'Angle at centre is twice angle at circumference',
      steps: [
        {
          note: 'Angles standing on the same chord satisfy the circle theorem.',
          latex: `\\angle_{centre} = 2\\angle_{circumference}`,
        },
        {
          note: 'Substitute the known angle and calculate the missing angle.',
          latex: `\\angle_{centre} = 2 \\times ${fmt(circumference!)}${DEG} = ${fmt(centre!)}${DEG}`,
          annotation: 'circle theorem',
        },
      ],
      answerLatex: `\\angle_{centre} = ${fmt(centre!)}${DEG},\\quad \\angle_{circumference} = ${fmt(circumference!)}${DEG}`,
      derivedValues: { centre: centre!, circumference: circumference! },
    },
  };
}

function solveCyclic(input: string): SolveResult {
  const p = parseParams(input);
  let a = p.a;
  let b = p.b;
  if (a === undefined && b === undefined) {
    return { ok: false, error: 'Give one opposite angle, a=… or b=….' };
  }
  const invalidA = angle(a, 'Angle a', 180);
  const invalidB = angle(b, 'Angle b', 180);
  if (invalidA || invalidB) return { ok: false, error: invalidA ?? invalidB! };
  if (a !== undefined && b !== undefined && Math.abs(a + b - 180) > 1e-8) {
    return {
      ok: false,
      error: 'Opposite angles in a cyclic quadrilateral add to 180°.',
    };
  }
  if (a === undefined) a = 180 - b!;
  if (b === undefined) b = 180 - a;
  return {
    ok: true,
    solution: {
      headline: 'Find an angle in a cyclic quadrilateral',
      methodName: 'Opposite angles in a cyclic quadrilateral',
      steps: [
        {
          note: 'Opposite angles in a cyclic quadrilateral are supplementary.',
          latex: `a + b = 180${DEG}`,
        },
        {
          note: 'Substitute the known angle and solve for the opposite angle.',
          latex: `b = 180${DEG} - ${fmt(a)}${DEG} = ${fmt(b)}${DEG}`,
          annotation: 'cyclic quadrilateral',
        },
      ],
      answerLatex: `a = ${fmt(a)}${DEG},\\quad b = ${fmt(b)}${DEG}`,
      derivedValues: { a, b },
    },
  };
}

function solveTangentChord(input: string): SolveResult {
  const p = parseParams(input);
  let tangent = p.tangent;
  let alternate = p.alternate;
  if (tangent === undefined && alternate === undefined) {
    return { ok: false, error: 'Give tangent=… or alternate=….' };
  }
  const invalidTangent = angle(tangent, 'The tangent-chord angle', 180);
  const invalidAlternate = angle(alternate, 'The alternate-segment angle', 180);
  if (invalidTangent || invalidAlternate) {
    return { ok: false, error: invalidTangent ?? invalidAlternate! };
  }
  if (
    tangent !== undefined &&
    alternate !== undefined &&
    Math.abs(tangent - alternate) > 1e-8
  ) {
    return {
      ok: false,
      error:
        'The tangent-chord angle equals the angle in the alternate segment.',
    };
  }
  if (tangent === undefined) tangent = alternate;
  if (alternate === undefined) alternate = tangent;
  return {
    ok: true,
    solution: {
      headline: 'Use the tangent-chord theorem',
      methodName: 'Tangent-chord theorem',
      steps: [
        {
          note: 'The angle between a tangent and a chord equals the angle in the alternate segment.',
          latex: `\\angle_{tangent-chord} = \\angle_{alternate\\ segment}`,
        },
        {
          note: 'Transfer the known angle to the matching angle.',
          latex: `\\angle_{alternate\\ segment} = ${fmt(alternate!)}${DEG}`,
          annotation: 'tangent theorem',
        },
      ],
      answerLatex: `\\angle_{tangent-chord} = ${fmt(tangent!)}${DEG},\\quad \\angle_{alternate\\ segment} = ${fmt(alternate!)}${DEG}`,
      derivedValues: { tangent: tangent!, alternate: alternate! },
    },
  };
}

function solveSameSegment(input: string): SolveResult {
  const p = parseParams(input);
  let first = p.angle1;
  let second = p.angle2;
  if (first === undefined && second === undefined) {
    return { ok: false, error: 'Give angle1=… or angle2=….' };
  }
  const invalidFirst = angle(first, 'Angle 1', 180);
  const invalidSecond = angle(second, 'Angle 2', 180);
  if (invalidFirst || invalidSecond) {
    return { ok: false, error: invalidFirst ?? invalidSecond! };
  }
  if (
    first !== undefined &&
    second !== undefined &&
    Math.abs(first - second) > 1e-8
  ) {
    return {
      ok: false,
      error:
        'Angles in the same segment, standing on the same chord, are equal.',
    };
  }
  if (first === undefined) first = second;
  if (second === undefined) second = first;
  return {
    ok: true,
    solution: {
      headline: 'Use the angles in the same segment theorem',
      methodName: 'Angles in the same segment are equal',
      steps: [
        {
          note: 'Angles at the circumference subtended by the same chord are equal.',
          latex: '\\angle_1 = \\angle_2',
        },
        {
          note: 'Transfer the known angle to the matching angle.',
          latex: `\\angle_2 = ${fmt(second!)}${DEG}`,
          annotation: 'same segment theorem',
        },
      ],
      answerLatex: `\\angle_1 = ${fmt(first!)}${DEG},\\quad \\angle_2 = ${fmt(second!)}${DEG}`,
      derivedValues: { angle1: first!, angle2: second! },
    },
  };
}

function solveSemicircle(input: string): SolveResult {
  const p = parseParams(input);
  const diameter = p.diameter;
  let angleInSemicircle = p.angle;
  if (diameter === undefined) {
    return { ok: false, error: 'Give the diameter of the circle.' };
  }
  const invalidDiameter = positive(diameter, 'The diameter');
  if (invalidDiameter) return { ok: false, error: invalidDiameter };
  const invalidAngle = angle(angleInSemicircle, 'The angle in the semicircle');
  if (invalidAngle) return { ok: false, error: invalidAngle };
  if (
    angleInSemicircle !== undefined &&
    Math.abs(angleInSemicircle - 90) > 1e-8
  ) {
    return { ok: false, error: 'An angle in a semicircle must be 90°.' };
  }
  angleInSemicircle = 90;
  return {
    ok: true,
    solution: {
      headline: 'Use the angle in a semicircle theorem',
      methodName: 'The angle in a semicircle is 90°',
      steps: [
        {
          note: 'The side opposite the angle is a diameter.',
          latex: `d = ${fmt(diameter)}`,
        },
        {
          note: 'Therefore the angle standing on the diameter is a right angle.',
          latex: `\\angle_{semicircle} = 90${DEG}`,
          annotation: 'semicircle theorem',
        },
      ],
      answerLatex: `\\angle_{semicircle} = 90${DEG}`,
      derivedValues: { angle: angleInSemicircle },
    },
  };
}

function solveTangentRadius(input: string): SolveResult {
  const p = parseParams(input);
  const radius = p.radius;
  let tangentAngle = p.angle;
  if (radius === undefined) {
    return { ok: false, error: 'Give the radius to the point of contact.' };
  }
  const invalidRadius = positive(radius, 'The radius');
  if (invalidRadius) return { ok: false, error: invalidRadius };
  const invalidAngle = angle(tangentAngle, 'The radius-tangent angle');
  if (invalidAngle) return { ok: false, error: invalidAngle };
  if (tangentAngle !== undefined && Math.abs(tangentAngle - 90) > 1e-8) {
    return { ok: false, error: 'A radius meets a tangent at 90°.' };
  }
  tangentAngle = 90;
  return {
    ok: true,
    solution: {
      headline: 'Use the radius and tangent theorem',
      methodName: 'A radius is perpendicular to a tangent',
      steps: [
        {
          note: 'The radius meets the tangent at the point of contact.',
          latex: `r = ${fmt(radius)}`,
        },
        {
          note: 'The radius and tangent are perpendicular.',
          latex: `\\angle_{radius-tangent} = 90${DEG}`,
          annotation: 'radius-tangent theorem',
        },
      ],
      answerLatex: `\\angle_{radius-tangent} = 90${DEG}`,
      derivedValues: { angle: tangentAngle },
    },
  };
}

function solveEqualTangents(input: string): SolveResult {
  const p = parseParams(input);
  let tangent1 = p.tangent1;
  let tangent2 = p.tangent2;
  if (tangent1 === undefined && tangent2 === undefined) {
    return { ok: false, error: 'Give tangent1=… or tangent2=….' };
  }
  const invalidFirst = positive(tangent1, 'Tangent 1');
  const invalidSecond = positive(tangent2, 'Tangent 2');
  if (invalidFirst || invalidSecond) {
    return { ok: false, error: invalidFirst ?? invalidSecond! };
  }
  if (
    tangent1 !== undefined &&
    tangent2 !== undefined &&
    Math.abs(tangent1 - tangent2) > 1e-8
  ) {
    return {
      ok: false,
      error: 'Tangents drawn from the same external point are equal in length.',
    };
  }
  if (tangent1 === undefined) tangent1 = tangent2;
  if (tangent2 === undefined) tangent2 = tangent1;
  return {
    ok: true,
    solution: {
      headline: 'Use the equal tangents theorem',
      methodName: 'Tangents from the same external point are equal',
      steps: [
        {
          note: 'Two tangents drawn from the same external point to a circle have equal lengths.',
          latex: 'PT_1 = PT_2',
        },
        {
          note: 'Transfer the known tangent length to the second tangent.',
          latex: `PT_2 = ${fmt(tangent2!)}`,
          annotation: 'equal tangents theorem',
        },
      ],
      answerLatex: `PT_1 = ${fmt(tangent1!)},\\quad PT_2 = ${fmt(tangent2!)}`,
      derivedValues: { tangent1: tangent1!, tangent2: tangent2! },
    },
  };
}

function solveEqualChords(input: string): SolveResult {
  const p = parseParams(input);
  let chord1 = p.chord1;
  let chord2 = p.chord2;
  let central1 = p.central1;
  let central2 = p.central2;
  if (
    chord1 === undefined &&
    chord2 === undefined &&
    central1 === undefined &&
    central2 === undefined
  ) {
    return { ok: false, error: 'Give a chord or central angle.' };
  }
  const invalidChord1 = positive(chord1, 'Chord 1');
  const invalidChord2 = positive(chord2, 'Chord 2');
  const invalidCentral1 = angle(central1, 'Central angle 1');
  const invalidCentral2 = angle(central2, 'Central angle 2');
  if (invalidChord1 || invalidChord2 || invalidCentral1 || invalidCentral2) {
    return {
      ok: false,
      error:
        invalidChord1 ?? invalidChord2 ?? invalidCentral1 ?? invalidCentral2!,
    };
  }
  if (
    chord1 !== undefined &&
    chord2 !== undefined &&
    Math.abs(chord1 - chord2) > 1e-8
  ) {
    return { ok: false, error: 'Equal chords must have equal lengths.' };
  }
  if (
    central1 !== undefined &&
    central2 !== undefined &&
    Math.abs(central1 - central2) > 1e-8
  ) {
    return {
      ok: false,
      error: 'Equal chords subtend equal angles at the centre.',
    };
  }
  if (chord1 === undefined && chord2 !== undefined) chord1 = chord2;
  if (chord2 === undefined && chord1 !== undefined) chord2 = chord1;
  if (central1 === undefined && central2 !== undefined) central1 = central2;
  if (central2 === undefined && central1 !== undefined) central2 = central1;
  const derivedValues: Record<string, number> = {};
  if (chord1 !== undefined) derivedValues.chord1 = chord1;
  if (chord2 !== undefined) derivedValues.chord2 = chord2;
  if (central1 !== undefined) derivedValues.central1 = central1;
  if (central2 !== undefined) derivedValues.central2 = central2;
  return {
    ok: true,
    solution: {
      headline: 'Use the equal chords theorem',
      methodName: 'Equal chords subtend equal central angles',
      steps: [
        {
          note: 'Equal chords in the same circle subtend equal angles at the centre.',
          latex: `c_1 = c_2\\quad\\Longleftrightarrow\\quad \\theta_1 = \\theta_2`,
        },
        {
          note: 'Match the corresponding chord lengths or central angles.',
          latex: `c_1 = ${chord1 === undefined ? '\\text{not given}' : fmt(chord1)},\\quad c_2 = ${chord2 === undefined ? '\\text{not given}' : fmt(chord2)}`,
          annotation: 'equal chords theorem',
        },
      ],
      answerLatex: `c_1 = ${chord1 === undefined ? '\\text{not given}' : fmt(chord1)},\\quad c_2 = ${chord2 === undefined ? '\\text{not given}' : fmt(chord2)}${central1 !== undefined || central2 !== undefined ? `,\\quad \\theta_1 = ${central1 === undefined ? '\\text{not given}' : fmt(central1)}${DEG},\\quad \\theta_2 = ${central2 === undefined ? '\\text{not given}' : fmt(central2)}${DEG}` : ''}`,
      derivedValues,
    },
  };
}

function solveIntersectingChords(input: string): SolveResult {
  const p = parseParams(input);
  let a = p.segment1;
  let b = p.segment2;
  let c = p.segment3;
  let d = p.segment4;
  const values = [a, b, c, d];
  if (values.filter((value) => value !== undefined).length < 3) {
    return { ok: false, error: 'Give any three of the four segment lengths.' };
  }
  const invalid = values
    .map((value, index) => positive(value, `Segment ${index + 1}`))
    .find(Boolean);
  if (invalid) return { ok: false, error: invalid };
  if (a === undefined) a = (c! * d!) / b!;
  else if (b === undefined) b = (c! * d!) / a;
  else if (c === undefined) c = (a * b!) / d!;
  else if (d === undefined) d = (a * b) / c!;
  if (Math.abs(a * b - c * d) > 1e-8 * Math.max(1, a * b, c * d)) {
    return {
      ok: false,
      error: 'The products of the intersecting segments must be equal.',
    };
  }
  return {
    ok: true,
    solution: {
      headline: 'Use the intersecting chords theorem',
      methodName: 'Products of intersecting segments are equal',
      steps: [
        {
          note: 'For two chords or secants meeting at a point, the products of the segment pairs are equal.',
          latex: 'a\\times b = c\\times d',
        },
        {
          note: 'Substitute the known lengths and solve for the missing segment.',
          latex: `${fmt(a)}\\times${fmt(b)} = ${fmt(c)}\\times${fmt(d)}`,
          annotation: 'intersecting chords theorem',
        },
      ],
      answerLatex: `a = ${fmt(a)},\\quad b = ${fmt(b)},\\quad c = ${fmt(c)},\\quad d = ${fmt(d)}`,
      derivedValues: { segment1: a, segment2: b, segment3: c, segment4: d },
    },
  };
}

function solvePowerOfPoint(input: string): SolveResult {
  const p = parseParams(input);
  let tangent = p.tangent;
  let external = p.external;
  let whole = p.whole;
  const known = [tangent, external, whole].filter(
    (value) => value !== undefined,
  ).length;
  if (known < 2) {
    return { ok: false, error: 'Give any two of tangent, external and whole.' };
  }
  if (
    [tangent, external, whole].some(
      (value) => value !== undefined && value <= 0,
    )
  ) {
    return { ok: false, error: 'All lengths must be greater than zero.' };
  }
  if (tangent !== undefined && external !== undefined && whole === undefined) {
    whole = (tangent * tangent) / external;
  } else if (
    tangent !== undefined &&
    whole !== undefined &&
    external === undefined
  ) {
    external = (tangent * tangent) / whole;
  } else if (
    external !== undefined &&
    whole !== undefined &&
    tangent === undefined
  ) {
    if (whole < external) {
      return {
        ok: false,
        error: 'The whole secant must be longer than its external segment.',
      };
    }
    tangent = Math.sqrt(external * whole);
  }
  if (
    external === undefined ||
    whole === undefined ||
    tangent === undefined ||
    whole < external
  ) {
    return {
      ok: false,
      error:
        'The whole secant must be at least as long as the external segment.',
    };
  }
  return {
    ok: true,
    solution: {
      headline: 'Use the tangent-secant power theorem',
      methodName: 'Tangent squared equals external secant times whole secant',
      steps: [
        {
          note: 'A tangent and a secant from the same external point satisfy the power-of-a-point relation.',
          latex: 't^{2} = e\\times w',
        },
        {
          note: 'Substitute the known lengths and solve for the missing one.',
          latex: `(${fmt(tangent)})^{2} = ${fmt(external)}\\times${fmt(whole)}`,
          annotation: 'power of a point',
        },
      ],
      answerLatex: `t = ${fmt(tangent)},\\quad e = ${fmt(external)},\\quad w = ${fmt(whole)}`,
      derivedValues: { tangent, external, whole },
    },
  };
}

function solveChordDistance(input: string): SolveResult {
  const p = parseParams(input);
  let r = p.r;
  let c = p.c;
  let distance = p.distance;
  const known = [r, c, distance].filter((value) => value !== undefined).length;
  if (known < 2)
    return { ok: false, error: 'Give any two of r=…, c=… and distance=….' };
  if (r !== undefined && positive(r, 'The radius'))
    return { ok: false, error: positive(r, 'The radius')! };
  if (c !== undefined && positive(c, 'The chord length'))
    return { ok: false, error: positive(c, 'The chord length')! };
  if (distance !== undefined && distance < 0)
    return {
      ok: false,
      error: 'The centre-to-chord distance cannot be negative.',
    };
  if (r !== undefined && c !== undefined && distance === undefined) {
    if (c > 2 * r)
      return {
        ok: false,
        error: 'A chord cannot be longer than the diameter.',
      };
    distance = Math.sqrt(Math.max(0, r * r - (c / 2) ** 2));
  } else if (r !== undefined && distance !== undefined && c === undefined) {
    if (distance > r)
      return {
        ok: false,
        error: 'The centre-to-chord distance cannot exceed the radius.',
      };
    c = 2 * Math.sqrt(Math.max(0, r * r - distance * distance));
  } else if (c !== undefined && distance !== undefined && r === undefined) {
    r = Math.sqrt((c / 2) ** 2 + distance * distance);
  } else if (r === undefined || c === undefined || distance === undefined) {
    return { ok: false, error: 'Give any two valid chord measurements.' };
  }
  return {
    ok: true,
    solution: {
      headline: 'Find the distance from the centre to a chord',
      methodName: 'Perpendicular from centre bisects chord',
      steps: [
        {
          note: 'The perpendicular from the centre to a chord bisects the chord.',
          latex: `r^{2} = d^{2} + \\left(\\dfrac{c}{2}\\right)^{2}`,
        },
        {
          note: 'Substitute the two known measurements and rearrange if needed.',
          latex: `r = ${fmt(r!)}\\quad c = ${fmt(c!)}\\quad d = ${fmt(distance!)}`,
          annotation: 'chord theorem',
        },
      ],
      answerLatex: `r = ${fmt(r!)},\\quad c = ${fmt(c!)},\\quad d = ${fmt(distance!)}`,
      derivedValues: { r: r!, c: c!, distance: distance! },
    },
  };
}

function solveTangentLength(input: string): SolveResult {
  const p = parseParams(input);
  let r = p.r;
  let distance = p.distance;
  let tangent = p.tangent;
  const known = [r, distance, tangent].filter(
    (value) => value !== undefined,
  ).length;
  if (known < 2)
    return {
      ok: false,
      error: 'Give any two of r=…, distance=… and tangent=….',
    };
  if (
    [r, distance, tangent].some((value) => value !== undefined && value < 0)
  ) {
    return { ok: false, error: 'Lengths cannot be negative.' };
  }
  if (r !== undefined && distance !== undefined && tangent === undefined) {
    if (distance < r)
      return {
        ok: false,
        error:
          'The external point must be at least one radius from the centre.',
      };
    tangent = Math.sqrt(Math.max(0, distance * distance - r * r));
  } else if (
    r !== undefined &&
    tangent !== undefined &&
    distance === undefined
  ) {
    distance = Math.sqrt(r * r + tangent * tangent);
  } else if (
    distance !== undefined &&
    tangent !== undefined &&
    r === undefined
  ) {
    if (tangent > distance)
      return {
        ok: false,
        error: 'The tangent length cannot exceed the centre-to-point distance.',
      };
    r = Math.sqrt(distance * distance - tangent * tangent);
  } else if (
    r === undefined ||
    distance === undefined ||
    tangent === undefined
  ) {
    return { ok: false, error: 'Give any two valid tangent measurements.' };
  }
  return {
    ok: true,
    solution: {
      headline: 'Find a tangent length from an external point',
      methodName: 'Radius is perpendicular to tangent',
      steps: [
        {
          note: 'The radius to the point of contact is perpendicular to the tangent.',
          latex: `OP^{2} = OT^{2} + PT^{2}`,
        },
        {
          note: 'Substitute the known lengths and rearrange.',
          latex: `(${fmt(distance!)})^{2} = (${fmt(r!)})^{2} + (${fmt(tangent!)})^{2}`,
          annotation: 'tangent theorem',
        },
      ],
      answerLatex: `r = ${fmt(r!)},\\quad OP = ${fmt(distance!)},\\quad PT = ${fmt(tangent!)}`,
      derivedValues: { r: r!, distance: distance!, tangent: tangent! },
    },
  };
}

const measurementFields = fields([
  ['r', 'Radius r', true],
  ['d', 'Diameter d', true],
]);
const theoremAngleFields = fields([
  ['centre', 'Angle at centre', true],
  ['circumference', 'Angle at circumference', true],
]);
const oppositeAngleFields = fields([
  ['a', 'Angle a', true],
  ['b', 'Opposite angle b', true],
]);
const tangentAngleFields = fields([
  ['tangent', 'Tangent-chord angle', true],
  ['alternate', 'Alternate-segment angle', true],
]);
const sameSegmentFields = fields([
  ['angle1', 'Angle 1', true],
  ['angle2', 'Angle 2', true],
]);
const semicircleFields = fields([
  ['diameter', 'Diameter d', false],
  ['angle', 'Angle in semicircle', true],
]);
const tangentRadiusFields = fields([
  ['radius', 'Radius r', false],
  ['angle', 'Radius-tangent angle', true],
]);
const equalTangentFields = fields([
  ['tangent1', 'Tangent 1', true],
  ['tangent2', 'Tangent 2', true],
]);
const equalChordFields = fields([
  ['chord1', 'Chord 1 c₁', true],
  ['chord2', 'Chord 2 c₂', true],
  ['central1', 'Central angle 1', true],
  ['central2', 'Central angle 2', true],
]);
const intersectingChordFields = fields([
  ['segment1', 'Segment 1 a', false],
  ['segment2', 'Segment 2 b', false],
  ['segment3', 'Segment 3 c', false],
  ['segment4', 'Segment 4 d', true],
]);
const powerOfPointFields = fields([
  ['tangent', 'Tangent length t', true],
  ['external', 'External secant e', true],
  ['whole', 'Whole secant w', true],
]);
const chordDistanceFields = fields([
  ['r', 'Radius r', true],
  ['c', 'Chord c', true],
  ['distance', 'Centre distance d', true],
]);
const tangentLengthFields = fields([
  ['r', 'Radius r', true],
  ['distance', 'Centre distance OP', true],
  ['tangent', 'Tangent length PT', true],
]);

export const circleGeometrySolver: Solver = {
  id: 'circle-geometry',
  title: 'Circle geometry',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Circle measures, arcs, chords, sectors and circle theorems.',
  placeholder: 'e.g. angle at centre=86',
  methods: [
    {
      id: 'measurements',
      name: 'Circle measurements',
      blurb: 'Find area and circumference from a radius or diameter.',
      fields: measurementFields,
      serialize: formatParams,
    },
    {
      id: 'arc-sector',
      name: 'Arcs and sectors',
      blurb: 'Find arc length and sector area from r and a central angle.',
      fields: fields([
        ['r', 'Radius r', false],
        ['theta', 'Central angle θ°', false],
      ]),
      serialize: (values) => `arc ${formatParams(values)}`,
    },
    {
      id: 'chord',
      name: 'Chords and segments',
      blurb: 'Find a chord, centre distance and minor segment area.',
      fields: fields([
        ['r', 'Radius r', false],
        ['theta', 'Central angle θ°', false],
      ]),
      serialize: (values) => `chord ${formatParams(values)}`,
    },
    {
      id: 'centre-angle',
      name: 'Centre and circumference angles',
      blurb: 'Use the angle at the centre theorem for the same chord.',
      fields: theoremAngleFields,
      serialize: (values) => `theorem ${formatParams(values)}`,
    },
    {
      id: 'cyclic',
      name: 'Cyclic quadrilaterals',
      blurb: 'Find opposite angles using supplementary angles.',
      fields: oppositeAngleFields,
      serialize: (values) => `cyclic ${formatParams(values)}`,
    },
    {
      id: 'same-segment',
      name: 'Angles in the same segment',
      blurb: 'Angles standing on the same chord are equal.',
      fields: sameSegmentFields,
      serialize: (values) => `same-segment ${formatParams(values)}`,
    },
    {
      id: 'semicircle',
      name: 'Angle in a semicircle',
      blurb: 'An angle subtended by a diameter is 90°.',
      fields: semicircleFields,
      serialize: (values) => `semicircle ${formatParams(values)}`,
    },
    {
      id: 'tangent-radius',
      name: 'Radius and tangent',
      blurb: 'A radius meets the tangent at a right angle.',
      fields: tangentRadiusFields,
      serialize: (values) => `tangent-radius ${formatParams(values)}`,
    },
    {
      id: 'equal-tangents',
      name: 'Equal tangents',
      blurb: 'Tangents from the same external point have equal lengths.',
      fields: equalTangentFields,
      serialize: (values) => `equal-tangents ${formatParams(values)}`,
    },
    {
      id: 'equal-chords',
      name: 'Equal chords',
      blurb: 'Equal chords subtend equal angles at the centre.',
      fields: equalChordFields,
      serialize: (values) => `equal-chords ${formatParams(values)}`,
    },
    {
      id: 'tangent-chord',
      name: 'Tangent-chord theorem',
      blurb: 'Transfer an angle to the alternate segment.',
      fields: tangentAngleFields,
      serialize: (values) => `tangent-chord ${formatParams(values)}`,
    },
    {
      id: 'chord-distance',
      name: 'Perpendicular chord distance',
      blurb: 'Use the perpendicular from the centre that bisects a chord.',
      fields: chordDistanceFields,
      serialize: (values) => `chord-distance ${formatParams(values)}`,
    },
    {
      id: 'tangent-length',
      name: 'Tangent lengths',
      blurb: 'Find a tangent using the right angle between radius and tangent.',
      fields: tangentLengthFields,
      serialize: (values) => `tangent-length ${formatParams(values)}`,
    },
    {
      id: 'intersecting-chords',
      name: 'Intersecting chords and secants',
      blurb: 'Use equal products for chords or secants meeting at a point.',
      fields: intersectingChordFields,
      serialize: (values) => `intersecting-chords ${formatParams(values)}`,
    },
    {
      id: 'power-of-point',
      name: 'Tangent-secant power',
      blurb: 'Relate a tangent to the external and whole secant lengths.',
      fields: powerOfPointFields,
      serialize: (values) => `power-of-point ${formatParams(values)}`,
    },
  ],
  defaultMethodId: 'measurements',
  detect(input) {
    const circleSignal =
      /\bcircles?\b|\barcs?\b|\bsectors?\b|\bchords?\b|\bcyclic\b|semicircle|same\s+segment|equal\s+(?:chords?|tangents?)|intersecting\s+(?:chords?|secants?)|power\s+of\s+(?:a\s+)?point|tangent[- ]secant|radius\s+(?:and\s+)?tangent|tangent[- ]chord|tangent\s+length|alternate\s+segment|angle\s+at\s+(?:the\s+)?(?:centre|circumference)/i;
    if (!circleSignal.test(input)) return 0;
    if (
      /\barcs?\b|\bsectors?\b|\bchords?\b|\bcyclic\b|semicircle|same\s+segment|equal\s+(?:chords?|tangents?)|intersecting\s+(?:chords?|secants?)|power\s+of\s+(?:a\s+)?point|tangent[- ]secant|radius\s+(?:and\s+)?tangent|tangent[- ]chord|tangent\s+length|alternate\s+segment|angle\s+at/i.test(
        input,
      )
    )
      return 0.96;
    return 0.34;
  },
  solve(input, methodId): SolveResult {
    switch (methodId) {
      case 'measurements':
        return solveMeasurement(input);
      case 'arc-sector':
        return solveArcSector(input);
      case 'chord':
        return solveChord(input);
      case 'centre-angle':
        return solveCentreAngle(input);
      case 'cyclic':
        return solveCyclic(input);
      case 'same-segment':
        return solveSameSegment(input);
      case 'semicircle':
        return solveSemicircle(input);
      case 'tangent-radius':
        return solveTangentRadius(input);
      case 'equal-tangents':
        return solveEqualTangents(input);
      case 'equal-chords':
        return solveEqualChords(input);
      case 'tangent-chord':
        return solveTangentChord(input);
      case 'chord-distance':
        return solveChordDistance(input);
      case 'tangent-length':
        return solveTangentLength(input);
      case 'intersecting-chords':
        return solveIntersectingChords(input);
      case 'power-of-point':
        return solvePowerOfPoint(input);
      default:
        return { ok: false, error: 'Choose a circle-geometry method first.' };
    }
  },
};
