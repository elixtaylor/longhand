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

type AnalyticName = 'sin' | 'cos' | 'tan' | 'exp' | 'ln' | 'reciprocal';

function analyticName(input: string): AnalyticName | null {
  const s = input.toLowerCase().replace(/\s+/g, '');
  if (/\b(?:sin\(?x\)?|y=sinx)\b/.test(s)) return 'sin';
  if (/\b(?:cos\(?x\)?|y=cosx)\b/.test(s)) return 'cos';
  if (/\b(?:tan\(?x\)?|y=tanx)\b/.test(s)) return 'tan';
  if (/(?:e\^x|exp\(?x\)?)/.test(s)) return 'exp';
  if (/(?:ln\(?x\)?|log\(?x\)?)/.test(s)) return 'ln';
  if (/(?:1\/x|x\^-1)/.test(s)) return 'reciprocal';
  return null;
}

function analyticSolution(name: AnalyticName): SolveResult {
  const details: Record<
    AnalyticName,
    {
      range: string;
      features: string;
      answer: string;
      domain: [number, number];
    }
  > = {
    sin: {
      range: '-1 \\le y \\le 1',
      features: 'period 2\\pi; zeros at x = n\\pi; maxima 1; minima -1',
      answer: '\\text{Range }[-1,1],\\; \\text{period }2\\pi',
      domain: [-2 * Math.PI, 2 * Math.PI],
    },
    cos: {
      range: '-1 \\le y \\le 1',
      features:
        'period 2\\pi; zeros at x = \\dfrac{\\pi}{2}+n\\pi; maxima 1; minima -1',
      answer: '\\text{Range }[-1,1],\\; \\text{period }2\\pi',
      domain: [-2 * Math.PI, 2 * Math.PI],
    },
    tan: {
      range: 'y \\in \\mathbb{R}',
      features:
        'period \\pi; zeros at x = n\\pi; vertical asymptotes x = \\dfrac{\\pi}{2}+n\\pi',
      answer: '\\text{Range }\\mathbb{R},\\; \\text{period }\\pi',
      domain: [-Math.PI, Math.PI],
    },
    exp: {
      range: 'y > 0',
      features:
        'y-intercept (0,1); horizontal asymptote y = 0; increasing for all x',
      answer: '\\text{Domain }\\mathbb{R},\\; \\text{Range }(0,\\infty)',
      domain: [-4, 4],
    },
    ln: {
      range: 'y \\in \\mathbb{R}',
      features: 'x-intercept (1,0); vertical asymptote x = 0; domain x > 0',
      answer: '\\text{Domain }x>0,\\; \\text{Range }\\mathbb{R}',
      domain: [0.05, 5],
    },
    reciprocal: {
      range: 'y \\ne 0',
      features:
        'vertical asymptote x = 0; horizontal asymptote y = 0; domain x \\ne 0',
      answer: '\\text{Domain }x\\ne0,\\; \\text{Range }y\\ne0',
      domain: [-5, 5],
    },
  };
  const info = details[name];
  const yIntercept = name === 'exp' ? 1 : name === 'cos' ? 1 : 0;
  return {
    ok: true,
    solution: {
      headline: `Sketch $y = ${name === 'exp' ? 'e^x' : name === 'reciprocal' ? '1/x' : `${name} x`}$`,
      methodName: 'Key features',
      steps: [
        {
          note: 'Write the function.',
          latex: `f(x) = ${name === 'exp' ? 'e^x' : name === 'reciprocal' ? '\\dfrac{1}{x}' : `\\${name} x`}`,
        },
        { note: 'State the domain and range.', latex: `${info.range}` },
        {
          note: 'Identify the key features needed for a sketch.',
          latex: info.features,
        },
        {
          note: 'Putting those features together gives the sketch.',
          visual: {
            kind: 'curve',
            data: {
              expression: name,
              roots: [],
              yIntercept,
              turningPoints: [],
              xDomain: info.domain,
            },
          },
          annotation: 'the sketch',
        },
      ],
      answerLatex: info.answer,
    },
  };
}

export const functionsSolver: Solver = {
  id: 'functions',
  title: 'Sketching curves',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Intercepts, turning points, nature and shape of a polynomial curve.',
  placeholder: 'e.g.  sketch y = x^2 - 4x + 3',
  methods: [
    {
      id: 'features',
      name: 'Key features',
      blurb:
        'Intercepts, turning points and their nature — everything a sketch needs.',
    },
    {
      id: 'calculus',
      name: 'Using calculus',
      blurb: 'Find turning points from f′(x) = 0 and classify them with f″(x).',
    },
  ],
  defaultMethodId: 'features',
  detect(input) {
    if (
      !/\bsketch|\bgraph\b|turning\s*point|key\s*features?|\bvertex\b/i.test(
        input,
      )
    )
      return 0;
    try {
      const p = parsePoly(clean(input), 'x');
      if (p.degree() < 1) return 0;
      // "Find the turning point" asks for one coordinate, not a whole sketch.
      // Answering it with the axis intercepts is a confident answer to a
      // different question, so stand aside unless a sketch was asked for.
      const wantsSketch = /\bsketch|\bgraph\b|key\s*features?/i.test(input);
      return wantsSketch ? 0.95 : 0.4;
    } catch {
      return analyticName(input) ? 0.88 : 0;
    }
  },
  solve(input): SolveResult {
    const analytic = analyticName(input);
    if (analytic) return analyticSolution(analytic);
    let p: Poly;
    try {
      p = parsePoly(clean(input), 'x');
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not read that function.',
      };
    }
    const deg = p.degree();
    if (deg < 1)
      return {
        ok: false,
        error: 'That is a constant — there is no curve to sketch.',
      };
    if (deg > 6)
      return {
        ok: false,
        error: 'Sketching handles polynomials up to degree 6.',
      };

    const fx = polyLatex(p);
    const steps: Step[] = [
      { note: 'Write the function.', latex: `f(x) = ${fx}` },
    ];

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
        annotation:
          roots.length === 1 ? 'one crossing' : `${roots.length} crossings`,
      });
    }

    // Turning points from the derivative
    const d1 = differentiate(p);
    steps.push({
      note: 'Differentiate to locate the turning points.',
      latex: `f'(x) = ${polyLatex(d1)}`,
    });

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
      const d3 = deg >= 3 ? differentiate(d2) : null;
      steps.push({
        note: 'Differentiate again to classify each one.',
        latex: `f''(x) = ${polyLatex(d2)}`,
      });

      for (const x of stationary) {
        const y = evaluatePoly(p, x);
        const curvature = evaluatePoly(d2, x);
        const isInflection =
          Math.abs(curvature) < 1e-9 &&
          d3 !== null &&
          Math.abs(evaluatePoly(d3, x)) > 1e-8;
        const kind = isInflection
          ? 'a point of inflection'
          : Math.abs(curvature) < 1e-9
            ? 'a possible stationary inflection'
            : curvature > 0
              ? 'a minimum'
              : 'a maximum';
        steps.push({
          note: `At $x = ${fmt(x, 4)}$, $f''(x) = ${fmt(curvature, 4)}$, which is ${
            Math.abs(curvature) < 1e-9
              ? 'zero'
              : curvature > 0
                ? 'positive'
                : 'negative'
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
    const leftLimit = even
      ? lead > 0
        ? '+\\infty'
        : '-\\infty'
      : lead > 0
        ? '-\\infty'
        : '+\\infty';
    const rightLimit = lead > 0 ? '+\\infty' : '-\\infty';
    steps.push({
      note: `The leading term is $${fmt(lead)}x^{${deg}}$, so for large $|x|$ the curve ${endBehaviour}.`,
      latex: `x \\to -\\infty: f(x) \\to ${leftLimit}; \\quad x \\to +\\infty: f(x) \\to ${rightLimit}`,
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
    } else if (deg === 1 || deg === 3) {
      steps.push({
        note: 'An odd-degree polynomial is continuous and unbounded in both directions.',
        latex: `\\text{Domain: } x \\in \\mathbb{R}, \\quad \\text{Range: } y \\in \\mathbb{R}`,
        annotation: 'domain and range',
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
          coeffs: p
            .terms()
            .map((t) => [t.power, t.coeff.toNumber()] as [number, number]),
          roots,
          yIntercept: yInt,
          turningPoints: realRoots(d1ForPlot).map((x) => {
            const curvature = evaluatePoly(d2ForPlot, x);
            return {
              x,
              y: evaluatePoly(p, x),
              kind: (Math.abs(curvature) < 1e-9
                ? 'inflection'
                : curvature > 0
                  ? 'min'
                  : 'max') as 'max' | 'min' | 'inflection',
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
      solution: {
        headline: `Sketch $y = ${fx}$`,
        methodName: 'Key features',
        steps,
        answerLatex: summary,
      },
    };
  },
};
