import { getSolver } from '../lib/engine/registry';
import { makeRng } from './random';

/**
 * A deterministic corpus built from the public SACE assessment shape.
 *
 * Sources used to choose the families and notation:
 * - SACE Mathematical Methods external-assessment library and sample papers:
 *   https://www.sace.sa.edu.au/web/mathematical-methods/external-assessment
 * - SACE Specialist Mathematics external-assessment library and sample papers:
 *   https://www.sace.sa.edu.au/web/specialist-mathematics/external-assessment
 * - SACE Stage 1 Mathematics sample topic tasks:
 *   https://www.sace.sa.edu.au/web/mathematics/resources
 *
 * The source papers are copyrighted assessment material, so this repository
 * does not copy them. Instead, this suite records their question families and
 * generates thousands of fresh, equivalent-domain problems with a seeded RNG.
 * That gives us reproducible coverage without republishing exam questions.
 */

interface CorpusCase {
  solverId: string;
  methodId: string;
  input: string;
  family: string;
  exact?: boolean;
}

const cases: CorpusCase[] = [];
function add(
  solverId: string,
  methodId: string,
  input: string,
  family: string,
  exact = false,
) {
  cases.push({ solverId, methodId, input, family, exact });
}

function signTerm(value: number, variable = 'x'): string {
  if (value === 0) return '';
  const magnitude = Math.abs(value);
  const body = magnitude === 1 ? variable : `${magnitude}${variable}`;
  return value < 0 ? `- ${body}` : `+ ${body}`;
}

function constantTerm(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

function linearExpression(a: number, b: number): string {
  const lead = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
  return `${lead} ${constantTerm(b)}`;
}

function polynomial(a: number, b: number, c: number): string {
  const lead = a === 1 ? 'x^2' : a === -1 ? '-x^2' : `${a}x^2`;
  return `${lead} ${signTerm(b)} ${constantTerm(c)}`
    .replace(/\+\s+-/g, '- ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matrix(rows: number[][]): string {
  return `[${rows.map((row) => `[${row.join(',')}]`).join(',')}]`;
}

const rng = makeRng(0x5ace2026);
const N = 72;

/* --------------------------------------------------------------- arithmetic */
for (let i = 0; i < N; i++) {
  const a = 12 + i * 37 + Math.floor(rng.next() * 3);
  const b = 7 + ((i * 11) % 83);
  add(
    'multiplication',
    'grid',
    `${a} * ${b}`,
    'SACE arithmetic multiplication',
  );
  add(
    'multiplication',
    'column',
    `${a} * ${b}`,
    'SACE arithmetic multiplication',
  );

  const divisor = 3 + (i % 47);
  const quotient = 11 + (i % 31);
  const remainder = i % divisor;
  add(
    'division',
    'short',
    `${divisor * quotient + remainder} / ${divisor}`,
    'SACE arithmetic division',
  );
  add(
    'division',
    'long',
    `${divisor * quotient + remainder} / ${divisor}`,
    'SACE arithmetic division',
  );
  add(
    'division',
    'chunking',
    `${divisor * quotient + remainder} / ${divisor}`,
    'SACE arithmetic division',
  );

  const f1 = 2 + (i % 9);
  const d1 = 3 + (i % 8);
  const f2 = 1 + ((i * 3) % 7);
  const d2 = 2 + ((i * 5) % 9);
  const op = (['+', '-', '*', '÷'] as const)[i % 4];
  add(
    'fractions',
    'standard',
    `${f1}/${d1} ${op} ${f2}/${d2}`,
    'SACE fractions',
    true,
  );

  const pct = 5 + (i % 76);
  const amount = 80 + i * 13;
  add('percentages', 'auto', `${pct}% of ${amount}`, 'SACE percentages');
  add(
    'percentages',
    'decimal',
    `increase ${amount} by ${pct}%`,
    'SACE percentages',
  );
  add(
    'percentages',
    'unitary',
    `decrease ${amount} by ${pct}%`,
    'SACE percentages',
  );
}

/* ------------------------------------------------------------------ algebra */
for (let i = 0; i < N; i++) {
  const target = -8 + (i % 23);
  const a = 1 + (i % 7);
  const c = -3 + (i % 6);
  const b = 2 + (i % 11);
  const d = a * target + b - c * target;
  const equation = `${linearExpression(a, b)} = ${linearExpression(c, d)}`;
  add('linear', 'balance', equation, 'SACE linear equations', true);
  add('linear', 'backtracking', equation, 'SACE linear equations', true);

  const x = -4 + (i % 13);
  const y = 3 + (i % 11);
  const a1 = 1 + (i % 5);
  const b1 = 1 + ((i * 2) % 5);
  const a2 = 1 + ((i * 3) % 5);
  const b2 = -4 + (i % 9);
  if (a1 * b2 === a2 * b1) continue;
  const e1 = a1 * x + b1 * y;
  const e2 = a2 * x + b2 * y;
  const simultaneous = `${a1}x + ${b1}y = ${e1}; ${a2}x + ${b2}y = ${e2}`;
  add(
    'simultaneous',
    'elimination',
    simultaneous,
    'SACE simultaneous equations',
    true,
  );
  add(
    'simultaneous',
    'substitution',
    `${b1}y = ${e1 - a1} + ${a1}x; ${a2}x + ${b2}y = ${e2}`,
    'SACE simultaneous equations',
    true,
  );

  const root1 = -5 + (i % 12);
  const root2 = 2 + ((i * 3) % 11);
  const qa = 1 + (i % 4);
  const qb = -qa * (root1 + root2);
  const qc = qa * root1 * root2;
  const quadratic = `${polynomial(qa, qb, qc)} = 0`;
  add('quadratics', 'factorise', quadratic, 'SACE quadratics', true);
  add('quadratics', 'complete-square', quadratic, 'SACE quadratics', true);
  add('quadratics', 'formula', quadratic, 'SACE quadratics', true);

  // Build a cubic from (x - root)(x² + u x + v), so the factor-theorem
  // and division cases always have a known exact root.
  const root = -4 + (i % 9);
  const u = -3 + (i % 7);
  const v = 1 + ((i * 5) % 8);
  const cubic =
    `x^3 ${signTerm(u - root, 'x^2')} ${signTerm(v - root * u, 'x')} ${constantTerm(-root * v)}`
      .replace(/\+\s+-/g, '- ')
      .replace(/\s+/g, ' ')
      .trim();
  const divisor = root < 0 ? `x + ${-root}` : root === 0 ? 'x' : `x - ${root}`;
  add('polynomials', 'factor-theorem', cubic, 'SACE polynomials', true);
  add(
    'polynomials',
    'division',
    `${cubic} / (${divisor})`,
    'SACE polynomial division',
    true,
  );
  add(
    'polynomials',
    'remainder',
    `remainder ${cubic} / (${divisor})`,
    'SACE remainder theorem',
    true,
  );

  const base = 2 + (i % 5);
  const exponent = 2 + (i % 8);
  add(
    'logarithms',
    'same-base',
    `${base}^x = ${base ** exponent}`,
    'SACE logarithmic equations',
    true,
  );
  add(
    'logarithms',
    'logs',
    `${base}^x = ${base ** exponent + 1}`,
    'SACE logarithmic equations',
  );
  add(
    'indices',
    'simplify-surd',
    `sqrt ${12 + i * 7}`,
    'SACE indices and surds',
    true,
  );
  add(
    'indices',
    'rationalise',
    `${2 + (i % 5)}/sqrt ${2 + (i % 7) * 2 + 2}`,
    'SACE indices and surds',
    true,
  );
  add(
    'indices',
    'index-laws',
    `${base}^${exponent} * ${base}^${2 + (i % 5)}`,
    'SACE index laws',
    true,
  );

  const bracket = `(${2 + (i % 5)}x ${i % 2 ? '+' : '-'} ${3 + (i % 7)})`;
  add(
    'collect',
    'balance',
    `${bracket} = ${i % 2 ? 3 : 2}x ${i % 2 ? '-' : '+'} ${4 + (i % 9)}`,
    'SACE collecting terms',
    true,
  );
  add(
    'collect',
    'formula',
    `${bracket}^2 = ${9 + (i % 17)}`,
    'SACE collecting terms',
    true,
  );
  add(
    'reduce',
    'reduce',
    `ln(x + ${2 + (i % 7)}) + ln(x) = ${2 + (i % 4)}`,
    'SACE logarithmic laws',
  );

  const inequality = `${2 + (i % 6)}x ${i % 2 ? '<' : '>'} ${5 + (i % 13)}`;
  add('inequalities', 'auto', inequality, 'SACE inequalities', true);
  add(
    'absolute',
    'cases',
    `|${2 + (i % 4)}x - ${3 + (i % 8)}| = ${2 + (i % 6)}`,
    'SACE absolute values',
    true,
  );
  add(
    'inverse',
    'undo',
    `ln(x + ${1 + (i % 7)}) = ${2 + (i % 4)}`,
    'SACE inverse functions',
    true,
  );
  add(
    'general-equation',
    'numerical',
    `sin(x) = x/${2 + (i % 4)}`,
    'SACE numerical equations',
  );
  add(
    'functions',
    'features',
    `sketch y = x^3 ${signTerm(-3 - (i % 5), 'x')}`,
    'SACE functions and graphs',
  );
  add(
    'functions',
    'calculus',
    `sketch y = x^3 ${signTerm(-3 - (i % 5), 'x')}`,
    'SACE functions and graphs',
  );
}

/* ------------------------------------------------------------------ calculus */
for (let i = 0; i < N; i++) {
  const a = 1 + (i % 6);
  const b = -5 + (i % 11);
  const c = -4 + (i % 9);
  const d = 2 + (i % 7);
  const f =
    `${a}x^4 ${signTerm(b, 'x^3')} ${signTerm(c, 'x^2')} ${constantTerm(d)}`
      .replace(/\+\s+-/g, '- ')
      .replace(/\s+/g, ' ')
      .trim();
  add('differentiate', 'power', `d/dx ${f}`, 'SACE differentiation', true);
  add(
    'differentiate',
    'first-principles',
    `d/dx ${f}`,
    'SACE differentiation',
    true,
  );
  add(
    'differentiate',
    'rules',
    `differentiate (${2 + (i % 4)}x + 1)^${2 + (i % 4)}`,
    'SACE chain rule',
    true,
  );
  add(
    'integrate',
    'reverse-power',
    `integrate ${f}`,
    'SACE integral calculus',
    true,
  );
  add(
    'integrate',
    'definite',
    `integrate ${f} from ${i % 3} to ${3 + (i % 5)}`,
    'SACE definite integrals',
    true,
  );
  add(
    'integrate',
    'substitution',
    `integrate (${2 + (i % 4)}x + ${1 + (i % 5)})^${2 + (i % 5)}`,
    'SACE substitution',
    true,
  );
  add(
    'integrate',
    'by-parts',
    `integrate x^${1 + (i % 3)} exp(x)`,
    'SACE integration by parts',
  );
  add(
    'integrate',
    'basic-functions',
    `integrate ${i % 2 ? 'cos' : 'sin'} x`,
    'SACE basic integrals',
    true,
  );
  add(
    'integrate',
    'area-between',
    `area between y=x^2 and y=${2 + (i % 4)}x from 0 to ${2 + (i % 4)}`,
    'SACE area between curves',
  );
  add(
    'integrate',
    'volume-revolution',
    `volume of revolution y=x^${1 + (i % 2)} from 0 to ${2 + (i % 3)} about x-axis`,
    'SACE volumes of revolution',
  );

  const x = -3 + (i % 9);
  add(
    'calculus-applications',
    'gradient',
    `gradient of y = x^3 ${signTerm(-2, 'x')} at x = ${x}`,
    'SACE rates of change',
  );
  add(
    'calculus-applications',
    'tangent',
    `tangent to y = x^2 ${signTerm(-2, 'x')} at x = ${x}`,
    'SACE tangent lines',
  );
  add(
    'calculus-applications',
    'normal',
    `normal to y = x^2 ${signTerm(-2, 'x')} at x = ${x || 1}`,
    'SACE normal lines',
  );
  add(
    'calculus-applications',
    'stationary',
    `stationary points of x^3 ${signTerm(-3 - (i % 3), 'x')}`,
    'SACE stationary points',
  );
  add(
    'rates',
    'exponential',
    `a population of ${100 + i * 3} grows at ${2 + (i % 7)}% per year, after ${2 + (i % 9)} years`,
    'SACE growth models',
  );
  add(
    'rates',
    'half-life',
    `half-life ${4 + (i % 12)}, initial ${80 + i}, t=${4 + (i % 12)}`,
    'SACE exponential decay',
  );
}

/* --------------------------------------------------------------- trigonometry */
for (let i = 0; i < N; i++) {
  const a = 3 + (i % 17);
  const b = 4 + ((i * 3) % 19);
  const c = Math.sqrt(a * a + b * b);
  add('right-triangle', 'pythagoras', `a=${a}, b=${b}`, 'SACE right triangles');
  add(
    'right-triangle',
    'trig-ratio',
    `A=${15 + (i % 65)}, c=${10 + i}`,
    'SACE right triangles',
  );
  const sideA = 7 + (i % 13);
  const sideB = 9 + ((i * 2) % 13);
  const angleC = 20 + (i % 130);
  add(
    'triangle-rules',
    'cosine-rule',
    `a=${sideA}, b=${sideB}, C=${angleC}`,
    'SACE cosine rule',
  );
  add(
    'triangle-rules',
    'area',
    `a=${sideA}, b=${sideB}, C=${angleC} area`,
    'SACE triangle areas',
  );
  add(
    'triangle-rules',
    'sine-rule',
    `a=${sideA}, A=${40 + (i % 50)}, B=${20 + (i % 35)}`,
    'SACE sine rule',
  );
  add(
    'trig-equations',
    'unit-circle',
    `sin x = ${[-0.8, -0.5, 0.25, 0.5, 0.8][i % 5]}`,
    'SACE trigonometric equations',
  );
  void c;
}

/* --------------------------------------------------------------- measurement */
for (let i = 0; i < N; i++) {
  const r = 2 + (i % 13);
  const h = 3 + (i % 17);
  add('measurement', 'auto', `circle r=${r}`, 'SACE measurement');
  add(
    'measurement',
    'area',
    `rectangle l=${r}, w=${h} area`,
    'SACE measurement',
  );
  add(
    'measurement',
    'perimeter',
    `rectangle l=${r}, w=${h} perimeter`,
    'SACE measurement',
  );
  add(
    'measurement',
    'volume',
    `cylinder r=${r}, h=${h} volume`,
    'SACE measurement',
  );
}

/* -------------------------------------------------------------- statistics */
for (let i = 0; i < N; i++) {
  const data = [2 + i, 5 + i * 2, 9 + i, 14 + i * 3, 20 + i * 2, 27 + i];
  const list = data.join(', ');
  add('statistics', 'summary', list, 'SACE descriptive statistics');
  add('statistics', 'centre', list, 'SACE descriptive statistics');
  add(
    'statistics',
    'spread',
    `${list} standard deviation`,
    'SACE descriptive statistics',
  );
  add(
    'statistics',
    'five-number',
    `${list} five number summary`,
    'SACE descriptive statistics',
  );

  const n = 5 + (i % 15);
  const x = i % (n + 1);
  const p = [0.2, 0.25, 0.4, 0.5, 0.75][i % 5];
  add(
    'distributions',
    'binomial',
    `binomial n=${n}, p=${p}, x=${x}`,
    'SACE discrete random variables',
  );
  add(
    'distributions',
    'normal',
    `normal mean=${50 + i}, sd=${5 + (i % 9)}, x=${55 + i}`,
    'SACE normal distribution',
  );
  add(
    'distributions',
    'normal-interval',
    `normal between ${45 + i} and ${55 + i}, mean=${50 + i}, sd=${5 + (i % 9)}`,
    'SACE normal distribution',
  );
  add(
    'distributions',
    'sampling',
    `sampling mean=${50 + i}, sd=${5 + (i % 9)}, n=${25 + (i % 10)}, xbar=${51 + i}`,
    'SACE sampling distributions',
  );
  add(
    'distributions',
    'confidence',
    `confidence mean=${50 + i}, sd=${5 + (i % 9)}, n=${25 + (i % 10)}`,
    'SACE confidence intervals',
  );

  const pa = [0.2, 0.25, 0.4, 0.5][i % 4];
  const pb = [0.3, 0.4, 0.5, 0.6][i % 4];
  add(
    'probability',
    'single',
    `${3 + (i % 8)} out of ${10 + (i % 15)}`,
    'SACE probability',
  );
  add(
    'probability',
    'union',
    `P(A)=${pa}, P(B)=${pb} independent union`,
    'SACE probability',
  );
  add(
    'probability',
    'intersection',
    `P(A)=${pa}, P(B)=${pb} independent intersection`,
    'SACE probability',
  );
  add(
    'probability',
    'conditional',
    `P(A)=${pa}, P(B)=${pb} independent given`,
    'SACE probability',
  );

  const nn = 5 + (i % 16);
  const rr = i % (nn + 1);
  add('counting', 'combination', `${nn}C${rr}`, 'SACE counting');
  add('counting', 'permutation', `${nn}P${rr}`, 'SACE counting');
  add('counting', 'factorial', `${3 + (i % 8)}!`, 'SACE counting');
  add(
    'binomial',
    'theorem',
    `expand (x + ${2 + (i % 5)})^${2 + (i % 4)}`,
    'SACE binomial expansion',
  );
}

/* --------------------------------------------------------- finance/networks */
for (let i = 0; i < N; i++) {
  const principal = 1000 + i * 37;
  const rate = 2 + (i % 9);
  const years = 1 + (i % 8);
  add(
    'financial',
    'compound',
    `$${principal} at ${rate}% for ${years} years compound`,
    'SACE finance',
  );
  add(
    'financial',
    'simple',
    `$${principal} at ${rate}% for ${years} years simple`,
    'SACE finance',
  );
  add(
    'financial',
    'depreciation',
    `$${principal} at ${rate}% for ${years} years depreciation`,
    'SACE finance',
  );
  add(
    'financial',
    'repayment',
    `loan $${principal * 10} at ${rate + 2}% for ${years + 5} years repaid monthly`,
    'SACE finance',
  );

  const w = 2 + (i % 8);
  const graph = `A-B ${w}, A-C ${w + 2}, B-C ${w + 1}, B-D ${w + 3}, C-D ${w + 4}, D-E ${w + 1}`;
  add(
    'networks',
    'shortest-path',
    `${graph} shortest path A to E`,
    'SACE networks',
  );
  add('networks', 'mst', `${graph} minimum spanning tree`, 'SACE networks');

  const first = 2 + (i % 9);
  const diff = 1 + (i % 6);
  add(
    'sequences',
    'arithmetic',
    `a=${first}, d=${diff}, n=${3 + (i % 15)}`,
    'SACE arithmetic sequences',
  );
  const ratio = 0.25 + (i % 4) * 0.25;
  add(
    'sequences',
    'geometric',
    `a=${first}, r=${ratio}, n=${3 + (i % 10)}`,
    'SACE geometric sequences',
  );
}

/* --------------------------------------------------------- Specialist topics */
for (let i = 0; i < N; i++) {
  const x1 = 1 + (i % 5);
  const y1 = 2 + (i % 7);
  const x2 = 3 + (i % 6);
  const y2 = 5 + (i % 8);
  add('vectors', 'component', `(${x1},${y1}) + (${x2},${y2})`, 'SACE vectors');
  add(
    'vectors',
    'component',
    `(${x1},${y1},${i % 5}) . (${x2},${y2},${1 + (i % 4)})`,
    'SACE vectors',
  );
  add(
    'vectors',
    'component',
    `(${x1},${y1},${i % 5}) x (${x2},${y2},${1 + (i % 4)})`,
    'SACE vectors',
  );
  add(
    'vectors',
    'collinear',
    `collinear (0,0) (${x1},${y1}) (${x1 * 2},${y1 * 2})`,
    'SACE vectors',
  );
  add(
    'vectors',
    'ratio',
    `ratio (0,0) (${x2 * 2},${y2 * 2}) ${1 + (i % 4)}:${2 + (i % 3)}`,
    'SACE vectors',
  );

  const m1 = [
    [1 + (i % 4), 2],
    [3, 5 + (i % 4)],
  ];
  const m2 = [
    [2, 1 + (i % 3)],
    [1, 4],
  ];
  add('matrices', 'standard', `${matrix(m1)} * ${matrix(m2)}`, 'SACE matrices');
  add('matrices', 'determinant', `det ${matrix(m1)}`, 'SACE matrices');
  add('matrices', 'inverse', `inverse ${matrix(m1)}`, 'SACE matrices');
  add(
    'matrices',
    'transpose',
    `transpose ${matrix([
      [1 + i, 2, 3],
      [4, 5 + i, 6],
    ])}`,
    'SACE matrices',
  );
  add(
    'matrices',
    'system',
    `solve ${matrix([
      [2 + (i % 4), 1, 5 + i],
      [1, -1, 1 + (i % 3)],
    ])}`,
    'SACE matrices',
  );

  const re = 2 + (i % 8);
  const im = 1 + (i % 7);
  add(
    'complex',
    'rectangular',
    `(${re}+${im}i)*(${im}-${re}i)`,
    'SACE complex numbers',
  );
  add('complex', 'polar', `polar ${re}+${im}i`, 'SACE complex numbers');
  add(
    'induction',
    'sum',
    `sum r^${1 + (i % 4)}`,
    'SACE mathematical induction',
    true,
  );

  const radius = 3 + (i % 11);
  add(
    'circle-geometry',
    'measurements',
    `measure r=${radius}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'arc-sector',
    `arc r=${radius} theta=${30 + (i % 120)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'chord',
    `chord r=${radius} theta=${30 + (i % 120)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'centre-angle',
    `theorem circumference=${20 + (i % 70)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'cyclic',
    `cyclic a=${30 + (i % 120)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'same-segment',
    `same-segment angle1=${30 + (i % 120)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'semicircle',
    `semicircle diameter=${2 * radius}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'tangent-radius',
    `tangent-radius radius=${radius}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'equal-tangents',
    `equal-tangents tangent1=${radius}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'equal-chords',
    `equal-chords chord1=${radius}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'tangent-chord',
    `tangent-chord alternate=${30 + (i % 120)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'chord-distance',
    `chord-distance r=${radius} c=${Math.max(2, radius - 1)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'tangent-length',
    `tangent-length r=${radius} distance=${radius + 5}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'intersecting-chords',
    `intersecting-chords segment1=${2 + (i % 7)} segment2=${3 + (i % 6)} segment3=${4 + (i % 5)}`,
    'SACE circle geometry',
  );
  add(
    'circle-geometry',
    'power-of-point',
    `power-of-point tangent=${radius + 2} external=${radius - 1}`,
    'SACE circle geometry',
  );
}

describe('SACE-aligned generated regression corpus', () => {
  it('solves thousands of fresh problems with non-empty, explained working', () => {
    expect(cases.length).toBe(8020);
    const failures: string[] = [];
    for (const problem of cases) {
      const solver = getSolver(problem.solverId);
      if (!solver) {
        failures.push(`${problem.family}: missing solver ${problem.solverId}`);
        continue;
      }
      let result;
      try {
        result = solver.solve(problem.input, problem.methodId);
      } catch (error) {
        failures.push(
          `${problem.family} / ${problem.solverId}.${problem.methodId} threw on ${problem.input}: ${String(error)}`,
        );
        continue;
      }
      if (!result.ok) {
        failures.push(
          `${problem.family} / ${problem.solverId}.${problem.methodId} refused ${problem.input}: ${result.error}`,
        );
        continue;
      }
      if (result.solution.steps.length === 0) {
        failures.push(
          `${problem.family} / ${problem.solverId}.${problem.methodId} returned no working for ${problem.input}`,
        );
      }
      if (
        result.solution.steps.some(
          (step) => !step.note || !(step.latex || step.visual),
        )
      ) {
        failures.push(
          `${problem.family} / ${problem.solverId}.${problem.methodId} has an unexplained or blank step for ${problem.input}`,
        );
      }
    }
    expect(
      failures.slice(0, 40),
      `first failures of ${failures.length}`,
    ).toEqual([]);
  }, 15000);

  it('keeps exact families symbolic instead of replacing them with approximations', () => {
    const failures: string[] = [];
    for (const problem of cases.filter((entry) => entry.exact)) {
      const solver = getSolver(problem.solverId);
      if (!solver) continue;
      const result = solver.solve(problem.input, problem.methodId);
      if (!result.ok) continue;
      const answer = result.solution.answerLatex ?? '';
      if (/\b(?:bisection|numerical tolerance|no root found)\b/i.test(answer)) {
        failures.push(
          `${problem.solverId}.${problem.methodId} used a numerical fallback for ${problem.input}`,
        );
      }
      if (/\d+\.\d+/.test(answer)) {
        failures.push(
          `${problem.solverId}.${problem.methodId} exposed a decimal in an exact family for ${problem.input}: ${answer}`,
        );
      }
    }
    expect(
      failures.slice(0, 40),
      `first exactness failures of ${failures.length}`,
    ).toEqual([]);
  });

  it('never exposes non-finite values, broken braces or runaway working', () => {
    const failures: string[] = [];
    for (const problem of cases) {
      const solver = getSolver(problem.solverId);
      if (!solver) continue;
      const result = solver.solve(problem.input, problem.methodId);
      if (!result.ok) continue;
      const rendered = [
        result.solution.headline,
        result.solution.answerLatex ?? '',
        ...result.solution.steps.flatMap((step) => [
          step.note ?? '',
          step.latex ?? '',
          step.annotation ?? '',
        ]),
      ].join(' ');
      if (/NaN|Infinity|\\text\{undefined\}/.test(rendered)) {
        failures.push(
          `${problem.solverId}.${problem.methodId} exposed a non-finite value for ${problem.input}`,
        );
      }
      let depth = 0;
      let bracesValid = true;
      for (const character of rendered) {
        if (character === '{') depth++;
        if (character === '}') depth--;
        if (depth < 0) bracesValid = false;
      }
      if (depth !== 0 || !bracesValid) {
        failures.push(
          `${problem.solverId}.${problem.methodId} emitted unbalanced braces for ${problem.input}`,
        );
      }
      if (result.solution.steps.length > 80) {
        failures.push(
          `${problem.solverId}.${problem.methodId} emitted ${result.solution.steps.length} steps for ${problem.input}`,
        );
      }
    }
    expect(
      failures.slice(0, 40),
      `first rendering failures of ${failures.length}`,
    ).toEqual([]);
  }, 15000);
});
