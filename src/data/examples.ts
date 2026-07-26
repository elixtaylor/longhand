export interface Example {
  solverId: string;
  methodId?: string;
  input: string;
  label: string;
  subject: string;
}

/** SACE-tagged sample problems, shown per topic to get students started. */
export const examples: Example[] = [
  // ---------------------------------------------------------------- Arithmetic
  { solverId: 'multiplication', methodId: 'grid', input: '234 × 56', label: '234 × 56', subject: 'Foundations' },
  { solverId: 'multiplication', methodId: 'column', input: '47 × 89', label: '47 × 89', subject: 'Foundations' },
  { solverId: 'division', methodId: 'short', input: '864 ÷ 24', label: '864 ÷ 24', subject: 'Foundations' },
  { solverId: 'division', methodId: 'long', input: '4928 ÷ 16', label: '4928 ÷ 16', subject: 'Foundations' },
  { solverId: 'division', methodId: 'chunking', input: '525 ÷ 15', label: '525 ÷ 15', subject: 'Foundations' },
  { solverId: 'fractions', input: '3/4 + 1/6', label: '3/4 + 1/6', subject: 'Foundations' },
  { solverId: 'fractions', input: '2/3 × 5/7', label: '2/3 × 5/7', subject: 'Foundations' },
  { solverId: 'fractions', input: '3/4 ÷ 1/2', label: '3/4 ÷ 1/2', subject: 'Foundations' },

  // -------------------------------------------------------------------- Algebra
  { solverId: 'linear', methodId: 'balance', input: '3x + 4 = 2x - 5', label: '3x + 4 = 2x − 5', subject: 'General' },
  { solverId: 'linear', methodId: 'backtracking', input: '5x - 7 = 18', label: '5x − 7 = 18', subject: 'General' },
  { solverId: 'simultaneous', methodId: 'elimination', input: '2x + 3y = 12 ; x - y = 1', label: '2x + 3y = 12 ;  x − y = 1', subject: 'General' },
  { solverId: 'simultaneous', methodId: 'substitution', input: 'y = 2x + 1 ; 3x + y = 11', label: 'y = 2x + 1 ;  3x + y = 11', subject: 'Methods' },

  // ----------------------------------------------------------------- Quadratics
  { solverId: 'quadratics', methodId: 'factorise', input: '2x^2 + 7x - 4 = 0', label: '2x² + 7x − 4 = 0', subject: 'Methods' },
  { solverId: 'quadratics', methodId: 'complete-square', input: 'x^2 + 6x + 2 = 0', label: 'x² + 6x + 2 = 0', subject: 'Methods' },
  { solverId: 'quadratics', methodId: 'formula', input: '3x^2 - 2x - 4 = 0', label: '3x² − 2x − 4 = 0', subject: 'Methods' },
  { solverId: 'quadratics', methodId: 'formula', input: 'x^2 + x + 1 = 0', label: 'x² + x + 1 = 0  (complex)', subject: 'Specialist' },

  // ---------------------------------------------------------------- Polynomials
  { solverId: 'polynomials', methodId: 'factor-theorem', input: 'x^3 - 2x^2 - 5x + 6', label: 'factorise x³ − 2x² − 5x + 6', subject: 'Methods' },
  { solverId: 'polynomials', methodId: 'division', input: 'x^3 - 2x^2 - 5x + 6 ÷ (x - 1)', label: 'x³ − 2x² − 5x + 6 ÷ (x − 1)', subject: 'Methods' },
  { solverId: 'polynomials', methodId: 'remainder', input: 'remainder x^3 + 2x - 3 ÷ (x - 2)', label: 'remainder of x³ + 2x − 3 ÷ (x − 2)', subject: 'Methods' },

  // ----------------------------------------------------------- Logs & exponentials
  { solverId: 'logarithms', methodId: 'same-base', input: '2^x = 32', label: '2ˣ = 32', subject: 'Methods' },
  { solverId: 'logarithms', methodId: 'logs', input: '3^x = 20', label: '3ˣ = 20', subject: 'Methods' },
  { solverId: 'logarithms', methodId: 'same-base', input: 'log2(32)', label: 'log₂(32)', subject: 'Methods' },
  { solverId: 'logarithms', methodId: 'same-base', input: 'ln x = 2', label: 'ln x = 2', subject: 'Methods' },

  // ------------------------------------------------------------------- Financial
  { solverId: 'financial', methodId: 'compound', input: '$5000 at 4% for 3 years compound', label: '$5000 at 4% for 3 yrs, compound', subject: 'General' },
  { solverId: 'financial', methodId: 'simple', input: '$5000 at 4% for 3 years simple', label: '$5000 at 4% for 3 yrs, simple', subject: 'General' },
  { solverId: 'financial', methodId: 'depreciation', input: '$20000 at 15% for 4 years depreciation', label: '$20 000 depreciating 15% for 4 yrs', subject: 'General' },
  { solverId: 'financial', methodId: 'repayment', input: 'loan $300000 at 6% for 30 years repaid monthly', label: '$300 000 loan, 6%, 30 yrs monthly', subject: 'General' },

  // ------------------------------------------------------------------- Sequences
  { solverId: 'sequences', methodId: 'arithmetic', input: '3, 7, 11, 15', label: '3, 7, 11, 15', subject: 'Specialist' },
  { solverId: 'sequences', methodId: 'geometric', input: '2, 6, 18, 54', label: '2, 6, 18, 54', subject: 'Specialist' },
  { solverId: 'sequences', methodId: 'geometric', input: 'a=8, r=0.5, n=10', label: 'a = 8, r = 0.5  (limiting sum)', subject: 'Specialist' },

  // ----------------------------------------------------------------- Measurement
  { solverId: 'measurement', methodId: 'auto', input: 'circle r=5', label: 'circle, r = 5', subject: 'General' },
  { solverId: 'measurement', methodId: 'volume', input: 'cylinder r=3, h=10 volume', label: 'cylinder volume, r = 3, h = 10', subject: 'General' },
  { solverId: 'measurement', methodId: 'auto', input: 'trapezium a=5, b=7, h=4', label: 'trapezium, a = 5, b = 7, h = 4', subject: 'General' },
  { solverId: 'measurement', methodId: 'auto', input: 'cone r=3, h=4', label: 'cone, r = 3, h = 4', subject: 'General' },

  // ---------------------------------------------------------------- Trigonometry
  { solverId: 'right-triangle', methodId: 'pythagoras', input: 'a=3, b=4', label: 'a = 3, b = 4  (find hypotenuse)', subject: 'General' },
  { solverId: 'right-triangle', methodId: 'trig-ratio', input: 'A=30, c=10', label: 'A = 30°, c = 10', subject: 'General' },
  { solverId: 'triangle-rules', methodId: 'cosine-rule', input: 'a=7, b=9, C=40', label: 'a = 7, b = 9, C = 40°', subject: 'General' },
  { solverId: 'triangle-rules', methodId: 'sine-rule', input: 'a=10, A=80, B=40', label: 'a = 10, A = 80°, B = 40°', subject: 'General' },
  { solverId: 'triangle-rules', methodId: 'area', input: 'a=6, b=8, C=50 area', label: 'area with a = 6, b = 8, C = 50°', subject: 'General' },
  { solverId: 'trig-equations', input: 'sin x = 0.5', label: 'sin x = 0.5', subject: 'Methods' },
  { solverId: 'trig-equations', input: 'cos x = -0.5', label: 'cos x = −0.5', subject: 'Methods' },

  // -------------------------------------------------------------------- Calculus
  { solverId: 'differentiate', methodId: 'power', input: 'd/dx x^3 - 4x^2 + 2x - 7', label: 'd/dx (x³ − 4x² + 2x − 7)', subject: 'Methods' },
  { solverId: 'differentiate', methodId: 'rules', input: 'differentiate x^2 * sin x', label: 'd/dx (x² sin x)  — product', subject: 'Methods' },
  { solverId: 'differentiate', methodId: 'rules', input: 'differentiate (2x+1)^5', label: 'd/dx (2x + 1)⁵  — chain', subject: 'Methods' },
  { solverId: 'differentiate', methodId: 'rules', input: 'differentiate x/(x+1)', label: 'd/dx x/(x + 1)  — quotient', subject: 'Methods' },
  { solverId: 'differentiate', methodId: 'first-principles', input: 'd/dx x^2', label: 'x²  from first principles', subject: 'Methods' },
  { solverId: 'integrate', input: '∫ 3x^2 + 2x - 5 dx', label: '∫ 3x² + 2x − 5 dx', subject: 'Methods' },
  { solverId: 'integrate', input: '∫ 3x^2 dx from 0 to 2', label: '∫₀² 3x² dx  (definite)', subject: 'Methods' },

  // ------------------------------------------------------------------ Statistics
  { solverId: 'statistics', methodId: 'summary', input: '4, 8, 15, 16, 23, 42', label: '4, 8, 15, 16, 23, 42', subject: 'General' },
  { solverId: 'statistics', methodId: 'spread', input: '2, 4, 4, 4, 5, 5, 7, 9 standard deviation', label: 'standard deviation of 2, 4, 4, 4, 5, 5, 7, 9', subject: 'Methods' },
  { solverId: 'statistics', methodId: 'five-number', input: '1, 2, 3, 4, 5, 6, 7, 8, 9 five number summary', label: 'five-number summary of 1…9', subject: 'General' },

  // --------------------------------------------------------- Random variables
  { solverId: 'distributions', methodId: 'binomial', input: 'binomial n=10, p=0.5, x=3', label: 'Bin(10, 0.5), P(X = 3)', subject: 'Methods' },
  { solverId: 'distributions', methodId: 'normal', input: 'normal mean=100, sd=15, x=120', label: 'N(100, 15²), P(X < 120)', subject: 'Methods' },
  { solverId: 'distributions', methodId: 'confidence', input: 'confidence mean=50, sd=8, n=100', label: '95% CI, x̄ = 50, σ = 8, n = 100', subject: 'Methods' },

  // -------------------------------------------------------------------- Matrices
  { solverId: 'matrices', input: '[[1,2],[3,4]] * [[5,6],[7,8]]', label: '[[1,2],[3,4]] × [[5,6],[7,8]]', subject: 'Specialist' },
  { solverId: 'matrices', input: 'det [[1,2],[3,4]]', label: 'det [[1,2],[3,4]]', subject: 'Specialist' },
  { solverId: 'matrices', input: 'inverse [[1,2],[3,4]]', label: 'inverse [[1,2],[3,4]]', subject: 'Specialist' },

  // --------------------------------------------------------------------- Vectors
  { solverId: 'vectors', input: '(3,4) + (1,2)', label: '(3, 4) + (1, 2)', subject: 'Specialist' },
  { solverId: 'vectors', input: '(1,2,3) . (4,5,6)', label: '(1,2,3) · (4,5,6)', subject: 'Specialist' },
  { solverId: 'vectors', input: '|(3,4)|', label: '|(3, 4)|', subject: 'Specialist' },
  { solverId: 'vectors', input: '(1,0,0) x (0,1,0)', label: '(1,0,0) × (0,1,0)', subject: 'Specialist' },

  // ------------------------------------------------------------ Complex numbers
  { solverId: 'complex', methodId: 'rectangular', input: '(3+4i)*(1-2i)', label: '(3 + 4i)(1 − 2i)', subject: 'Specialist' },
  { solverId: 'complex', methodId: 'rectangular', input: '(3+4i)/(1-2i)', label: '(3 + 4i) ÷ (1 − 2i)', subject: 'Specialist' },
  { solverId: 'complex', methodId: 'polar', input: 'polar 3+4i', label: '3 + 4i  in polar form', subject: 'Specialist' },

  // ------------------------------------------------------------------ Induction
  { solverId: 'induction', input: 'sum r', label: '1 + 2 + … + n', subject: 'Specialist' },
  { solverId: 'induction', input: 'sum r^2', label: '1² + 2² + … + n²', subject: 'Specialist' },
  { solverId: 'induction', input: 'sum 2r-1', label: '1 + 3 + 5 + … + (2n − 1)', subject: 'Specialist' },
];

export function examplesFor(solverId: string): Example[] {
  return examples.filter((e) => e.solverId === solverId);
}
