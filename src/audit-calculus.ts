import { runWorked } from './lib/engine/run';

const cases = [
  'd/dx x^3 - 4x^2 + 2x - 7',
  'differentiate x^2 sin(3x)',
  'differentiate (2x+1)^5 / x',
  'differentiate e^(x^2)',
  'differentiate ln(3x+1)',
  'differentiate 1/x',
  'differentiate sqrt(x)',
  'differentiate 5',
  'integrate 3x^2 + 2x',
  'integrate x^-2',
  'integrate 1/x',
  'integrate sin(2x)',
  'evaluate the integral of x^2 from 1 to 2',
  'find the stationary points of y = x^3 - 3x',
  'find the gradient of y = x^2 at x = 3',
  'find the equation of the tangent to y = x^2 at x = 2',
  'find the normal to y = x^2 at x = 2',
  'a population grows at 3% per year, doubling time',
];

for (const c of cases) {
  const w = runWorked(c);
  const p = w.parts[0];
  if (!p) { console.log(JSON.stringify(c), '-> NO PART'); continue; }
  if (!p.result.ok) { console.log(JSON.stringify(c), '-> FAIL', p.result.error); continue; }
  console.log(JSON.stringify(c), '->', p.solver.id, '|', JSON.stringify(p.result.solution.answerLatex));
}
