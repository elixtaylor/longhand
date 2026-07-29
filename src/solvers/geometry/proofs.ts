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

function parallelSteps(input: string): { steps: Step[]; answer: string } {
  const text = input.toLowerCase();
  const coInterior = /co-interior|cointerior|same[- ]side/.test(text);
  const corresponding = /corresponding/.test(text);
  if (coInterior) {
    return {
      steps: [
        {
          note: 'Let two parallel lines be cut by a transversal.',
          latex: 'l \\parallel m',
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
        latex: 'l \\parallel m',
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
        steps: angleSumSteps,
        answerLatex: 'A + B + C = 180^{\\circ}',
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
    return {
      ok: true,
      solution: {
        headline: 'Prove the base angles of an isosceles triangle are equal',
        methodName: 'Isosceles triangle proof',
        steps: [
          { note: 'Let AB = AC in isosceles triangle ABC.', latex: 'AB = AC' },
          {
            note: 'Draw the angle bisector AD to meet BC at D; AD is common to both triangles.',
            latex: '\\angle BAD = \\angle DAC,\\quad AD = AD',
          },
          {
            note: 'The two smaller triangles have equal side, included angle, and side (SAS).',
            latex: 'AB = AC,\\quad \\angle BAD = \\angle DAC,\\quad AD = AD',
          },
          {
            note: 'Therefore the two smaller triangles are congruent by SAS.',
            latex: '\\triangle ABD \\cong \\triangle ACD \\quad (SAS)',
          },
          {
            note: 'Corresponding angles in congruent triangles are equal.',
            latex: '\\boxed{\\angle ABC = \\angle BCA}',
            annotation: 'proved',
          },
        ],
        answerLatex: '\\angle ABC = \\angle BCA',
      },
    };
  }
  const criterion =
    input.match(/\b(sss|sas|asa|aas|rhs)\b/i)?.[1]?.toUpperCase() ?? 'SSS';
  const given =
    criterion === 'SAS'
      ? 'AB = DE,\\quad \\angle B = \\angle E,\\quad BC = EF'
      : criterion === 'ASA' || criterion === 'AAS'
        ? '\\angle A = \\angle D,\\quad AB = DE,\\quad \\angle B = \\angle E'
        : criterion === 'RHS'
          ? '\\angle B = \\angle E = 90^{\\circ},\\quad AC = DF,\\quad AB = DE'
          : 'AB = DE,\\quad BC = EF,\\quad AC = DF';
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
          latex: `\\triangle ABC \\cong \\triangle DEF \\quad (${criterion})`,
        },
        {
          note: 'Therefore all corresponding sides and angles are equal.',
          latex:
            '\\angle A = \\angle D,\\quad \\angle B = \\angle E,\\quad \\angle C = \\angle F',
          annotation: 'proved',
        },
      ],
      answerLatex: '\\triangle ABC \\cong \\triangle DEF',
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
