/** Data payloads for the bespoke step diagrams (kept UI-agnostic). */

/** A triangle drawn to scale from its three sides, with labels. */
export interface TriangleData {
  a: number;
  b: number;
  c: number;
  A?: number;
  B?: number;
  C?: number;
  /** Which side or angle the working just found, so it can be highlighted. */
  solvedFor?: string;
  rightAngle?: boolean;
}

/** A polynomial curve with its key features marked. */
export interface CurveData {
  /** Coefficients as [power, coefficient] pairs. */
  coeffs: Array<[number, number]>;
  roots: number[];
  yIntercept: number;
  turningPoints: Array<{ x: number; y: number; kind: 'max' | 'min' | 'inflection' }>;
}

/** A normal distribution with a shaded tail or interval. */
export interface NormalData {
  mean: number;
  sd: number;
  /** Shade from `lo` to `hi`; null means unbounded on that side. */
  lo: number | null;
  hi: number | null;
  label?: string;
}

/** Five-number summary drawn as a box-and-whisker plot. */
export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

/** A number line showing an inequality's solution set. */
export interface NumberLineData {
  /** Marked critical values. */
  points: Array<{ x: number; filled: boolean }>;
  /** Shaded regions; null bounds run to the edge of the line. */
  regions: Array<{ from: number | null; to: number | null }>;
}

export interface GridMultiplyData {
  a: number;
  b: number;
  colParts: number[]; // place-value parts of a (columns, left→right)
  rowParts: number[]; // place-value parts of b (rows, top→bottom)
  total: number;
}

export interface LongDivisionData {
  divisor: number;
  dividendDigits: string[];
  quotientDigits: string[]; // aligned under each dividend digit
  carries: (number | null)[]; // remainder carried INTO each digit position
  quotient: number;
  remainder: number;
}
