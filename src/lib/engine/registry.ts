import type { Solver } from './types';
import { multiplicationSolver } from '../../solvers/arithmetic/multiplication';
import { divisionSolver } from '../../solvers/arithmetic/division';
import { fractionsSolver } from '../../solvers/arithmetic/fractions';
import { linearSolver } from '../../solvers/algebra/linear';
import { simultaneousSolver } from '../../solvers/algebra/simultaneous';
import { quadraticsSolver } from '../../solvers/quadratics';
import { differentiationSolver } from '../../solvers/calculus/differentiate';
import { integrationSolver } from '../../solvers/calculus/integrate';
import { rightTriangleSolver } from '../../solvers/trigonometry/right-triangle';
import { triangleRulesSolver } from '../../solvers/trigonometry/triangle-rules';
import { trigEquationSolver } from '../../solvers/trigonometry/trig-equations';
import { measurementSolver } from '../../solvers/measurement';
import { financialSolver } from '../../solvers/financial';
import { sequencesSolver } from '../../solvers/sequences';
import { polynomialsSolver } from '../../solvers/algebra/polynomials';
import { logarithmsSolver } from '../../solvers/algebra/logarithms';
import { complexSolver } from '../../solvers/specialist/complex';
import { vectorsSolver } from '../../solvers/specialist/vectors';
import { matricesSolver } from '../../solvers/specialist/matrices';
import { inductionSolver } from '../../solvers/specialist/induction';
import { statisticsSolver } from '../../solvers/statistics/descriptive';
import { distributionsSolver } from '../../solvers/statistics/distributions';
import { percentageSolver } from '../../solvers/arithmetic/percentages';
import { indicesSolver } from '../../solvers/algebra/indices';
import { inequalitySolver } from '../../solvers/algebra/inequalities';
import { inverseSolver } from '../../solvers/algebra/inverse';
import { functionsSolver } from '../../solvers/algebra/functions';
import { probabilitySolver } from '../../solvers/statistics/probability';
import { countingSolver } from '../../solvers/statistics/counting';
import { networksSolver } from '../../solvers/networks';
import { ratesSolver } from '../../solvers/calculus/rates';
import { calculusApplicationsSolver } from '../../solvers/calculus/applications';

/**
 * The list of topics the app offers. Order here is the order shown in the UI,
 * and breaks ties during auto-detection.
 * Add a solver module and register it here — nothing else needs to change.
 */
export const solvers: Solver[] = [
  multiplicationSolver,
  divisionSolver,
  fractionsSolver,
  percentageSolver,
  linearSolver,
  inverseSolver,
  simultaneousSolver,
  inequalitySolver,
  quadraticsSolver,
  polynomialsSolver,
  indicesSolver,
  logarithmsSolver,
  functionsSolver,
  financialSolver,
  sequencesSolver,
  measurementSolver,
  rightTriangleSolver,
  triangleRulesSolver,
  trigEquationSolver,
  differentiationSolver,
  integrationSolver,
  calculusApplicationsSolver,
  ratesSolver,
  statisticsSolver,
  probabilitySolver,
  countingSolver,
  distributionsSolver,
  networksSolver,
  matricesSolver,
  vectorsSolver,
  complexSolver,
  inductionSolver,
];

export function getSolver(id: string): Solver | undefined {
  return solvers.find((s) => s.id === id);
}

/** Minimum confidence before we'll claim to know what a problem is. */
const DETECT_THRESHOLD = 0.3;

export interface Detection {
  solver: Solver;
  score: number;
}

/**
 * Work out which topic an input belongs to by asking every solver how well it
 * matches, then taking the strongest answer. Returns null when nothing is
 * confident enough — the UI then asks the student to pick a topic.
 */
export function detectSolver(input: string): Detection | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  let best: Detection | null = null;
  for (const solver of solvers) {
    let score = 0;
    try {
      score = solver.detect(trimmed);
    } catch {
      score = 0; // a detector must never break the app
    }
    if (score > (best?.score ?? 0)) best = { solver, score };
  }
  return best && best.score >= DETECT_THRESHOLD ? best : null;
}
