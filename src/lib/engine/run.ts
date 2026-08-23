import { normalise, type Reading } from '../nl/normalise';
import { detectSolver, type Detection } from './registry';
import { work, type Worked } from './parts';
import { foldArithmetic } from '../nl/arithmetic';
import type { SolveOptions, Solver, SolveResult } from './types';

export type { Worked, WorkedPart } from './parts';

/**
 * The single boundary where raw student input becomes canonical maths.
 *
 * Everything the UI does goes through here, so natural language is normalised
 * exactly once and detection and solving always see the same text.
 */

export interface Interpretation extends Reading {
  detection: Detection | null;
}

/** Keep one malformed or numerically extreme problem from breaking the UI. */
function safeSolverCall(
  solver: Solver,
  text: string,
  methodId: string,
  options: SolveOptions,
): SolveResult {
  try {
    return solver.solve(text, methodId, options);
  } catch {
    return {
      ok: false,
      error:
        'That problem could not be completed safely. Check the values and notation, then try again.',
    };
  }
}

/** Normalise, then work out which topic the problem belongs to. */
export function interpret(raw: string): Interpretation {
  const reading = normalise(raw);
  // Detect on the canonical text, but fall back to the raw text: a detector
  // occasionally reads the original phrasing better than the rewrite. Last,
  // try it with the arithmetic worked out, so that live detection agrees
  // with what the solver will actually do — otherwise "ln x = 5^2" reports
  // "not sure what this is" while solving perfectly well.
  let detection = detectSolver(reading.text);
  if (!detection && raw !== reading.text) detection = detectSolver(raw);
  if (!detection) {
    const folded = foldArithmetic(reading.text);
    if (folded !== reading.text && folded !== raw) {
      detection = detectSolver(folded);
    }
  }
  return { ...reading, detection };
}

/** Solve raw input with a given solver, normalising first. */
export function runSolve(
  solver: Solver,
  raw: string,
  methodId: string,
  options: SolveOptions = {},
): SolveResult {
  // Measurement inputs carry dimensional units which the general prose
  // normaliser intentionally strips. Give that solver the raw form first so
  // `r=5 cm` can be converted rather than silently becoming unitless.
  let original: SolveResult | undefined;
  if (solver.id === 'measurement') {
    original = safeSolverCall(solver, raw, methodId, options);
    if (original.ok) return original;
  }
  const { text } = normalise(raw);
  if (text === raw) {
    return original ?? safeSolverCall(solver, raw, methodId, options);
  }
  const first = safeSolverCall(solver, text, methodId, options);
  if (first.ok) return first;
  // If the rewrite confused this solver, give the original a chance before
  // reporting failure — the student's own phrasing may already have been valid.
  original ??= safeSolverCall(solver, raw, methodId, options);
  return original.ok ? original : first;
}

/**
 * Work a question end to end, splitting it across topics when it spans more
 * than one. This is what the UI calls; `runSolve` remains the single-topic
 * path underneath it.
 *
 * Passing `preferred` means the student chose the topic by hand, which is
 * taken as a statement that the question is about that one thing.
 */
export function runWorked(
  raw: string,
  preferred?: { solver: Solver; methodId: string },
  methodOverrides: Record<string, string> = {},
  options: SolveOptions = {},
): Worked {
  return work(
    raw,
    (solver, text, methodId) => runSolve(solver, text, methodId, options),
    preferred,
    methodOverrides,
  );
}
