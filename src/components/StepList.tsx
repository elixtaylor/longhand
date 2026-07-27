import { useEffect, useState } from 'react';
import type { Solution } from '../lib/engine/types';
import type { RevealMode } from '../lib/ui';
import { TeX, RichText } from './TeX';
import { StepVisualView } from './visuals';

export function StepList({
  solution,
  revealMode,
  showNotes,
  canCompare,
  onCompare,
  onCopyLink,
  copied,
}: {
  solution: Solution;
  revealMode: RevealMode;
  /** Whether each line's "why" is shown. Off by default; see App. */
  showNotes: boolean;
  /** Omitted by callers (e.g. one part of a multi-part question) that don't offer these. */
  canCompare?: boolean;
  onCompare?: () => void;
  onCopyLink?: () => void;
  copied?: boolean;
}) {
  const total = solution.steps.length;
  const [revealed, setRevealed] = useState(total);

  // Reset the reveal counter whenever a new solution arrives or the mode changes.
  useEffect(() => {
    setRevealed(revealMode === 'all' ? total : Math.min(1, total));
  }, [solution, revealMode, total]);

  const allShown = revealed >= total;

  async function copyWorking() {
    const lines = [stripMath(solution.headline)];
    solution.steps.forEach((s, i) => {
      // Copy what is on screen: with explanations hidden, a bare list of
      // lines is exactly what a student wants to paste into their book.
      if (s.note && showNotes) lines.push(`${i + 1}. ${stripMath(s.note)}`);
      if (s.latex) lines.push(showNotes ? `    ${s.latex}` : s.latex);
    });
    if (solution.answerLatex) lines.push(`Answer:  ${solution.answerLatex}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div>
      <ol className="steps">
        {solution.steps.map((step, i) => {
          const hidden = i >= revealed;
          return (
            <li key={i} className={`step${hidden ? ' is-hidden' : ''}`}>
              <div className="step-body">
                {step.note && showNotes && (
                  <p className="step-note">
                    <RichText text={step.note} />
                  </p>
                )}
                {step.latex && (
                  <div className="step-expr">
                    <TeX tex={step.latex} display />
                  </div>
                )}
                {step.visual && <StepVisualView visual={step.visual} />}
                {step.annotation && <span className="step-annotation">{step.annotation}</span>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="reveal-controls">
        {canCompare && onCompare && (
          <button type="button" className="btn" onClick={onCompare}>
            Compare all methods
          </button>
        )}
        {onCopyLink && (
          <button type="button" className="btn" onClick={onCopyLink}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
        )}
        {revealMode === 'step' && !allShown && (
          <button type="button" className="btn" onClick={() => setRevealed((r) => r + 1)}>
            Reveal next step
          </button>
        )}
        {revealMode === 'step' && !allShown && (
          <button type="button" className="btn" onClick={() => setRevealed(total)}>
            Show all
          </button>
        )}
        {revealMode === 'step' && allShown && total > 1 && (
          <button type="button" className="btn" onClick={() => setRevealed(1)}>
            Collapse
          </button>
        )}
        <button type="button" className="btn" onClick={copyWorking}>
          Copy working
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print
        </button>
        <span className="reveal-count">
          {Math.min(revealed, total)} / {total} steps
        </span>
      </div>
    </div>
  );
}

/** Rough text version of an inline-math string for the clipboard. */
function stripMath(text: string): string {
  return text.replace(/\$/g, '');
}
