import type { Solver, SolveResult, Step } from '../../lib/engine/types';

type ProofKind = 'angle-sum' | 'parallel-lines' | 'isosceles' | 'congruence';

function hasProofLanguage(input: string): boolean {
  return /\b(prove|proof|show|demonstrate|deduce)\b/i.test(input);
}

function classify(input: string): ProofKind | null {
  const text = input.toLowerCase();
  if (
    /congruen|sss|sas|asa|aas|rhs/.test(text) &&
    /triangle|\babc\b/.test(text)
  )
    return 'congruence';
  if (/isosceles|base angles/.test(text)) return 'isosceles';
  if (/parallel|alternate angles|corresponding angles|co-interior/.test(text))
    return 'parallel-lines';
  if (/triangle/.test(text) && /angle|180|sum/.test(text)) return 'angle-sum';
  return null;
}

const angleSumSteps: Step[] = [
  {
    note: 'Take triangle ABC and draw a straight line through A parallel to BC.',
    latex: 'BC \\parallel \\ell \\text{ through } A',
  },
  {
    note: 'Use alternate angles: the angle on the left of A equals B, and the angle on the right equals C.',
    latex: '\\alpha = B,\\quad \\beta = C',
  },
  {
    note: 'Angles on a straight line add to 180°.',
    latex: '\\alpha + A + \\beta = 180^{\\circ}',
  },
  {
    note: 'Replace α and β with B and C.',
    latex: 'A + B + C = 180^{\\circ}',
    annotation: 'proved',
  },
];

function triangleNames(input: string): { first: string; second: string } {
  const named = input.match(
    /triangles?\s+([A-Z]{3})\s+(?:and|&|,)\s+([A-Z]{3})/,
  );
  if (named)
    return { first: named[1].toUpperCase(), second: named[2].toUpperCase() };
  const one = input.match(/triangle\s+([A-Z]{3})/)?.[1];
  return { first: one?.toUpperCase() ?? 'ABC', second: 'DEF' };
}

function angleSumFor(input: string): Step[] {
  const [a, b, c] = triangleNames(input).first.split('');
  return angleSumSteps.map((step) => ({
    ...step,
    note: step.note?.replace(/\bA\b|\bB\b|\bC\b/g, (label) =>
      label === 'A' ? a : label === 'B' ? b : c,
    ),
    latex: step.latex?.replace(/\bA\b|\bB\b|\bC\b/g, (label) =>
      label === 'A' ? a : label === 'B' ? b : c,
    ),
  }));
}

function parallelSteps(input: string): { steps: Step[]; answer: string } {
  const text = input.toLowerCase();
  const lines = input.match(
    /\b([a-z])\s*(?:\|\||parallel(?:\s+to)?)\s*([a-z])\b/i,
  );
  const lineA = lines?.[1] ?? 'l';
  const lineB = lines?.[2] ?? 'm';
  const coInterior = /co-interior|cointerior|same[- ]side/.test(text);
  const corresponding = /corresponding/.test(text);
  if (coInterior) {
    return {
      steps: [
        {
          note: 'Let two parallel lines be cut by a transversal.',
          latex: `${lineA} \\parallel ${lineB}`,
        },
        {
          note: 'Co-interior angles on the same side of a transversal are supplementary.',
          latex: '\\angle 1 + \\angle 2 = 180^{\\circ}',
        },
        {
          note: 'Therefore the two marked angles add to 180°.',
          latex: '\\angle 1 + \\angle 2 = 180^{\\circ}',
          annotation: 'proved',
        },
      ],
      answer: '\\angle 1 + \\angle 2 = 180^{\\circ}',
    };
  }
  const reason = corresponding ? 'corresponding angles' : 'alternate angles';
  return {
    steps: [
      {
        note: 'Let two parallel lines be cut by a transversal.',
        latex: `${lineA} \\parallel ${lineB}`,
      },
      {
        note: `Use ${reason}: angles in matching positions are equal.`,
        latex: '\\angle 1 = \\angle 2',
      },
      {
        note: 'The required angles are equal because they are the same corresponding/alternate pair.',
        latex: '\\boxed{\\angle 1 = \\angle 2}',
        annotation: 'proved',
      },
    ],
    answer: '\\angle 1 = \\angle 2',
  };
}

function solveProof(kind: ProofKind, input: string): SolveResult {
  if (kind === 'angle-sum') {
    return {
      ok: true,
      solution: {
        headline: 'Prove the angle sum of a triangle',
        methodName: 'Parallel-line proof',
        steps: angleSumFor(input),
        answerLatex: `${triangleNames(input).first.split('').join(' + ')} = 180^{\\circ}`,
      },
    };
  }
  if (kind === 'parallel-lines') {
    const result = parallelSteps(input);
    return {
      ok: true,
      solution: {
        headline: 'Prove a parallel-line angle result',
        methodName: 'Parallel-line angle rules',
        steps: result.steps,
        answerLatex: result.answer,
      },
    };
  }
  if (kind === 'isosceles') {
    const triangle = triangleNames(input).first;
    const [a, b, c] = triangle.split('');
    const equality = input.match(/\b([A-Z]{2})\s*=\s*([A-Z]{2})\b/i);
    const equalSides = equality
      ? [equality[1].toUpperCase(), equality[2].toUpperCase()]
      : [`${a}${b}`, `${a}${c}`];
    const apex =
      equalSides[0][0] === equalSides[1][0]
        ? equalSides[0][0]
        : equalSides[0][1] === equalSides[1][1]
          ? equalSides[0][1]
          : a;
    const base = triangle.split('').filter((vertex) => vertex !== apex);
    const baseEquality = `\\angle ${apex}${base[0]}${base[1]} = \\angle ${base[0]}${base[1]}${apex}`;
    return {
      ok: true,
      solution: {
        headline: 'Prove the base angles of an isosceles triangle are equal',
        methodName: 'Isosceles triangle proof',
        steps: [
          {
            note: `Let ${equalSides[0]} = ${equalSides[1]} in isosceles triangle ${triangle}.`,
            latex: `${equalSides[0]} = ${equalSides[1]}`,
          },
          {
            note: 'Draw the angle bisector AD to meet BC at D; AD is common to both triangles.',
            latex: `\\angle ${apex}${base[0]}D = \\angle D${apex}${base[1]},\\quad ${apex}D = ${apex}D`,
          },
          {
            note: 'The two smaller triangles have equal side, included angle, and side (SAS).',
            latex: `${equalSides[0]} = ${equalSides[1]},\\quad \\angle ${apex}${base[0]}D = \\angle D${apex}${base[1]},\\quad ${apex}D = ${apex}D`,
          },
          {
            note: 'Therefore the two smaller triangles are congruent by SAS.',
            latex: `\\triangle ${apex}${base[0]}D \\cong \\triangle ${apex}${base[1]}D \\quad (SAS)`,
          },
          {
            note: 'Corresponding angles in congruent triangles are equal.',
            latex: `\\boxed{${baseEquality}}`,
            annotation: 'proved',
          },
        ],
        answerLatex: baseEquality,
      },
    };
  }
  const criterion =
    input.match(/\b(sss|sas|asa|aas|rhs)\b/i)?.[1]?.toUpperCase() ?? 'SSS';
  const { first, second } = triangleNames(input);
  const [a, b, c] = first.split('');
  const [d, e, f] = second.split('');
  const explicit = [
    ...input.matchAll(
      /(?:angle\s*)?([A-Z]{1,2})\s*=\s*(?:angle\s*)?([A-Z]{1,2})/gi,
    ),
  ].map((match) => `${match[1].toUpperCase()} = ${match[2].toUpperCase()}`);
  const given =
    explicit.length >= 3
      ? explicit.slice(0, 3).join(',\\quad ')
      : criterion === 'SAS'
        ? `${a}${b} = ${d}${e},\\quad \\angle ${b} = \\angle ${e},\\quad ${b}${c} = ${e}${f}`
        : criterion === 'ASA' || criterion === 'AAS'
          ? `\\angle ${a} = \\angle ${d},\\quad ${a}${b} = ${d}${e},\\quad \\angle ${b} = \\angle ${e}`
          : criterion === 'RHS'
            ? `\\angle ${b} = \\angle ${e} = 90^{\\circ},\\quad ${a}${c} = ${d}${f},\\quad ${a}${b} = ${d}${e}`
            : `${a}${b} = ${d}${e},\\quad ${b}${c} = ${e}${f},\\quad ${a}${c} = ${d}${f}`;
  return {
    ok: true,
    solution: {
      headline: 'Prove two triangles are congruent',
      methodName: `${criterion} congruence proof`,
      steps: [
        {
          note: 'List the matching sides and angles given in the question.',
          latex: given,
        },
        {
          note: `The triangles satisfy the ${criterion} congruence criterion.`,
          latex: `\\triangle ${first} \\cong \\triangle ${second} \\quad (${criterion})`,
        },
        {
          note: 'Therefore all corresponding sides and angles are equal.',
          latex: `\\angle ${a} = \\angle ${d},\\quad \\angle ${b} = \\angle ${e},\\quad \\angle ${c} = \\angle ${f}`,
          annotation: 'proved',
        },
      ],
      answerLatex: `\\triangle ${first} \\cong \\triangle ${second}`,
    },
  };
}

export const geometricProofSolver: Solver = {
  id: 'geometry-proof',
  title: 'Geometric proof',
  subjects: ['Methods', 'Specialist'],
  blurb:
    'Build a short proof from a construction, theorem, and justified conclusion.',
  placeholder: 'e.g. prove the angles in a triangle add to 180',
  methods: [
    {
      id: 'angle-sum',
      name: 'Triangle angle sum',
      blurb: 'Use a parallel line and angles on a straight line.',
    },
    {
      id: 'parallel-lines',
      name: 'Parallel-line angles',
      blurb: 'Use alternate, corresponding, or co-interior angles.',
    },
    {
      id: 'isosceles',
      name: 'Isosceles triangle',
      blurb: 'Use SAS congruence to prove the base angles equal.',
    },
    {
      id: 'congruence',
      name: 'Triangle congruence',
      blurb: 'Apply SSS, SAS, ASA, AAS, or RHS.',
    },
  ],
  defaultMethodId: 'angle-sum',
  detect(input) {
    if (!hasProofLanguage(input)) return 0;
    return classify(input)
      ? 0.96
      : /geometry|geometric/i.test(input)
        ? 0.55
        : 0;
  },
  solve(input, methodId): SolveResult {
    const detected = classify(input);
    const selected = [
      'angle-sum',
      'parallel-lines',
      'isosceles',
      'congruence',
    ].includes(methodId)
      ? (methodId as ProofKind)
      : detected;
    if (detected && selected && detected !== selected)
      return {
        ok: false,
        error: `That input describes a ${detected} proof, not a ${selected} proof.`,
      };
    const kind = selected ?? detected;
    if (!kind)
      return {
        ok: false,
        error:
          'Try a triangle angle-sum, parallel-line, isosceles, or congruence proof.',
      };
    return solveProof(kind, input);
  },
};
