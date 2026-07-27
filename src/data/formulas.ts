/**
 * The formulas behind each topic, shown as a reference alongside the working.
 * Keyed by solver id so a topic and its formulas can never drift apart.
 */
export interface Formula {
  name: string;
  latex: string;
}

export const FORMULAS: Record<string, Formula[]> = {
  linear: [
    { name: 'Solving by balancing', latex: 'ax + b = c \\;\\Rightarrow\\; x = \\dfrac{c-b}{a}' },
  ],
  simultaneous: [
    { name: 'Elimination', latex: '\\text{scale so a variable matches, then add or subtract}' },
    { name: 'Substitution', latex: '\\text{make } y \\text{ the subject of one equation, then substitute into the other}' },
  ],
  collect: [
    { name: 'Like terms', latex: 'ax + bx = (a+b)x' },
    { name: 'Expand a bracket', latex: 'a(x+b) = ax + ab' },
  ],
  absolute: [
    { name: 'Absolute value equation', latex: '|x| = a \\;(a \\ge 0) \\;\\Rightarrow\\; x = a \\text{ or } x = -a' },
    { name: 'Equal magnitudes', latex: '|A| = |B| \\;\\Rightarrow\\; A = B \\text{ or } A = -B' },
  ],
  inverse: [
    { name: 'Undoing an equation', latex: '\\text{apply the inverse of each operation, working from the outside in}' },
    { name: 'Inverse operations', latex: '+ \\leftrightarrow -, \\quad \\times \\leftrightarrow \\div, \\quad x^{2} \\leftrightarrow \\sqrt{x}, \\quad e^{x} \\leftrightarrow \\ln x' },
  ],
  reduce: [
    { name: 'Removing a repeated function', latex: '\\sqrt{a} = \\sqrt{b} \\;\\Rightarrow\\; a = b, \\quad \\log a + \\log b = \\log(ab)' },
  ],
  quadratics: [
    { name: 'Quadratic formula', latex: 'x = \\dfrac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}' },
    { name: 'Discriminant', latex: '\\Delta = b^{2} - 4ac' },
    { name: 'Turning point', latex: 'x = -\\dfrac{b}{2a}' },
    { name: 'Sum & product of roots', latex: '\\alpha + \\beta = -\\dfrac{b}{a}, \\quad \\alpha\\beta = \\dfrac{c}{a}' },
  ],
  polynomials: [
    { name: 'Remainder theorem', latex: 'P(x) \\div (x - a) \\text{ leaves } P(a)' },
    { name: 'Factor theorem', latex: 'P(a) = 0 \\iff (x - a) \\text{ is a factor}' },
  ],
  indices: [
    { name: 'Multiplying', latex: 'a^{m} \\times a^{n} = a^{m+n}' },
    { name: 'Dividing', latex: '\\dfrac{a^{m}}{a^{n}} = a^{m-n}' },
    { name: 'Power of a power', latex: '\\left(a^{m}\\right)^{n} = a^{mn}' },
    { name: 'Negative index', latex: 'a^{-n} = \\dfrac{1}{a^{n}}' },
    { name: 'Fractional index', latex: 'a^{\\frac{m}{n}} = \\sqrt[n]{a^{m}}' },
  ],
  logarithms: [
    { name: 'Definition', latex: '\\log_{a} b = c \\iff a^{c} = b' },
    { name: 'Product', latex: '\\log a + \\log b = \\log(ab)' },
    { name: 'Quotient', latex: '\\log a - \\log b = \\log\\!\\left(\\dfrac{a}{b}\\right)' },
    { name: 'Power', latex: '\\log a^{n} = n\\log a' },
    { name: 'Change of base', latex: '\\log_{a} b = \\dfrac{\\log b}{\\log a}' },
  ],
  financial: [
    { name: 'Simple interest', latex: 'I = Prt' },
    { name: 'Compound interest', latex: 'A = P\\left(1 + \\dfrac{r}{n}\\right)^{nt}' },
    { name: 'Depreciation', latex: 'A = P(1 - r)^{t}' },
    { name: 'Loan repayment', latex: 'R = \\dfrac{P\\,i}{1 - (1+i)^{-N}}' },
  ],
  sequences: [
    { name: 'Arithmetic term', latex: 't_{n} = a + (n-1)d' },
    { name: 'Arithmetic sum', latex: 'S_{n} = \\dfrac{n}{2}\\left(2a + (n-1)d\\right)' },
    { name: 'Geometric term', latex: 't_{n} = ar^{\\,n-1}' },
    { name: 'Geometric sum', latex: 'S_{n} = \\dfrac{a(1 - r^{n})}{1 - r}' },
    { name: 'Limiting sum', latex: 'S_{\\infty} = \\dfrac{a}{1 - r}, \\quad |r| < 1' },
  ],
  measurement: [
    { name: 'Circle', latex: 'A = \\pi r^{2}, \\quad C = 2\\pi r' },
    { name: 'Cylinder', latex: 'V = \\pi r^{2}h, \\quad SA = 2\\pi r^{2} + 2\\pi rh' },
    { name: 'Sphere', latex: 'V = \\tfrac{4}{3}\\pi r^{3}, \\quad SA = 4\\pi r^{2}' },
    { name: 'Cone', latex: 'V = \\tfrac{1}{3}\\pi r^{2}h, \\quad SA = \\pi r^{2} + \\pi r l' },
    { name: 'Trapezium', latex: 'A = \\tfrac{1}{2}(a + b)h' },
  ],
  'right-triangle': [
    { name: 'Pythagoras', latex: 'a^{2} + b^{2} = c^{2}' },
    { name: 'SOH CAH TOA', latex: '\\sin\\theta = \\dfrac{O}{H}, \\quad \\cos\\theta = \\dfrac{A}{H}, \\quad \\tan\\theta = \\dfrac{O}{A}' },
  ],
  'triangle-rules': [
    { name: 'Sine rule', latex: '\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}' },
    { name: 'Cosine rule', latex: 'c^{2} = a^{2} + b^{2} - 2ab\\cos C' },
    { name: 'Area (SAS)', latex: 'A = \\tfrac{1}{2}ab\\sin C' },
    { name: 'Heron’s formula', latex: 'A = \\sqrt{s(s-a)(s-b)(s-c)}' },
  ],
  'trig-equations': [
    { name: 'Pythagorean identity', latex: '\\sin^{2}\\theta + \\cos^{2}\\theta = 1' },
    { name: 'Tangent', latex: '\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}' },
    { name: 'Sine symmetry', latex: '\\sin(180^{\\circ} - \\theta) = \\sin\\theta' },
    { name: 'Cosine symmetry', latex: '\\cos(360^{\\circ} - \\theta) = \\cos\\theta' },
  ],
  differentiate: [
    { name: 'Power rule', latex: '\\dfrac{d}{dx}\\left(ax^{n}\\right) = nax^{\\,n-1}' },
    { name: 'Product rule', latex: '(uv)\' = u\'v + uv\'' },
    { name: 'Quotient rule', latex: '\\left(\\dfrac{u}{v}\\right)\' = \\dfrac{u\'v - uv\'}{v^{2}}' },
    { name: 'Chain rule', latex: '\\dfrac{dy}{dx} = \\dfrac{dy}{du} \\times \\dfrac{du}{dx}' },
    { name: 'First principles', latex: 'f\'(x) = \\lim_{h \\to 0}\\dfrac{f(x+h) - f(x)}{h}' },
  ],
  integrate: [
    { name: 'Reverse power rule', latex: '\\int ax^{n}\\,dx = \\dfrac{a}{n+1}x^{\\,n+1} + C' },
    { name: 'Definite integral', latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)' },
    { name: 'Exponential', latex: '\\int e^{kx}\\,dx = \\dfrac{1}{k}e^{kx} + C' },
    { name: 'Reciprocal', latex: '\\int \\dfrac{1}{x}\\,dx = \\ln|x| + C' },
  ],
  'calculus-applications': [
    { name: 'Stationary points', latex: "f'(x) = 0" },
    { name: 'Nature of a stationary point', latex: "f''(x) > 0 \\Rightarrow \\text{min}, \\quad f''(x) < 0 \\Rightarrow \\text{max}" },
    { name: 'Power rule', latex: '\\dfrac{d}{dx}\\left(ax^{n}\\right) = nax^{\\,n-1}' },
  ],
  rates: [
    { name: 'Exponential model', latex: '\\dfrac{dy}{dt} = ky \\;\\Rightarrow\\; y = y_{0}e^{kt}' },
    { name: 'Half-life', latex: 'k = \\dfrac{-\\ln 2}{t_{1/2}}' },
    { name: 'Doubling time', latex: 'k = \\dfrac{\\ln 2}{t_{d}}' },
  ],
  statistics: [
    { name: 'Mean', latex: '\\bar{x} = \\dfrac{\\sum x}{n}' },
    { name: 'Sample standard deviation', latex: 's = \\sqrt{\\dfrac{\\sum (x - \\bar{x})^{2}}{n - 1}}' },
    { name: 'Interquartile range', latex: '\\text{IQR} = Q_{3} - Q_{1}' },
  ],
  probability: [
    { name: 'Single event', latex: 'P(E) = \\dfrac{\\text{favourable}}{\\text{total}}' },
    { name: 'Complement', latex: 'P(E\') = 1 - P(E)' },
    { name: 'Addition rule', latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)' },
    { name: 'Conditional', latex: 'P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}' },
    { name: 'Independence', latex: 'P(A \\cap B) = P(A)P(B)' },
  ],
  counting: [
    { name: 'Permutation', latex: '^{n}P_{r} = \\dfrac{n!}{(n-r)!}' },
    { name: 'Combination', latex: '^{n}C_{r} = \\dfrac{n!}{r!\\,(n-r)!}' },
    { name: 'Symmetry', latex: '\\dbinom{n}{r} = \\dbinom{n}{n-r}' },
  ],
  distributions: [
    { name: 'Binomial', latex: 'P(X = x) = \\dbinom{n}{x}p^{x}(1-p)^{\\,n-x}' },
    { name: 'Binomial mean & variance', latex: '\\mu = np, \\quad \\sigma^{2} = np(1-p)' },
    { name: 'Standardising', latex: 'z = \\dfrac{x - \\mu}{\\sigma}' },
    { name: 'Confidence interval', latex: '\\bar{x} \\pm z^{*}\\dfrac{\\sigma}{\\sqrt{n}}' },
  ],
  complex: [
    { name: 'Imaginary unit', latex: 'i^{2} = -1' },
    { name: 'Modulus', latex: '|a + bi| = \\sqrt{a^{2} + b^{2}}' },
    { name: 'Conjugate', latex: '\\overline{a + bi} = a - bi' },
    { name: 'Polar form', latex: 'z = r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}' },
    { name: 'De Moivre', latex: 'z^{n} = r^{n}\\left(\\cos n\\theta + i\\sin n\\theta\\right)' },
  ],
  vectors: [
    { name: 'Magnitude', latex: '|\\mathbf{a}| = \\sqrt{a_{1}^{2} + a_{2}^{2} + a_{3}^{2}}' },
    { name: 'Dot product', latex: '\\mathbf{a} \\cdot \\mathbf{b} = a_{1}b_{1} + a_{2}b_{2} + a_{3}b_{3}' },
    { name: 'Angle between', latex: '\\cos\\theta = \\dfrac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|}' },
    { name: 'Perpendicular', latex: '\\mathbf{a} \\cdot \\mathbf{b} = 0' },
  ],
  matrices: [
    { name: '2×2 determinant', latex: '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc' },
    { name: '2×2 inverse', latex: 'A^{-1} = \\dfrac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}' },
    { name: 'Singular', latex: '\\det A = 0 \\Rightarrow A^{-1} \\text{ does not exist}' },
  ],
  induction: [
    { name: 'The three steps', latex: '\\text{base case} \\;\\to\\; \\text{assume } P(k) \\;\\to\\; \\text{show } P(k+1)' },
    { name: 'Sum of integers', latex: '\\sum_{r=1}^{n} r = \\dfrac{n(n+1)}{2}' },
    { name: 'Sum of squares', latex: '\\sum_{r=1}^{n} r^{2} = \\dfrac{n(n+1)(2n+1)}{6}' },
    { name: 'Sum of cubes', latex: '\\sum_{r=1}^{n} r^{3} = \\left(\\dfrac{n(n+1)}{2}\\right)^{2}' },
  ],
  functions: [
    { name: 'Turning points', latex: "f'(x) = 0" },
    { name: 'Nature of a stationary point', latex: "f''(x) > 0 \\Rightarrow \\text{min}, \\quad f''(x) < 0 \\Rightarrow \\text{max}" },
    { name: 'Axis of symmetry (parabola)', latex: 'x = -\\dfrac{b}{2a}' },
  ],
  percentages: [
    { name: 'Percentage of', latex: '\\dfrac{p}{100} \\times A' },
    { name: 'Percentage change', latex: '\\dfrac{\\text{new} - \\text{old}}{\\text{old}} \\times 100\\%' },
    { name: 'Reverse percentage', latex: '\\text{original} = \\dfrac{\\text{new}}{1 \\pm \\frac{p}{100}}' },
  ],
  fractions: [
    { name: 'Add or subtract', latex: '\\dfrac{a}{b} \\pm \\dfrac{c}{d} = \\dfrac{ad \\pm bc}{bd}' },
    { name: 'Multiply', latex: '\\dfrac{a}{b} \\times \\dfrac{c}{d} = \\dfrac{ac}{bd}' },
    { name: 'Divide', latex: '\\dfrac{a}{b} \\div \\dfrac{c}{d} = \\dfrac{a}{b} \\times \\dfrac{d}{c}' },
  ],
  inequalities: [
    { name: 'Sign flip', latex: 'a < b \\;\\Rightarrow\\; -a > -b' },
    { name: 'Quadratic', latex: '\\text{sketch, then read off where the curve is above/below the axis}' },
  ],
  networks: [
    { name: 'Spanning tree size', latex: '\\text{edges} = \\text{nodes} - 1' },
    { name: 'Degree sum', latex: '\\sum \\deg(v) = 2 \\times \\text{edges}' },
  ],
};

export function formulasFor(solverId: string): Formula[] {
  return FORMULAS[solverId] ?? [];
}
