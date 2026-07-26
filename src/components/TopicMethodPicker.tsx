import { useEffect, useMemo } from 'react';
import { getSolver } from '../lib/engine/registry';
import { distinctMethods } from '../lib/engine/methods';

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
}: {
  solverId: string;
  input: string;
  methodId: string;
  onSelectMethod: (id: string) => void;
}) {
  const solver = getSolver(solverId)!;
  const methods = useMemo(() => distinctMethods(solver, input), [solver, input]);

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
          <div className="method-tabs" role="tablist" aria-label="Choose a method">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m.id === current?.id}
                className="method-tab"
                onClick={() => onSelectMethod(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          <p className="method-blurb">{current?.blurb}</p>
        </>
      ) : (
        <p className="method-blurb">{current?.blurb}</p>
      )}
    </div>
  );
}
