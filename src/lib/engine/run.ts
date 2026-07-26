import { normalise, type Reading } from '../nl/normalise';
import { detectSolver, type Detection } from './registry';
import type { Solver, SolveResult } from './types';

/**
 * The single boundary where raw student input becomes canonical maths.
 *
 * Everything the UI does goes through here, so natural language is normalised
 * exactly once and detection and solving always see the same text.
 */

export interface Interpretation extends Reading {
  detection: Detection | null;
}

/** Normalise, then work out which topic the problem belongs to. */
export function interpret(raw: string): Interpretation {
  const reading = normalise(raw);
  // Detect on the canonical text, but fall back to the raw text: a detector
  // occasionally reads the original phrasing better than the rewrite.
  const detection = detectSolver(reading.text) ?? detectSolver(raw);
  return { ...reading, detection };
}

/** Solve raw input with a given solver, normalising first. */
export function runSolve(solver: Solver, raw: string, methodId: string): SolveResult {
  const { text } = normalise(raw);
  const first = solver.solve(text, methodId);
  if (first.ok) return first;
  // If the rewrite confused this solver, give the original a chance before
  // reporting failure — the student's own phrasing may already have been valid.
  const original = solver.solve(raw, methodId);
  return original.ok ? original : first;
}
