import { runSolve } from './run';
import type { Method, Solver } from './types';

/**
 * Which methods are actually worth offering for a given problem.
 *
 * A topic lists every method it can teach, but for a particular question two
 * of them often come out identical — solving `ln x = 5` is the same working
 * whether you call it "equating indices" or "taking logs", and there is
 * nothing to choose between them. Offering both invites a student to click
 * the other one expecting a different approach and get the same page back.
 *
 * So methods are compared by the working they actually produce, and only the
 * first of each identical group is offered. Methods that fail on this input
 * are dropped too — a tab that leads nowhere is worse than no tab.
 */

/** Everything that makes one method's working visibly different from another. */
function fingerprint(
  solver: Solver,
  input: string,
  methodId: string,
): string | null {
  const r = runSolve(solver, input, methodId);
  if (!r.ok) return null;
  return JSON.stringify([
    r.solution.answerLatex ?? '',
    r.solution.steps.map((s) => [
      s.latex ?? '',
      s.note ?? '',
      s.annotation ?? '',
    ]),
  ]);
}

/**
 * The methods to show for `input`. Falls back to every method when the input
 * is empty or nothing solves, so the picker is never blank.
 */
export function distinctMethods(solver: Solver, input: string): Method[] {
  if (solver.methods.length <= 1 || input.trim() === '') return solver.methods;

  const seen = new Map<string, Method>();
  for (const method of solver.methods) {
    let print: string | null;
    try {
      print = fingerprint(solver, input, method.id);
    } catch {
      continue; // a method that throws is not on offer
    }
    if (print === null) continue;
    if (!seen.has(print)) seen.set(print, method);
  }

  const distinct = [...seen.values()];
  // Every method failed, or the problem is one the topic can't do: leave the
  // list alone rather than presenting an empty picker.
  return distinct.length === 0 ? solver.methods : distinct;
}

/**
 * Every method that can produce working for this particular input.
 *
 * This is intentionally broader than `distinctMethods`: in a question split
 * across topics, a student may still want to choose a named method even when
 * its early lines happen to match another method. The part picker uses this
 * list, while the ordinary one-topic view stays concise by using the
 * distinct-working list above.
 */
export function applicableMethods(solver: Solver, input: string): Method[] {
  if (solver.methods.length <= 1 || input.trim() === '') return solver.methods;

  const applicable = solver.methods.filter((method) => {
    try {
      return runSolve(solver, input, method.id).ok;
    } catch {
      return false;
    }
  });

  return applicable.length > 0 ? applicable : solver.methods;
}

/** True when the topic offers a real choice for this particular problem. */
export function hasMethodChoice(solver: Solver, input: string): boolean {
  return distinctMethods(solver, input).length > 1;
}
