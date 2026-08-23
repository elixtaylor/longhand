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
import { collectSolver } from '../../solvers/algebra/collect';
import { absoluteSolver } from '../../solvers/algebra/absolute';
import { reduceSolver } from '../../solvers/algebra/reduce';
import { functionsSolver } from '../../solvers/algebra/functions';
import { probabilitySolver } from '../../solvers/statistics/probability';
import { countingSolver } from '../../solvers/statistics/counting';
import { binomialSolver } from '../../solvers/statistics/binomial';
import { networksSolver } from '../../solvers/networks';
import { ratesSolver } from '../../solvers/calculus/rates';
import { calculusApplicationsSolver } from '../../solvers/calculus/applications';
import { geometricProofSolver } from '../../solvers/geometry/proofs';
import { circleGeometrySolver } from '../../solvers/geometry/circles';
import { generalSolver } from '../../solvers/algebra/general';
import { expressionsSolver } from '../../solvers/algebra/expressions';

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
  absoluteSolver,
  collectSolver,
  expressionsSolver,
  reduceSolver,
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
  geometricProofSolver,
  circleGeometrySolver,
  calculusApplicationsSolver,
  ratesSolver,
  statisticsSolver,
  probabilitySolver,
  countingSolver,
  binomialSolver,
  distributionsSolver,
  networksSolver,
  matricesSolver,
  vectorsSolver,
  complexSolver,
  inductionSolver,
  generalSolver,
];

const solversById = new Map(solvers.map((solver) => [solver.id, solver]));

export function getSolver(id: string): Solver | undefined {
  return solversById.get(id);
}

/** Minimum confidence before we'll claim to know what a problem is. */
const DETECT_THRESHOLD = 0.3;

export interface Detection {
  solver: Solver;
  score: number;
}

function scoreSolver(solver: Solver, input: string): number {
  try {
    return solver.detect(input);
  } catch {
    return 0;
  }
}

/**
 * Work out which topics an input may belong to by asking every solver how well
 * it matches, retaining all confident candidates in score order. The UI uses
 * `detectSolver` for its single live label; the worked engine can use the
 * candidate list when an equation legitimately sits between topics.
 */
export function detectSolvers(input: string): Detection[] {
  const trimmed = input.trim();
  if (trimmed === '') return [];

  const found: Detection[] = [];
  for (const solver of solvers) {
    const score = scoreSolver(solver, trimmed);
    if (score >= DETECT_THRESHOLD) found.push({ solver, score });
  }
  return found.sort((a, b) => b.score - a.score);
}

/** The strongest confident topic, retained for the live UI label. */
export function detectSolver(input: string): Detection | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  let best: Detection | null = null;
  for (const solver of solvers) {
    const score = scoreSolver(solver, trimmed);
    if (score >= DETECT_THRESHOLD && (!best || score > best.score)) {
      best = { solver, score };
    }
  }
  return best;
}
