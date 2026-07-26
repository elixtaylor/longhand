import { useMemo } from 'react';
import type { Solver } from '../lib/engine/types';
import { runSolve } from '../lib/engine/run';
import { TeX, RichText } from './TeX';

/**
 * Every method for the same problem, side by side.
 *
 * This is the point of the whole app: a student taught to complete the square
 * can see it lands on exactly the same answer as the formula, and compare how
 * much work each route takes.
 */
export function CompareMethods({ solver, input }: { solver: Solver; input: string }) {
  const runs = useMemo(
    () =>
      solver.methods.map((m) => ({
        method: m,
        result: runSolve(solver, input, m.id),
      })),
    [solver, input],
  );

  const answers = runs
    .filter((r) => r.result.ok && r.result.solution.answerLatex)
    .map((r) => (r.result.ok ? r.result.solution.answerLatex! : ''));
  const allAgree = answers.length > 1 && answers.every((a) => a === answers[0]);

  return (
    <div className="compare">
      {allAgree && (
        <p className="compare-verdict">
          <span className="compare-tick" aria-hidden="true">
            ✓
          </span>
          All {answers.length} methods give the same answer — <TeX tex={answers[0]} />
        </p>
      )}

      <div className="compare-grid">
        {runs.map(({ method, result }) => (
          <section key={method.id} className="compare-col">
            <header className="compare-head">
              <h3>{method.name}</h3>
              {result.ok && (
                <span className="compare-count">{result.solution.steps.length} steps</span>
              )}
            </header>

            {!result.ok ? (
              <p className="compare-na">Doesn’t apply here — {result.error}</p>
            ) : (
              <>
                {result.solution.answerLatex && (
                  <div className="compare-answer">
                    <TeX tex={result.solution.answerLatex} />
                  </div>
                )}
                <ol className="compare-steps">
                  {result.solution.steps.map((s, i) => (
                    <li key={i}>
                      {s.note && (
                        <span className="compare-note">
                          <RichText text={s.note} />
                        </span>
                      )}
                      {s.latex && (
                        <span className="compare-expr">
                          <TeX tex={s.latex} />
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
