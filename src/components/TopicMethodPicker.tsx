import { useEffect, useMemo } from 'react';
import { getSolver } from '../lib/engine/registry';
import { applicableMethods, distinctMethods } from '../lib/engine/methods';

/**
 * The method choice for the current topic — the one control that stays, now
 * that the topic itself is always worked out automatically.
 *
 * Only methods that give genuinely different working for *this* problem are
 * offered; see `distinctMethods`.
 */
export function TopicMethodPicker({
  solverId,
  input,
  methodId,
  onSelectMethod,
  forceAll,
  showAllApplicable,
  highlightedMethodId,
  showDescription = false,
}: {
  solverId: string;
  input: string;
  methodId: string;
  onSelectMethod: (id: string) => void;
  /**
   * Skip the distinct-working filter and always offer every method. For a
   * solver where a method can be a structured form (see StructuredInputForm)
   * rather than a technique choice, its methods parse disjoint, mutually
   * exclusive input — every other method "fails" on whichever one just
   * solved, by design, not because it doesn't apply. Filtering on that
   * would hide the very tabs a student needs to switch to a different kind
   * of question.
   */
  forceAll?: boolean;
  /** Keep every method that can solve this part, including equivalent starts. */
  showAllApplicable?: boolean;
  /** Briefly draw attention to a method just selected in a multi-part answer. */
  highlightedMethodId?: string | null;
  /** Hide the prose explanation while keeping the method choices available. */
  showDescription?: boolean;
}) {
  const solver = getSolver(solverId)!;
  const methods = useMemo(
    () =>
      forceAll
        ? solver.methods
        : showAllApplicable
          ? applicableMethods(solver, input)
          : distinctMethods(solver, input),
    [solver, input, forceAll, showAllApplicable],
  );

  // If the selected method was folded into another, move the selection to the
  // one still on screen rather than leaving nothing highlighted.
  useEffect(() => {
    if (methods.length > 0 && !methods.some((m) => m.id === methodId)) {
      onSelectMethod(methods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods, methodId]);

  const current = methods.find((m) => m.id === methodId) ?? methods[0];

  return (
    <div className="methods">
      <div className="panel-title" style={{ marginBottom: 'var(--sp-2)' }}>
        Method — {solver.title}
      </div>
      {methods.length > 1 ? (
        <>
          <div
            className="method-tabs"
            role="tablist"
            aria-label="Choose a method"
          >
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m.id === current?.id}
                className={`method-tab${m.id === highlightedMethodId ? ' method-tab--changed' : ''}`}
                onClick={() => onSelectMethod(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          {showDescription && <p className="method-blurb">{current?.blurb}</p>}
        </>
      ) : (
        showDescription && <p className="method-blurb">{current?.blurb}</p>
      )}
    </div>
  );
}
