import { examples } from '../data/examples';
import { solvers } from '../lib/engine/registry';
import { runSolve } from '../lib/engine/run';

/**
 * Inputs absent from the public example library. They deliberately use a
 * non-trivial form for the method, rather than repeating the shortest happy
 * path. The public examples cover every remaining solver/method pair.
 */
const additionalCases: Record<string, string> = {
  'percentages / auto': 'after a 17.5% decrease the price is 247.50',
  'percentages / decimal': 'increase 1280 by 12.5%',
  'percentages / unitary': '37.5% of 864',
  'inverse / undo': 'ln(x + 5) = 5',
  'absolute / cases': '|2x - 3| = x + 3',
  'collect / balance': '2(x + 3) = 3(x - 1)',
  'collect / backtracking': '5(x - 7) = 0',
  'collect / factorise': '(2x - 1)(x + 3) = 0',
  'collect / complete-square': '(x + 3)^2 = 7',
  'collect / formula': '(2x + 1)(x - 3) = 5',
  'reduce / reduce': 'ln(x) + ln(x + 1) = 2',
  'inequalities / auto': '-2x + 7 >= 19',
  'indices / simplify-surd': 'sqrt 432',
  'indices / rationalise': '7/sqrt 12',
  'indices / index-laws': '(3^4)^5',
  'functions / features': 'sketch y = x^3 - 3x',
  'functions / calculus': 'sketch y = x^3 - 3x',
  'measurement / area': 'rectangle l=12 cm, w=7 cm area',
  'measurement / perimeter': 'circle r=7 cm circumference',
  'integrate / definite': 'integrate 4x^3 - 3x^2 + 2x from 1 to 3',
  'integrate / substitution': 'integrate (3x + 2)^5',
  'integrate / basic-functions': 'integrate sin^2 x',
  'integrate / area-between': 'area between y=x^2 and y=2x from 0 to 2',
  'integrate / volume-revolution':
    'volume of revolution y=x from 0 to 2 about x-axis',
  'geometry-proof / isosceles':
    'prove the base angles of an isosceles triangle are equal',
  'geometry-proof / congruence':
    'prove triangles ABC and DEF are congruent by SAS',
  'calculus-applications / stationary': 'stationary points of x^3 - 3x',
  'calculus-applications / gradient': 'gradient of y = x^3 - 4x at x = -2',
  'calculus-applications / tangent': 'tangent to y = x^2 at x = 3',
  'calculus-applications / normal': 'normal to y = x^2 at x = 2',
  'rates / exponential': 'a population of 1250 grows at 4.5% per year after 12',
  'rates / half-life': 'half-life 5730, initial 1000, t=11460',
  'statistics / centre': '4, 8, 15, 16, 23, 42',
  'probability / single': 'probability 17 out of 40',
  'probability / union': 'P(A)=0.65, P(B)=0.4, P(A and B)=0.2 union',
  'probability / intersection': 'P(A)=0.65, P(B)=0.4 intersection',
  'probability / conditional': 'P(A)=0.65, P(B)=0.4 given',
  'counting / combination': 'choose 6 from 18',
  'counting / permutation': '12P4',
  'counting / factorial': '9!',
  'distributions / normal-interval':
    'normal between lower=80 and upper=120, mean=100, sd=15',
  'distributions / sampling': 'sampling mean=54, sd=12, n=144, xbar=56',
  'networks / shortest-path':
    'A-B 7, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3 shortest path A to E',
  'networks / mst':
    'A-B 7, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3, B-E 9 minimum spanning tree',
  'vectors / collinear': 'collinear (1,2) (3,6) (5,10)',
  'vectors / ratio': 'ratio (1,2) (7,8) 2:1',
  'general-equation / numerical': 'sin(x) = x/2',
  'matrices / determinant': 'det [[1,2],[3,4]]',
  'matrices / inverse': 'inverse [[1,2],[3,4]]',
  'matrices / transpose': 'transpose [[1,2,3],[4,5,6]]',
  'matrices / system': 'solve [[2,1,5],[1,-1,1]]',
  'circle-geometry / measurements': 'measure r=5',
  'circle-geometry / arc-sector': 'arc r=6 theta=60',
  'circle-geometry / chord': 'chord r=10 theta=60',
  'circle-geometry / centre-angle': 'theorem circumference=34',
  'circle-geometry / cyclic': 'cyclic a=112',
  'circle-geometry / same-segment': 'same-segment angle1=42',
  'circle-geometry / semicircle': 'semicircle diameter=10',
  'circle-geometry / tangent-radius': 'tangent-radius radius=5',
  'circle-geometry / equal-tangents': 'equal-tangents tangent1=12',
  'circle-geometry / equal-chords': 'equal-chords chord1=8',
  'circle-geometry / tangent-chord': 'tangent-chord alternate=47',
  'circle-geometry / chord-distance': 'chord-distance r=5 c=6',
  'circle-geometry / tangent-length': 'tangent-length r=5 distance=13',
  'circle-geometry / intersecting-chords':
    'intersecting-chords segment1=3 segment2=8 segment3=4',
  'circle-geometry / power-of-point': 'power-of-point tangent=12 external=9',
};

describe('method coverage', () => {
  it('solves a direct regression case for every registered method', () => {
    for (const solver of solvers) {
      for (const method of solver.methods) {
        const key = `${solver.id} / ${method.id}`;
        const input =
          additionalCases[key] ??
          examples.find(
            (example) =>
              example.solverId === solver.id &&
              (example.methodId ?? solver.defaultMethodId) === method.id,
          )?.input;

        expect(input, `${key} has no regression input`).toBeTruthy();
        const result = runSolve(solver, input!, method.id);
        expect(result.ok, `${key} failed on “${input}”`).toBe(true);
        if (result.ok) {
          expect(
            result.solution.steps.length,
            `${key} has no working`,
          ).toBeGreaterThan(0);
          expect(
            result.solution.steps.every(
              (step) => step.latex || step.note || step.visual,
            ),
            `${key} has a blank working line`,
          ).toBe(true);
        }
      }
    }
  });
});
