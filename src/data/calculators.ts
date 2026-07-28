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
    heading: 'Vectors',
    items: [
      { solverId: 'vectors', methodId: 'component', label: 'Vector arithmetic' },
      { solverId: 'vectors', methodId: 'collinear' },
      { solverId: 'vectors', methodId: 'ratio' },
    ],
  },
];
