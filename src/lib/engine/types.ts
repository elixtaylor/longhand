/**
 * The engine contract. Every topic is a `Solver` that owns its own parsing
 * and exposes one or more `Method`s (the "however you were taught" choice).
 * The UI only ever talks to this uniform interface.
 */

export type SaceSubject =
  | 'Foundations'
  | 'General'
  | 'Methods'
  | 'Specialist'
  | 'Physics';

/** An optional bespoke diagram attached to a step (grid, division bracket…). */
export interface StepVisual {
  kind:
    | 'grid-multiply'
    | 'long-division'
    | 'number-line'
    | 'triangle'
    | 'curve'
    | 'normal'
    | 'box-plot';
  data: unknown;
}

/** One line of working. */
export interface Step {
  /** Plain-language explanation of what this line does. */
  note?: string;
  /** The maths for this line, as a LaTeX string. */
  latex?: string;
  /** Short margin note, rendered in the "red pen" annotation style. */
  annotation?: string;
  /** A bespoke visual for methods that need one. */
  visual?: StepVisual;
}

export interface Solution {
  /** Restatement of the problem, e.g. "Solve 2x² + 7x − 4 = 0". */
  headline: string;
  /** The method actually used. */
  methodName: string;
  steps: Step[];
  /** Final answer, shown highlighted. LaTeX. */
  answerLatex?: string;
}

/**
 * One input a structured-input method asks for. `point` renders as 2-3
 * boxed numbers sharing a label (dimension follows the form's own 2D/3D
 * toggle); `ratio` renders as a pair, "m : n"; `number` renders as one box
 * and, like the other two kinds, is required — unless `optional` is set,
 * for solvers built around "fill in what you know" (e.g. a right triangle
 * solved from any two of a, b, c, A, B) rather than one fixed set of
 * required values. A method mixing optional fields needs only enough of
 * them filled, not all — see StructuredInputForm.
 */
export interface FieldSchema {
  id: string;
  label: string;
  kind: 'point' | 'ratio' | 'number';
  optional?: boolean;
}

export interface Method {
  id: string;
  name: string;
  /** One line on when/why you'd use this method. */
  blurb: string;
  /**
   * Present on methods better filled in than typed — a handful of named
   * values (points, a ratio) rather than one free-text expression. When
   * set, the UI shows a form built from these fields instead of the
   * ordinary textbox. `serialize` turns the filled values (one number[]
   * per field id — a point's components, or a ratio's [m, n]) into the
   * same canonical string `solve` already parses for this method, so the
   * form is just a friendlier way to build that string, not a second
   * input path through the engine.
   */
  fields?: FieldSchema[];
  serialize?: (values: Record<string, number[]>) => string;
  /**
   * Present on a method rendered by a bespoke "pick an operation, then fill
   * in the numbers" form instead of StructuredInputForm's fixed fields —
   * for a solver whose free-text grammar picks between several operations
   * first (e.g. Vectors' component form: add/subtract/dot/cross/…), where
   * which fields are needed depends on that choice rather than being fixed
   * per method. See VectorOperationForm/ComplexOperationForm.
   */
  opForm?: 'vector' | 'complex';
}

export type SolveResult =
  | { ok: true; solution: Solution }
  | { ok: false; error: string };

export interface Solver {
  id: string;
  title: string;
  subjects: SaceSubject[];
  /** One-line description shown under the topic name. */
  blurb: string;
  /** Example input shown as the field placeholder. */
  placeholder: string;
  methods: Method[];
  defaultMethodId: string;
  /**
   * How confident this solver is that it handles `input`, from 0 (definitely
   * not mine) to 1 (certain). Powers auto-detection: the registry runs every
   * solver's detector and picks the strongest match. Keep scores honest —
   * a solver that grabs everything breaks detection for its neighbours.
   */
  detect(input: string): number;
  /** Parse `input` and produce working using `methodId`. */
  solve(input: string, methodId: string): SolveResult;
}

/** Small helper for solvers to build a method lookup / validate ids. */
export function pickMethod(solver: Solver, methodId: string): Method {
  return solver.methods.find((m) => m.id === methodId) ?? solver.methods[0];
}
