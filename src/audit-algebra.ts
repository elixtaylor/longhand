import { normalise as nlNormalise } from './lib/nl/normalise';
import { quadraticsSolver } from './solvers/quadratics';
import { runWorked } from './lib/engine/run';

console.log('###### NL NORMALISE TRACE');
for (const s of ['x^3 - 1 = 0', 'x^3 - 6x^2 + 11x - 6 = 0', 'x^4 - 16 = 0', 'x^3 = 8', 'x^3 + x = 0', '2x^3 - 4 = 0', 'x^5 = 32', 'x^3 - 1', 'sqrt(8) + sqrt(18)', 'rationalise 3/(2+sqrt(3))', '2(x-3) = 4x+1']) {
  const r = nlNormalise(s);
  console.log(JSON.stringify(s).padEnd(34), '->', JSON.stringify(r.text), (r as any).notes ?? '');
}

console.log('\n###### QUADRATICS DIRECT ON CUBICS (no nl layer)');
for (const s of ['x^3 - 1 = 0', 'x^3 - 6x^2 + 11x - 6 = 0', 'x^4 - 16 = 0']) {
  const r = quadraticsSolver.solve(s, 'factorise');
  console.log(JSON.stringify(s).padEnd(30), r.ok ? 'OK ' + r.solution.headline + ' => ' + r.solution.answerLatex : 'FAIL: ' + r.error);
}

console.log('\n###### VIA runWorked (nl layer on)');
for (const s of ['x^3 - 1 = 0', 'x^3 - 6x^2 + 11x - 6 = 0', 'x^4 - 16 = 0', 'x^3 = 8', 'x^3 + x = 0', '2x^3 - 4 = 0', 'x^5 = 32', 'x^3 + 2x^2 - 5x - 6 = 0']) {
  const w = runWorked(s);
  const p = w.parts[0];
  console.log(
    JSON.stringify(s).padEnd(30),
    p ? (p.result.ok ? p.solver.id + ' | ' + p.result.solution.headline + ' => ' + p.result.solution.answerLatex : 'FAIL(' + p.solver.id + '): ' + p.result.error) : 'NO-DETECT',
  );
}
