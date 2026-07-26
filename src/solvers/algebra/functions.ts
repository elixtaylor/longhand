import { parsePoly, Poly } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import { realRoots, evaluatePoly } from '../../lib/math/roots';
import { differentiate } from '../calculus/differentiate';
import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Sketching a curve from its key features (SACE Methods — Functions and
 * Graphs; Specialist — Functions and Sketching Graphs): intercepts, turning
 * points and their nature, and end behaviour.
 */

function clean(input: string): string {
  return input
    .replace(/\b(?:sketch|graph|curve|features?|key)\b/gi, ' ')
    .replace(/\b(?:domain|range|turning\s*points?|intercepts?|vertex)\b/gi, ' ')
    .replace(/\b(?:f\s*\(\s*x\s*\)|y)\s*=/gi, ' ')
    .trim();
}

export const functionsSolver: Solver = {
  id: 'functions',
  title: 'Sketching curves',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Intercepts, turning points, nature and shape of a polynomial curve.',
  placeholder: 'e.g.  sketch y = x^2 - 4x + 3',
  methods: [
    { id: 'features', name: 'Key features', blurb: 'Intercepts, turning points and their nature — everything a sketch needs.' },
    { id: 'calculus', name: 'Using calculus', blurb: 'Find turning points from f′(x) = 0 and classify them with f″(x).' },
  ],
  defaultMethodId: 'features',
  detect(input) {
    if (!/\bsketch|\bgraph\b|turning\s*point|key\s*features?|\bvertex\b/i.test(input)) return 0;
    try {
      const p = parsePoly(clean(input), 'x');
      if (p.degree() < 1) return 0;
      // "Find the turning point" asks for one coordinate, not a whole sketch.
      // Answering it with the axis intercepts is a confident answer to a
      // different question, so stand aside unless a sketch was asked for.
      const wantsSketch = /\bsketch|\bgraph\b|key\s*features?/i.test(input);
      return wantsSketch ? 0.95 : 0.4;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let p: Poly;
    try {
      p = parsePoly(clean(input), 'x');
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that function.' };
    }
    const deg = p.degree();
    if (deg < 1) return { ok: false, error: 'That is a constant — there is no curve to sketch.' };
    if (deg > 4) return { ok: false, error: 'Sketching handles polynomials up to degree 4.' };

    const fx = polyLatex(p);
    const steps: Step[] = [{ note: 'Write the function.', latex: `f(x) = ${fx}` }];

    // y-intercept
    const yInt = p.get(0).toNumber();
    steps.push({
      note: 'Find the $y$-intercept by putting $x = 0$.',
      latex: `f(0) = ${fmt(yInt)}`,
      annotation: `crosses at (0, ${fmt(yInt)})`,
    });

    // x-intercepts
    const roots = realRoots(p);
    if (roots.length === 0) {
      steps.push({
        note: 'Solving $f(x) = 0$ gives no real solutions, so the curve never crosses the $x$-axis.',
        latex: `${fx} = 0 \\;\\Rightarrow\\; \\text{no real roots}`,
      });
    } else {
      steps.push({
        note: 'Find the $x$-intercepts by solving $f(x) = 0$.',
        latex: roots.map((r) => `x = ${fmt(r, 4)}`).join(', \\quad '),
        annotation: roots.length === 1 ? 'one crossing' : `${roots.length} crossings`,
      });
    }

    // Turning points from the derivative
    const d1 = differentiate(p);
    steps.push({ note: 'Differentiate to locate the turning points.', latex: `f'(x) = ${polyLatex(d1)}` });

    const stationary = realRoots(d1);
    if (stationary.length === 0) {
      steps.push({
        note: '$f’(x) = 0$ has no real solutions, so the curve has no turning points — it is always increasing or always decreasing.',
        latex: `f'(x) \\ne 0`,
      });
    } else {
      steps.push({
        note: 'Solve $f’(x) = 0$ to find where the gradient is zero.',
        latex: stationary.map((r) => `x = ${fmt(r, 4)}`).join(', \\quad '),
        annotation: 'stationary points',
      });

      const d2 = differentiate(d1);
      steps.push({ note: 'Differentiate again to classify each one.', latex: `f''(x) = ${polyLatex(d2)}` });

      for (const x of stationary) {
        const y = evaluatePoly(p, x);
        const curvature = evaluatePoly(d2, x);
        const kind =
          Math.abs(curvature) < 1e-9
            ? 'a possible point of inflection'
            : curvature > 0
              ? 'a minimum'
              : 'a maximum';
        steps.push({
          note: `At $x = ${fmt(x, 4)}$, $f''(x) = ${fmt(curvature, 4)}$, which is ${
            Math.abs(curvature) < 1e-9 ? 'zero' : curvature > 0 ? 'positive' : 'negative'
          }.`,
          latex: `\\left(${fmt(x, 4)},\\; ${fmt(y, 4)}\\right) \\text{ is ${kind}}`,
          annotation: kind,
        });
      }
    }

    // Shape at the extremes
    const lead = p.get(deg).toNumber();
    const even = deg % 2 === 0;
    const endBehaviour = even
      ? lead > 0
        ? 'both ends rise'
        : 'both ends fall'
      : lead > 0
        ? 'falls to the left, rises to the right'
        : 'rises to the left, falls to the right';
    steps.push({
      note: `The leading term is $${fmt(lead)}x^{${deg}}$, so for large $|x|$ the curve ${endBehaviour}.`,
      latex: `\\text{as } x \\to \\pm\\infty, \\; f(x) \\to ${even ? (lead > 0 ? '+\\infty' : '-\\infty') : '\\pm\\infty'}`,
      annotation: 'end behaviour',
    });

    // Range, when it can be stated simply
    if (deg === 2) {
      const vertexX = stationary[0];
      const vertexY = evaluatePoly(p, vertexX);
      const opensUp = lead > 0;
      steps.push({
        note: 'For a parabola the turning point gives the range directly.',
        latex: `\\text{Domain: } x \\in \\mathbb{R}, \\quad \\text{Range: } y ${opensUp ? '\\ge' : '\\le'} ${fmt(vertexY, 4)}`,
        annotation: 'domain and range',
      });
      steps.push({
        note: 'The axis of symmetry runs through the turning point.',
        latex: `x = ${fmt(vertexX, 4)}`,
        annotation: 'axis of symmetry',
      });
    } else {
      steps.push({
        note: 'A polynomial is defined for every real number.',
        latex: `\\text{Domain: } x \\in \\mathbb{R}`,
        annotation: 'domain',
      });
    }

    // The sketch itself, built from exactly the numbers worked out above.
    const d1ForPlot = differentiate(p);
    const d2ForPlot = differentiate(d1ForPlot);
    steps.push({
      note: 'Putting it all together gives the sketch.',
      visual: {
        kind: 'curve',
        data: {
          coeffs: p.terms().map((t) => [t.power, t.coeff.toNumber()] as [number, number]),
          roots,
          yIntercept: yInt,
          turningPoints: realRoots(d1ForPlot).map((x) => {
            const curvature = evaluatePoly(d2ForPlot, x);
            return {
              x,
              y: evaluatePoly(p, x),
              kind: (Math.abs(curvature) < 1e-9 ? 'inflection' : curvature > 0 ? 'min' : 'max') as
                | 'max'
                | 'min'
                | 'inflection',
            };
          }),
        },
      },
      annotation: 'the sketch',
    });

    const summary =
      roots.length > 0
        ? `\\text{cuts } x \\text{ at } ${roots.map((r) => fmt(r, 4)).join(',\\; ')};\\; y\\text{-int } ${fmt(yInt)}`
        : `y\\text{-intercept } ${fmt(yInt)},\\; \\text{no real roots}`;

    return {
      ok: true,
      solution: { headline: `Sketch $y = ${fx}$`, methodName: 'Key features', steps, answerLatex: summary },
    };
  },
};
