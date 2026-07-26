import { fmt, parseParams } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Area, perimeter, volume and surface area for the shapes in SACE
 * Stage 1 General Mathematics (Measurement).
 */
type Dim = '2d' | '3d';

interface Shape {
  id: string;
  names: string[];
  dim: Dim;
  /** Parameters the formulae need, e.g. ['r'] or ['l','w']. */
  needs: string[];
  area?: (p: Record<string, number>) => Calc;
  perimeter?: (p: Record<string, number>) => Calc;
  volume?: (p: Record<string, number>) => Calc;
  surface?: (p: Record<string, number>) => Calc;
}

/** A single formula application: the formula, the substitution, the value. */
interface Calc {
  formula: string;
  substituted: string;
  value: number;
  extra?: Step[];
}

const PI = Math.PI;

const SHAPES: Shape[] = [
  {
    id: 'circle',
    names: ['circle'],
    dim: '2d',
    needs: ['r'],
    area: ({ r }) => ({ formula: 'A = \\pi r^{2}', substituted: `A = \\pi \\times ${fmt(r)}^{2}`, value: PI * r * r }),
    perimeter: ({ r }) => ({ formula: 'C = 2\\pi r', substituted: `C = 2 \\times \\pi \\times ${fmt(r)}`, value: 2 * PI * r }),
  },
  {
    id: 'rectangle',
    names: ['rectangle', 'rect'],
    dim: '2d',
    needs: ['l', 'w'],
    area: ({ l, w }) => ({ formula: 'A = l \\times w', substituted: `A = ${fmt(l)} \\times ${fmt(w)}`, value: l * w }),
    perimeter: ({ l, w }) => ({ formula: 'P = 2(l + w)', substituted: `P = 2(${fmt(l)} + ${fmt(w)})`, value: 2 * (l + w) }),
  },
  {
    id: 'square',
    names: ['square'],
    dim: '2d',
    needs: ['s'],
    area: ({ s }) => ({ formula: 'A = s^{2}', substituted: `A = ${fmt(s)}^{2}`, value: s * s }),
    perimeter: ({ s }) => ({ formula: 'P = 4s', substituted: `P = 4 \\times ${fmt(s)}`, value: 4 * s }),
  },
  {
    id: 'triangle',
    names: ['triangle'],
    dim: '2d',
    needs: ['b', 'h'],
    area: ({ b, h }) => ({ formula: 'A = \\tfrac{1}{2}bh', substituted: `A = \\tfrac{1}{2} \\times ${fmt(b)} \\times ${fmt(h)}`, value: 0.5 * b * h }),
  },
  {
    id: 'trapezium',
    names: ['trapezium', 'trapezoid'],
    dim: '2d',
    needs: ['a', 'b', 'h'],
    area: ({ a, b, h }) => ({
      formula: 'A = \\tfrac{1}{2}(a + b)h',
      substituted: `A = \\tfrac{1}{2}(${fmt(a)} + ${fmt(b)}) \\times ${fmt(h)}`,
      value: 0.5 * (a + b) * h,
    }),
  },
  {
    id: 'parallelogram',
    names: ['parallelogram'],
    dim: '2d',
    needs: ['b', 'h'],
    area: ({ b, h }) => ({ formula: 'A = bh', substituted: `A = ${fmt(b)} \\times ${fmt(h)}`, value: b * h }),
  },
  {
    id: 'cylinder',
    names: ['cylinder'],
    dim: '3d',
    needs: ['r', 'h'],
    volume: ({ r, h }) => ({ formula: 'V = \\pi r^{2} h', substituted: `V = \\pi \\times ${fmt(r)}^{2} \\times ${fmt(h)}`, value: PI * r * r * h }),
    surface: ({ r, h }) => ({
      formula: 'SA = 2\\pi r^{2} + 2\\pi r h',
      substituted: `SA = 2\\pi(${fmt(r)})^{2} + 2\\pi(${fmt(r)})(${fmt(h)})`,
      value: 2 * PI * r * r + 2 * PI * r * h,
    }),
  },
  {
    id: 'sphere',
    names: ['sphere', 'ball'],
    dim: '3d',
    needs: ['r'],
    volume: ({ r }) => ({ formula: 'V = \\tfrac{4}{3}\\pi r^{3}', substituted: `V = \\tfrac{4}{3} \\times \\pi \\times ${fmt(r)}^{3}`, value: (4 / 3) * PI * r ** 3 }),
    surface: ({ r }) => ({ formula: 'SA = 4\\pi r^{2}', substituted: `SA = 4 \\times \\pi \\times ${fmt(r)}^{2}`, value: 4 * PI * r * r }),
  },
  {
    id: 'cone',
    names: ['cone'],
    dim: '3d',
    needs: ['r', 'h'],
    volume: ({ r, h }) => ({ formula: 'V = \\tfrac{1}{3}\\pi r^{2} h', substituted: `V = \\tfrac{1}{3} \\times \\pi \\times ${fmt(r)}^{2} \\times ${fmt(h)}`, value: (1 / 3) * PI * r * r * h }),
    surface: ({ r, h }) => {
      const l = Math.sqrt(r * r + h * h);
      return {
        formula: 'SA = \\pi r^{2} + \\pi r l',
        substituted: `SA = \\pi(${fmt(r)})^{2} + \\pi(${fmt(r)})(${fmt(l)})`,
        value: PI * r * r + PI * r * l,
        extra: [
          {
            note: 'First find the slant height with Pythagoras.',
            latex: `l = \\sqrt{r^{2} + h^{2}} = \\sqrt{${fmt(r)}^{2} + ${fmt(h)}^{2}} = ${fmt(l)}`,
          },
        ],
      };
    },
  },
  {
    id: 'prism',
    names: ['prism', 'cuboid', 'box', 'rectangular prism'],
    dim: '3d',
    needs: ['l', 'w', 'h'],
    volume: ({ l, w, h }) => ({ formula: 'V = l \\times w \\times h', substituted: `V = ${fmt(l)} \\times ${fmt(w)} \\times ${fmt(h)}`, value: l * w * h }),
    surface: ({ l, w, h }) => ({
      formula: 'SA = 2(lw + lh + wh)',
      substituted: `SA = 2(${fmt(l)}\\times${fmt(w)} + ${fmt(l)}\\times${fmt(h)} + ${fmt(w)}\\times${fmt(h)})`,
      value: 2 * (l * w + l * h + w * h),
    }),
  },
  {
    id: 'pyramid',
    names: ['pyramid'],
    dim: '3d',
    needs: ['l', 'w', 'h'],
    volume: ({ l, w, h }) => ({ formula: 'V = \\tfrac{1}{3} l w h', substituted: `V = \\tfrac{1}{3} \\times ${fmt(l)} \\times ${fmt(w)} \\times ${fmt(h)}`, value: (1 / 3) * l * w * h }),
  },
];

function findShape(input: string): Shape | undefined {
  // Longest name first so "rectangular prism" beats "rect".
  const byLength = [...SHAPES].sort(
    (a, b) => Math.max(...b.names.map((n) => n.length)) - Math.max(...a.names.map((n) => n.length)),
  );
  // Whole words only — otherwise "x squared" looks like a square, and
  // "coney island" like a cone.
  return byLength.find((s) => s.names.some((n) => new RegExp(`\\b${n}\\b`, 'i').test(input)));
}

/** Which quantity the student asked for, if they said. */
function askedFor(input: string): string | null {
  const l = input.toLowerCase();
  if (/surface/.test(l)) return 'surface';
  if (/volume/.test(l)) return 'volume';
  if (/perimeter|circumference/.test(l)) return 'perimeter';
  if (/\barea\b/.test(l)) return 'area';
  return null;
}

const LABELS: Record<string, string> = {
  area: 'Area',
  perimeter: 'Perimeter',
  volume: 'Volume',
  surface: 'Surface area',
};
const UNITS: Record<string, string> = {
  area: 'square units',
  perimeter: 'units',
  volume: 'cubic units',
  surface: 'square units',
};

export const measurementSolver: Solver = {
  id: 'measurement',
  title: 'Measurement',
  subjects: ['General'],
  blurb: 'Area, perimeter, volume and surface area of standard shapes.',
  placeholder: 'e.g.  cylinder r=3, h=10',
  methods: [
    { id: 'auto', name: 'What applies', blurb: 'Works out every measurement the shape supports from what you give it.' },
    { id: 'area', name: 'Area', blurb: 'Just the area (or surface area for a solid).' },
    { id: 'perimeter', name: 'Perimeter', blurb: 'Just the perimeter or circumference.' },
    { id: 'volume', name: 'Volume', blurb: 'Just the volume of a solid.' },
  ],
  defaultMethodId: 'auto',
  detect(input) {
    const shape = findShape(input);
    if (!shape) return 0;
    const p = parseParams(input);
    const got = shape.needs.filter((k) => p[k] !== undefined).length;
    if (got === 0) return 0.4; // named a shape but gave no numbers yet
    return got >= shape.needs.length ? 0.94 : 0.6;
  },
  solve(input, methodId): SolveResult {
    const shape = findShape(input);
    if (!shape) {
      return {
        ok: false,
        error: 'Start with the shape name, e.g.  circle r=5,  cylinder r=3 h=10,  trapezium a=5 b=7 h=4.',
      };
    }
    const p = parseParams(input);
    const missing = shape.needs.filter((k) => p[k] === undefined);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `That ${shape.id} still needs ${missing.map((m) => `${m}=`).join(', ')} — e.g.  ${shape.id} ${shape.needs.map((n) => `${n}=5`).join(', ')}.`,
      };
    }

    // Decide which quantities to work out.
    const requested = askedFor(input) ?? (methodId !== 'auto' ? methodId : null);
    const available: Array<[string, Calc | undefined]> = [
      ['area', shape.area?.(p)],
      ['perimeter', shape.perimeter?.(p)],
      ['volume', shape.volume?.(p)],
      ['surface', shape.surface?.(p)],
    ];
    let wanted = available.filter(([, c]) => c !== undefined) as Array<[string, Calc]>;
    if (requested) {
      // "Area" on a solid sensibly means surface area.
      const key = requested === 'area' && shape.dim === '3d' ? 'surface' : requested;
      const picked = wanted.filter(([k]) => k === key);
      if (picked.length > 0) wanted = picked;
    }

    const steps: Step[] = [
      {
        note: `Write down what you know about the ${shape.id}.`,
        latex: shape.needs.map((k) => `${k} = ${fmt(p[k])}`).join(', \\quad '),
      },
    ];

    for (const [key, calc] of wanted) {
      if (calc.extra) steps.push(...calc.extra);
      steps.push({ note: `Write the formula for ${LABELS[key].toLowerCase()}.`, latex: calc.formula });
      steps.push({ note: 'Substitute the measurements.', latex: calc.substituted });
      steps.push({
        note: 'Work it out.',
        latex: `${LABELS[key] === 'Perimeter' && shape.id === 'circle' ? 'C' : LABELS[key].split(' ').map((w) => w[0]).join('')} = ${fmt(calc.value)}`,
        annotation: UNITS[key],
      });
    }

    const answer = wanted.map(([k, c]) => `\\text{${LABELS[k]}} = ${fmt(c.value)}`).join(', \\quad ');
    return {
      ok: true,
      solution: {
        headline: `Measure the ${shape.id} (${shape.needs.map((k) => `$${k} = ${fmt(p[k])}$`).join(', ')})`,
        methodName: wanted.length === 1 ? LABELS[wanted[0][0]] : 'Standard formulae',
        steps,
        answerLatex: answer,
      },
    };
  },
};
