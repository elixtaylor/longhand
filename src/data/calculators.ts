/**
 * The "Calculators" directory — a curated shortcut into specific
 * structured-input methods (see StructuredInputForm), grouped by subject.
 * Only methods with `fields` belong here; free-text topics are already one
 * search away and don't need a second front door.
 *
 * label/blurb fall back to the method's own name/blurb — set them only when
 * the method's name reads fine as a tab ("Component form") but not as a
 * standalone directory entry.
 */
export interface CalculatorRef {
  solverId: string;
  methodId: string;
  label?: string;
  blurb?: string;
}

export interface CalculatorGroup {
  heading: string;
  items: CalculatorRef[];
}

export const CALCULATORS: CalculatorGroup[] = [
  {
    heading: 'Right-angled triangles',
    items: [
      {
        solverId: 'right-triangle',
        methodId: 'pythagoras',
        label: 'Right-angled triangle',
        blurb:
          'Fill in any two of a, b, c, A, B — Pythagoras or SOH CAH TOA, whichever applies.',
      },
      {
        solverId: 'right-triangle',
        methodId: 'trig-ratio',
        label: 'Trigonometric ratios',
        blurb: 'Find a missing side or angle with sine, cosine or tangent.',
      },
    ],
  },
  {
    heading: 'Sine & cosine rules',
    items: [
      {
        solverId: 'triangle-rules',
        methodId: 'cosine-rule',
        label: 'Any triangle',
        blurb:
          'Fill in any three of a, b, c, A, B, C — sine rule, cosine rule or area, whichever applies.',
      },
    ],
  },
  {
    heading: 'Vectors',
    items: [
      {
        solverId: 'vectors',
        methodId: 'component',
        label: 'Vector arithmetic',
      },
      { solverId: 'vectors', methodId: 'collinear' },
      { solverId: 'vectors', methodId: 'ratio' },
    ],
  },
  {
    heading: 'Random variables',
    items: [
      { solverId: 'distributions', methodId: 'binomial' },
      { solverId: 'distributions', methodId: 'normal' },
      { solverId: 'distributions', methodId: 'normal-interval' },
      { solverId: 'distributions', methodId: 'sampling' },
      { solverId: 'distributions', methodId: 'confidence' },
    ],
  },
  {
    heading: 'Counting & combinations',
    items: [
      { solverId: 'counting', methodId: 'combination' },
      { solverId: 'counting', methodId: 'permutation' },
      { solverId: 'counting', methodId: 'factorial' },
    ],
  },
  {
    heading: 'Complex numbers',
    items: [
      {
        solverId: 'complex',
        methodId: 'rectangular',
        label: 'Complex numbers',
        blurb:
          'Add, subtract, multiply, divide, modulus, conjugate or polar form.',
      },
    ],
  },
  {
    heading: 'Matrices',
    items: [
      {
        solverId: 'matrices',
        methodId: 'standard',
        label: 'Matrix arithmetic',
        blurb: 'Add, subtract, scale or multiply matrices.',
      },
      {
        solverId: 'matrices',
        methodId: 'determinant',
        label: 'Determinants',
        blurb: 'Find 2×2 or larger determinants.',
      },
      {
        solverId: 'matrices',
        methodId: 'inverse',
        label: 'Inverse matrices',
        blurb: 'Find the inverse of a 2×2 matrix.',
      },
      {
        solverId: 'matrices',
        methodId: 'transpose',
        label: 'Transpose',
        blurb: 'Swap the rows and columns of a matrix.',
      },
      {
        solverId: 'matrices',
        methodId: 'system',
        label: 'Matrix systems',
        blurb: 'Solve a two-variable system from an augmented matrix.',
      },
    ],
  },
  {
    heading: 'Circle geometry',
    items: [
      {
        solverId: 'circle-geometry',
        methodId: 'measurements',
        label: 'Circle measurements',
        blurb: 'Area and circumference from radius or diameter.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'arc-sector',
        label: 'Arcs and sectors',
        blurb: 'Arc length and sector area.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'chord',
        label: 'Chords and segments',
        blurb: 'Chord length, distance and segment area.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'centre-angle',
        label: 'Centre and circumference angles',
        blurb: 'Use the angle at the centre theorem.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'same-segment',
        label: 'Angles in the same segment',
        blurb: 'Angles standing on the same chord are equal.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'semicircle',
        label: 'Angle in a semicircle',
        blurb: 'An angle subtended by a diameter is 90°.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'tangent-radius',
        label: 'Radius and tangent',
        blurb: 'A radius meets a tangent at a right angle.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'equal-tangents',
        label: 'Equal tangents',
        blurb: 'Tangents from one external point have equal lengths.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'equal-chords',
        label: 'Equal chords',
        blurb: 'Equal chords subtend equal central angles.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'cyclic',
        label: 'Cyclic quadrilaterals',
        blurb: 'Opposite angles add to 180°.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'tangent-chord',
        label: 'Tangent-chord theorem',
        blurb: 'Match tangent-chord and alternate-segment angles.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'chord-distance',
        label: 'Perpendicular chord distance',
        blurb: 'Use the centre-to-chord right triangle.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'tangent-length',
        label: 'Tangent lengths',
        blurb: 'Find a tangent from an external point.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'intersecting-chords',
        label: 'Intersecting chords and secants',
        blurb: 'Use equal products for intersecting segments.',
      },
      {
        solverId: 'circle-geometry',
        methodId: 'power-of-point',
        label: 'Tangent-secant power',
        blurb: 'Relate a tangent to secant lengths.',
      },
    ],
  },
  {
    heading: 'Probability',
    items: [
      {
        solverId: 'probability',
        methodId: 'single',
        label: 'Probability',
        blurb: 'Single event, union, intersection or conditional probability.',
      },
    ],
  },
];
