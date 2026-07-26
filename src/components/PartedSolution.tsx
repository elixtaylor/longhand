import type { Worked, WorkedPart } from '../lib/engine/run';
import type { RevealMode } from '../lib/ui';
import { StepList } from './StepList';
import { TeX, RichText } from './TeX';

/**
 * A question worked across the topics it actually spans.
 *
 * Each part keeps its own topic, method and working, so a student can see
 * where algebra stopped and calculus began — and copy just the part they were
 * set. When a part had to borrow an earlier answer, it says so, because that
 * is the step a marker would want written down.
 */
export function PartedSolution({
  worked,
  revealMode,
  onFocusPart,
}: {
  worked: Worked;
  revealMode: RevealMode;
  onFocusPart?: (part: WorkedPart) => void;
}) {
  return (
    <div className="parts">
      <div className="parts-head">
        <span className="parts-count">{worked.parts.length} parts</span>
        <span className="parts-note">
          This question spans {new Set(worked.parts.map((p) => p.solver.id)).size} topics — each is
          worked separately below.
        </span>
      </div>

      {worked.parts.map((part) => (
        <section key={part.label} className="part">
          <header className="part-head">
            <span className="part-label" aria-hidden="true">
              ({part.label})
            </span>
            <div className="part-titles">
              <div className="part-title">
                {part.result.ok ? (
                  <RichText text={part.result.solution.headline} />
                ) : (
                  <span className="part-failed">Couldn’t work this part</span>
                )}
              </div>
              <div className="part-sub">
                <span className="part-topic">{part.solver.title}</span>
                {part.result.ok && <> · {part.result.solution.methodName}</>}
              </div>
              {part.carried && (
                // Show the substitution itself rather than describing it: the
                // student needs to be able to check that "it" was resolved to
                // the thing they meant.
                <p className="part-carried">
                  You wrote <em>“{part.carried.trim()}”</em> — read as{' '}
                  <em>“{part.text.trim()}”</em>, using part ({prevLabel(part.label)}).
                </p>
              )}
            </div>
            {part.result.ok && part.result.solution.answerLatex && (
              <div className="answer-card answer-card-sm">
                <span className="answer-label">Answer</span>
                <span className="answer-value">
                  <TeX tex={part.result.solution.answerLatex} />
                </span>
              </div>
            )}
          </header>

          {part.result.ok ? (
            <StepList solution={part.result.solution} revealMode={revealMode} />
          ) : (
            <p className="part-error">{part.result.error}</p>
          )}

          {onFocusPart && part.result.ok && (
            <button type="button" className="btn btn-sm" onClick={() => onFocusPart(part)}>
              Work part ({part.label}) on its own
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

function prevLabel(label: string): string {
  return String.fromCharCode(label.charCodeAt(0) - 1);
}
