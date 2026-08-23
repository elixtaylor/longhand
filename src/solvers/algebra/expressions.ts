import type { Solver, SolveResult, Step } from '../../lib/engine/types';
import {
  evaluateExpr,
  parseExpr,
  toLatex,
  type Expr,
} from '../../lib/math/expr';
import {
  evaluateExpression,
  expandExpression,
  simplifyExpression,
  type ExpressionTransform,
} from '../../lib/math/expression-transform';
import { fmt } from '../../lib/math/num';

type ExpressionMethod = 'expand' | 'simplify' | 'both';

const METHOD_NAMES: Record<ExpressionMethod, string> = {
  expand: 'Expand',
  simplify: 'Simplify',
  both: 'Expand + simplify',
};

function expressionText(input: string): string {
  return input
    .trim()
    .replace(
      /^(?:(?:fully\s+)?expand\s+and\s+(?:fully\s+)?simplify|(?:fully\s+)?simplify\s+and\s+(?:fully\s+)?expand|(?:fully\s+)?expand|(?:fully\s+)?simplify|evaluate)\s+(?:the\s+)?(?:expression\s+)?/i,
      '',
    )
    .trim();
}

function hasUnknownVariable(expression: Expr): boolean {
  switch (expression.t) {
    case 'num':
      return false;
    case 'var':
      return expression.name !== 'e' && expression.name !== 'π';
    case 'neg':
    case 'fn':
      return hasUnknownVariable(expression.a);
    default:
      return (
        hasUnknownVariable(expression.a) || hasUnknownVariable(expression.b)
      );
  }
}

function constantDomainError(expression: Expr): string | null {
  if (expression.t === 'neg' || expression.t === 'fn') {
    const nested = constantDomainError(expression.a);
    if (nested) return nested;
  } else if (expression.t !== 'num' && expression.t !== 'var') {
    const left = constantDomainError(expression.a);
    if (left) return left;
    const right = constantDomainError(expression.b);
    if (right) return right;
  }

  if (hasUnknownVariable(expression)) return null;
  if (expression.t === 'pow') {
    const base = evaluateExpr(expression.a);
    const exponent = evaluateExpr(expression.b);
    if (base === 0 && exponent === 0) {
      return '$0^0$ is indeterminate, so the expression has no defined value.';
    }
  }
  const value = evaluateExpr(expression);
  return Number.isFinite(value)
    ? null
    : 'That expression is not defined over the real numbers.';
}

function appendTransform(steps: Step[], transform: ExpressionTransform): void {
  for (const stage of transform.steps) {
    steps.push({
      note: stage.note,
      latex: `= ${toLatex(stage.expression)}`,
    });
  }
}

function solveExpression(input: string, methodId: string): SolveResult {
  const method: ExpressionMethod =
    methodId === 'expand' || methodId === 'simplify' || methodId === 'both'
      ? methodId
      : 'both';
  const text = expressionText(input);
  let original: Expr;
  try {
    original = parseExpr(text);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not read that expression.',
    };
  }
  const domainError = constantDomainError(original);
  if (domainError) return { ok: false, error: domainError };

  const steps: Step[] = [
    {
      note: 'Write the complete expression before changing it.',
      latex: toLatex(original),
    },
  ];
  let current = original;
  let changed = false;

  try {
    if (method === 'expand' || method === 'both') {
      const expanded = expandExpression(current);
      appendTransform(steps, expanded);
      changed ||= expanded.steps.length > 0;
      current = expanded.expression;
    }
    if (method === 'simplify' || method === 'both') {
      const simplified = simplifyExpression(current);
      appendTransform(steps, simplified);
      changed ||= simplified.steps.length > 0;
      current = simplified.expression;
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not transform that expression safely.',
    };
  }

  const exactLatex = toLatex(current);
  if (!changed) {
    steps.push({
      note:
        method === 'expand'
          ? 'There are no brackets or powers that need expanding.'
          : method === 'simplify'
            ? 'No exact algebraic rule shortens this form without expanding it.'
            : 'The expression is already expanded and simplified.',
      latex: `= ${exactLatex}`,
    });
  }

  const symbolic = hasUnknownVariable(current);
  const value = evaluateExpr(current);
  if (!symbolic && !Number.isFinite(value)) {
    return {
      ok: false,
      error: 'That expression is not defined over the real numbers.',
    };
  }

  let answerLatex = exactLatex;
  if (!symbolic && Number.isFinite(value)) {
    const evaluation = evaluateExpression(current);
    for (const stage of evaluation.steps) {
      steps.push({
        note: stage.note,
        latex: `\\approx ${toLatex(stage.expression)}`,
      });
    }
    const evaluated =
      evaluation.expression.t === 'num' ? evaluation.expression.v : value;
    const decimal = fmt(evaluated, 10);
    const exactIsDecimal = current.t === 'num' && toLatex(current) === decimal;
    if (!exactIsDecimal) {
      const finalStep = steps[steps.length - 1];
      if (finalStep) finalStep.annotation = 'final answer';
      answerLatex = `${exactLatex} \\approx ${decimal}`;
    } else {
      answerLatex = decimal;
    }
  }

  return {
    ok: true,
    solution: {
      headline: `${METHOD_NAMES[method]} $${toLatex(original)}$`,
      methodName: METHOD_NAMES[method],
      steps,
      answerLatex,
    },
  };
}

export const expressionsSolver: Solver = {
  id: 'expressions',
  title: 'Expressions',
  subjects: ['General', 'Methods', 'Specialist'],
  blurb: 'Expand, simplify, or do both with every algebraic move shown.',
  placeholder: 'e.g.  e^(1/2)(5 - 4e^(4/3))',
  methods: [
    {
      id: 'expand',
      name: 'Expand',
      blurb: 'Distribute brackets and write powers as products.',
    },
    {
      id: 'simplify',
      name: 'Simplify',
      blurb: 'Use exact arithmetic, index laws and collect like terms.',
    },
    {
      id: 'both',
      name: 'Expand + simplify',
      blurb: 'Expand first, then simplify the resulting terms completely.',
    },
  ],
  defaultMethodId: 'both',
  detect(input) {
    if (input.includes('=')) return 0;
    const text = expressionText(input);
    if (
      text === '' ||
      !/[\dπ()+\-*/^×÷√]|\b(?:sin|cos|tan|ln|log|sqrt|abs|exp)\b/i.test(text)
    ) {
      return 0;
    }
    try {
      parseExpr(text);
      return /\b(?:expand|simplify)\b/i.test(input) ? 0.86 : 0.4;
    } catch {
      return 0;
    }
  },
  solve: solveExpression,
};
