/**
 * The sidebar's "Calculators" directory — a curated shortcut into specific
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
        blurb: 'Fill in any two of a, b, c, A, B — Pythagoras or SOH CAH TOA, whichever applies.',
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
        blurb: 'Fill in any three of a, b, c, A, B, C — sine rule, cosine rule or area, whichever applies.',
      },
    ],
  },
  {
    heading: 'Vectors',
    items: [
      { solverId: 'vectors', methodId: 'component', label: 'Vector arithmetic' },
      { solverId: 'vectors', methodId: 'collinear' },
      { solverId: 'vectors', methodId: 'ratio' },
    ],
  },
];
