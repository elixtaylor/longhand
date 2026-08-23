import { MAX_AST_NODES, MAX_EXPONENT } from '../safety';
import { Rational } from './rational';
import { evaluateExpr, toLatex, type Expr } from './expr';
import { round } from './num';
import { simplifySqrt } from './surd';

export interface ExpressionTransformStep {
  expression: Expr;
  note: string;
}

export interface ExpressionTransform {
  expression: Expr;
  steps: ExpressionTransformStep[];
}

export class ExpressionTransformError extends Error {}

interface OneTransform {
  expression: Expr;
  note: string;
}

const MAX_TRANSFORM_STEPS = 128;

function same(a: Expr, b: Expr): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function nodes(expression: Expr): number {
  switch (expression.t) {
    case 'num':
    case 'var':
      return 1;
    case 'neg':
    case 'fn':
      return 1 + nodes(expression.a);
    default:
      return 1 + nodes(expression.a) + nodes(expression.b);
  }
}

function checked(expression: Expr): Expr {
  if (nodes(expression) > MAX_AST_NODES) {
    throw new ExpressionTransformError(
      'Fully expanding that expression would create too many terms to show safely.',
    );
  }
  return expression;
}

function exactRational(expression: Expr): Rational | null {
  try {
    switch (expression.t) {
      case 'num':
        return Number.isFinite(expression.v)
          ? Rational.fromDecimal(expression.v)
          : null;
      case 'neg': {
        const value = exactRational(expression.a);
        return value?.neg() ?? null;
      }
      case 'add':
      case 'sub':
      case 'mul':
      case 'div': {
        const left = exactRational(expression.a);
        const right = exactRational(expression.b);
        if (!left || !right) return null;
        if (expression.t === 'add') return left.add(right);
        if (expression.t === 'sub') return left.sub(right);
        if (expression.t === 'mul') return left.mul(right);
        return right.isZero() ? null : left.div(right);
      }
      case 'pow': {
        const base = exactRational(expression.a);
        const exponent = exactRational(expression.b);
        if (
          !base ||
          !exponent?.isInt() ||
          Math.abs(exponent.n) > MAX_EXPONENT ||
          (base.isZero() && exponent.n <= 0)
        ) {
          return null;
        }
        return base.pow(exponent.n);
      }
      case 'var':
      case 'fn':
        return null;
    }
  } catch {
    return null;
  }
}

function rationalExpression(value: Rational): Expr {
  if (value.isInt()) return { t: 'num', v: value.n };
  const numerator: Expr = { t: 'num', v: value.n };
  const denominator: Expr = { t: 'num', v: value.d };
  return { t: 'div', a: numerator, b: denominator };
}

function multiply(factors: Expr[]): Expr {
  if (factors.length === 0) return { t: 'num', v: 1 };
  return factors
    .slice(1)
    .reduce<Expr>(
      (left, right) => ({ t: 'mul', a: left, b: right }),
      factors[0],
    );
}

function productParts(expression: Expr): {
  coefficient: Rational;
  factors: Expr[];
} {
  let coefficient = Rational.int(1);
  const factors: Expr[] = [];

  function visit(node: Expr): void {
    if (node.t === 'mul') {
      visit(node.a);
      visit(node.b);
      return;
    }
    if (node.t === 'neg') {
      coefficient = coefficient.neg();
      visit(node.a);
      return;
    }
    const rational = exactRational(node);
    if (rational) coefficient = coefficient.mul(rational);
    else factors.push(node);
  }

  visit(expression);
  return { coefficient, factors };
}

function buildProduct(coefficient: Rational, factors: Expr[]): Expr {
  if (coefficient.isZero()) return { t: 'num', v: 0 };
  const magnitude = coefficient.abs();
  const body = multiply(factors);
  let result: Expr;
  if (factors.length === 0) result = rationalExpression(magnitude);
  else if (magnitude.eq(Rational.int(1))) result = body;
  else result = { t: 'mul', a: rationalExpression(magnitude), b: body };
  return coefficient.isNeg() ? { t: 'neg', a: result } : result;
}

function normaliseProduct(
  expression: Expr,
  combineExponentials: boolean,
): {
  expression: Expr;
  combinedExponentials: boolean;
  combinedPowers: boolean;
} {
  const { coefficient, factors: originalFactors } = productParts(expression);
  let factors = originalFactors;
  let combinedExponentials = false;
  let combinedPowers = false;

  if (combineExponentials) {
    const exponentials = factors.filter(
      (factor): factor is Extract<Expr, { t: 'fn' }> =>
        factor.t === 'fn' && factor.name === 'exp',
    );
    if (exponentials.length > 1) {
      const exponent = exponentials
        .slice(1)
        .reduce<Expr>(
          (left, right) => ({ t: 'add', a: left, b: right.a }),
          exponentials[0].a,
        );
      factors = factors.filter(
        (factor) => !(factor.t === 'fn' && factor.name === 'exp'),
      );
      factors.push({ t: 'fn', name: 'exp', a: exponent });
      combinedExponentials = true;
    }

    const grouped = new Map<
      string,
      { base: Expr; exponent: Rational; occurrences: number }
    >();
    for (const [index, factor] of factors.entries()) {
      const candidateExponent =
        factor.t === 'pow' ? exactRational(factor.b) : Rational.int(1);
      const combinableExponent =
        candidateExponent?.isInt() && candidateExponent.n > 0
          ? candidateExponent
          : null;
      const base = factor.t === 'pow' && combinableExponent ? factor.a : factor;
      const effectiveExponent =
        factor.t === 'pow' && combinableExponent
          ? combinableExponent
          : Rational.int(1);
      const key =
        factor.t === 'pow' && !combinableExponent
          ? `uncombined:${index}:${JSON.stringify(factor)}`
          : JSON.stringify(base);
      const current = grouped.get(key);
      grouped.set(key, {
        base,
        exponent: current
          ? current.exponent.add(effectiveExponent)
          : effectiveExponent,
        occurrences: (current?.occurrences ?? 0) + 1,
      });
    }
    if ([...grouped.values()].some((group) => group.occurrences > 1)) {
      factors = [...grouped.values()].flatMap((group) => {
        if (group.exponent.isZero()) return [];
        if (group.exponent.eq(Rational.int(1))) return [group.base];
        return [
          {
            t: 'pow' as const,
            a: group.base,
            b: rationalExpression(group.exponent),
          },
        ];
      });
      combinedPowers = true;
    }
  }

  return {
    expression: buildProduct(coefficient, factors),
    combinedExponentials,
    combinedPowers,
  };
}

function tidyProducts(expression: Expr): Expr {
  switch (expression.t) {
    case 'num':
    case 'var':
      return expression;
    case 'neg':
      return { ...expression, a: tidyProducts(expression.a) };
    case 'fn':
      return { ...expression, a: tidyProducts(expression.a) };
    case 'mul': {
      const rebuilt: Expr = {
        t: 'mul',
        a: tidyProducts(expression.a),
        b: tidyProducts(expression.b),
      };
      return normaliseProduct(rebuilt, false).expression;
    }
    default:
      return {
        ...expression,
        a: tidyProducts(expression.a),
        b: tidyProducts(expression.b),
      };
  }
}

function integerExponent(expression: Expr): number | null {
  const exponent = exactRational(expression);
  return exponent?.isInt() && exponent.n >= 0 && exponent.n <= MAX_EXPONENT
    ? exponent.n
    : null;
}

function expandOnce(expression: Expr): OneTransform | null {
  if (expression.t === 'mul') {
    const { a, b } = expression;
    if (a.t === 'add' || a.t === 'sub') {
      return {
        expression: checked(
          tidyProducts({
            t: a.t,
            a: { t: 'mul', a: a.a, b },
            b: { t: 'mul', a: a.b, b },
          }),
        ),
        note: 'Distribute the factor across both terms in the bracket.',
      };
    }
    if (b.t === 'add' || b.t === 'sub') {
      return {
        expression: checked(
          tidyProducts({
            t: b.t,
            a: { t: 'mul', a, b: b.a },
            b: { t: 'mul', a, b: b.b },
          }),
        ),
        note: 'Distribute the factor across both terms in the bracket.',
      };
    }
  }

  if (expression.t === 'neg' && expression.a.t === 'add') {
    return {
      expression: {
        t: 'sub',
        a: { t: 'neg', a: expression.a.a },
        b: expression.a.b,
      },
      note: 'Distribute the negative sign through the bracket.',
    };
  }
  if (expression.t === 'neg' && expression.a.t === 'sub') {
    return {
      expression: {
        t: 'add',
        a: { t: 'neg', a: expression.a.a },
        b: expression.a.b,
      },
      note: 'Distribute the negative sign through the bracket.',
    };
  }

  if (expression.t === 'pow') {
    const exponent = integerExponent(expression.b);
    if (
      exponent !== null &&
      exponent > 1 &&
      (expression.a.t === 'add' || expression.a.t === 'sub')
    ) {
      return {
        expression: checked({
          t: 'mul',
          a: expression.a,
          b:
            exponent === 2
              ? expression.a
              : {
                  t: 'pow',
                  a: expression.a,
                  b: { t: 'num', v: exponent - 1 },
                },
        }),
        note: 'Write the bracketed power as repeated multiplication.',
      };
    }
  }

  if (expression.t === 'div' && expression.a.t === 'add') {
    return {
      expression: checked({
        t: 'add',
        a: { t: 'div', a: expression.a.a, b: expression.b },
        b: { t: 'div', a: expression.a.b, b: expression.b },
      }),
      note: 'Divide each term in the numerator by the denominator.',
    };
  }
  if (expression.t === 'div' && expression.a.t === 'sub') {
    return {
      expression: checked({
        t: 'sub',
        a: { t: 'div', a: expression.a.a, b: expression.b },
        b: { t: 'div', a: expression.a.b, b: expression.b },
      }),
      note: 'Divide each term in the numerator by the denominator.',
    };
  }

  if (expression.t === 'neg' || expression.t === 'fn') {
    const inner = expandOnce(expression.a);
    return inner
      ? { ...inner, expression: { ...expression, a: inner.expression } }
      : null;
  }
  if (
    expression.t === 'add' ||
    expression.t === 'sub' ||
    expression.t === 'mul' ||
    expression.t === 'div' ||
    expression.t === 'pow'
  ) {
    const left = expandOnce(expression.a);
    if (left) {
      return {
        ...left,
        expression: { ...expression, a: left.expression },
      };
    }
    const right = expandOnce(expression.b);
    if (right) {
      return {
        ...right,
        expression: { ...expression, b: right.expression },
      };
    }
  }
  return null;
}

interface LikeTerm {
  coefficient: Rational;
  factors: Expr[];
}

function combineLikeTerms(expression: Expr): Expr {
  const terms: Array<{ sign: number; expression: Expr }> = [];
  function collect(node: Expr, sign: number): void {
    if (node.t === 'add') {
      collect(node.a, sign);
      collect(node.b, sign);
    } else if (node.t === 'sub') {
      collect(node.a, sign);
      collect(node.b, -sign);
    } else if (node.t === 'neg') collect(node.a, -sign);
    else terms.push({ sign, expression: node });
  }
  collect(expression, 1);

  const grouped = new Map<string, LikeTerm>();
  for (const term of terms) {
    const parts = productParts(term.expression);
    const coefficient =
      term.sign < 0 ? parts.coefficient.neg() : parts.coefficient;
    const factors = [...parts.factors].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
    const key = factors.map((factor) => JSON.stringify(factor)).join('|');
    const current = grouped.get(key);
    grouped.set(key, {
      coefficient: current ? current.coefficient.add(coefficient) : coefficient,
      factors,
    });
  }

  const active = [...grouped.values()].filter(
    (term) => !term.coefficient.isZero(),
  );
  if (active.length === 0) return { t: 'num', v: 0 };

  let result: Expr | null = null;
  for (const term of active) {
    const negative = term.coefficient.isNeg();
    const body = buildProduct(term.coefficient.abs(), term.factors);
    if (!result) result = negative ? { t: 'neg', a: body } : body;
    else
      result = negative
        ? { t: 'sub', a: result, b: body }
        : { t: 'add', a: result, b: body };
  }
  return result!;
}

function simplifyOnce(expression: Expr): OneTransform | null {
  if (expression.t === 'neg' || expression.t === 'fn') {
    const inner = simplifyOnce(expression.a);
    if (inner) {
      return {
        ...inner,
        expression: { ...expression, a: inner.expression },
      };
    }
  } else if (expression.t !== 'num' && expression.t !== 'var') {
    const left = simplifyOnce(expression.a);
    if (left) {
      return {
        ...left,
        expression: { ...expression, a: left.expression },
      };
    }
    const right = simplifyOnce(expression.b);
    if (right) {
      return {
        ...right,
        expression: { ...expression, b: right.expression },
      };
    }
  }

  if (expression.t !== 'num' && expression.t !== 'var') {
    const rational = exactRational(expression);
    if (rational) {
      const reduced = rationalExpression(rational);
      if (!same(expression, reduced)) {
        return {
          expression: reduced,
          note: 'Work out the exact rational arithmetic.',
        };
      }
    }
  }

  if (expression.t === 'mul') {
    const normalised = normaliseProduct(expression, true);
    if (!same(expression, normalised.expression)) {
      return {
        expression: normalised.expression,
        note: normalised.combinedExponentials
          ? 'Use the index law $e^a e^b = e^{a+b}$.'
          : normalised.combinedPowers
            ? 'Use the index laws to combine matching factors.'
            : 'Multiply the numerical factors and remove factors of 1.',
      };
    }
  }

  if (expression.t === 'add' || expression.t === 'sub') {
    const combined = combineLikeTerms(expression);
    if (!same(expression, combined)) {
      return {
        expression: combined,
        note: 'Collect the like terms.',
      };
    }
  }

  if (expression.t === 'div') {
    const denominator = exactRational(expression.b);
    if (denominator?.eq(Rational.int(1))) {
      return {
        expression: expression.a,
        note: 'Dividing by 1 leaves the expression unchanged.',
      };
    }
  }

  if (expression.t === 'pow') {
    const exponent = exactRational(expression.b);
    if (exponent?.isZero()) {
      return {
        expression: { t: 'num', v: 1 },
        note: 'A non-zero expression to the power 0 is 1.',
      };
    }
    if (exponent?.eq(Rational.int(1))) {
      return {
        expression: expression.a,
        note: 'A power of 1 leaves the base unchanged.',
      };
    }
    const innerExponent =
      expression.a.t === 'pow' ? exactRational(expression.a.b) : null;
    const squareRootArgument =
      expression.a.t === 'fn' && expression.a.name === 'sqrt'
        ? exactRational(expression.a.a)
        : null;
    if (
      expression.a.t === 'pow' &&
      innerExponent?.isInt() &&
      exponent?.isInt()
    ) {
      return {
        expression: {
          t: 'pow',
          a: expression.a.a,
          b: { t: 'mul', a: expression.a.b, b: expression.b },
        },
        note: 'Use the index law $(a^m)^n = a^{mn}$.',
      };
    }
    if (
      expression.a.t === 'fn' &&
      expression.a.name === 'sqrt' &&
      exponent?.eq(Rational.int(2)) &&
      squareRootArgument &&
      !squareRootArgument.isNeg()
    ) {
      return {
        expression: expression.a.a,
        note: 'Squaring a square root returns its radicand.',
      };
    }
  }

  if (expression.t === 'fn') {
    const argument = exactRational(expression.a);
    if (expression.name === 'exp' && argument?.isZero()) {
      return {
        expression: { t: 'num', v: 1 },
        note: 'Use $e^0 = 1$.',
      };
    }
    if (expression.name === 'ln' && argument?.eq(Rational.int(1))) {
      return {
        expression: { t: 'num', v: 0 },
        note: 'Use $\\ln(1) = 0$.',
      };
    }
    if (expression.name === 'sqrt' && argument?.isInt() && argument.n >= 0) {
      const root = simplifySqrt(argument.n);
      if (root.inside === 1) {
        return {
          expression: { t: 'num', v: root.outside },
          note: `${argument.n} is a perfect square.`,
        };
      }
      if (root.outside > 1) {
        return {
          expression: {
            t: 'mul',
            a: { t: 'num', v: root.outside },
            b: {
              t: 'fn',
              name: 'sqrt',
              a: { t: 'num', v: root.inside },
            },
          },
          note: `Take the square factor ${root.outside ** 2} out of the root.`,
        };
      }
    }
  }

  return null;
}

function trace(
  expression: Expr,
  next: (expression: Expr) => OneTransform | null,
): ExpressionTransform {
  checked(expression);
  const steps: ExpressionTransformStep[] = [];
  let current = expression;

  for (let i = 0; i < MAX_TRANSFORM_STEPS; i++) {
    const transformed = next(current);
    if (!transformed) return { expression: current, steps };
    const candidate = checked(transformed.expression);
    if (same(candidate, current)) return { expression: current, steps };
    if (toLatex(candidate) !== toLatex(current)) {
      steps.push({ expression: candidate, note: transformed.note });
    }
    current = candidate;
  }

  throw new ExpressionTransformError(
    'That expression needs too many separate transformations to display safely.',
  );
}

export function expandExpression(expression: Expr): ExpressionTransform {
  return trace(expression, expandOnce);
}

export function simplifyExpression(expression: Expr): ExpressionTransform {
  return trace(expression, simplifyOnce);
}

function evaluationNote(expression: Expr): string {
  switch (expression.t) {
    case 'add':
      return 'Add the displayed values.';
    case 'sub':
      return 'Subtract the displayed values.';
    case 'mul':
      return 'Multiply the displayed values.';
    case 'div':
      return 'Divide the displayed values.';
    case 'pow':
      return 'Evaluate the power.';
    case 'neg':
      return 'Apply the negative sign.';
    case 'fn':
      return expression.name === 'exp'
        ? 'Evaluate the exponential.'
        : `Evaluate ${expression.name}.`;
    case 'var':
      return expression.name === 'π'
        ? 'Use the decimal value of $\\pi$.'
        : 'Use the decimal value of $e$.';
    case 'num':
      return 'Evaluate this value.';
  }
}

function evaluateOnce(expression: Expr): OneTransform | null {
  if (expression.t === 'num') return null;
  if (expression.t === 'var') {
    if (expression.name !== 'e' && expression.name !== 'π') return null;
    return {
      expression: {
        t: 'num',
        v: round(expression.name === 'e' ? Math.E : Math.PI, 10),
      },
      note: evaluationNote(expression),
    };
  }

  if (expression.t === 'neg' || expression.t === 'fn') {
    const inner = evaluateOnce(expression.a);
    if (inner) {
      return {
        ...inner,
        expression: { ...expression, a: inner.expression },
      };
    }
  } else {
    const left = evaluateOnce(expression.a);
    if (left) {
      return {
        ...left,
        expression: { ...expression, a: left.expression },
      };
    }
    const right = evaluateOnce(expression.b);
    if (right) {
      return {
        ...right,
        expression: { ...expression, b: right.expression },
      };
    }
  }

  let value = NaN;
  try {
    value = evaluateExpr(expression);
  } catch {
    // Leave unsupported or undefined real expressions unevaluated.
  }

  return Number.isFinite(value)
    ? {
        expression: { t: 'num', v: round(value, 10) },
        note: evaluationNote(expression),
      }
    : null;
}

/** Numerically evaluate one visible operation at a time. */
export function evaluateExpression(expression: Expr): ExpressionTransform {
  return trace(expression, evaluateOnce);
}
