import type { SolveResult } from '../lib/engine/types';
import { TeX } from './TeX';

/** A compact answer-only result shown while a calculator is being filled. */
export function CalculatorPreview({ result }: { result: SolveResult | null }) {
  if (!result?.ok || !result.solution.answerLatex) return null;
  return (
    <output className="calculator-preview" aria-live="polite">
      <span className="calculator-preview-label">Answer</span>
      <span className="calculator-preview-value">
        <TeX tex={result.solution.answerLatex} />
      </span>
    </output>
  );
}
