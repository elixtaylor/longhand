import { useMemo, useState } from 'react';
import type { SaceSubject, Solver } from '../lib/engine/types';

/** Display order for the SACE subject groups. */
const GROUPS: SaceSubject[] = ['Foundations', 'General', 'Methods', 'Specialist'];

export function TopicMethodPicker({
  solvers,
  solverId,
  onSelectSolver,
  methodId,
  onSelectMethod,
  showTopics,
}: {
  solvers: Solver[];
  solverId: string;
  onSelectSolver: (id: string) => void;
  methodId: string;
  onSelectMethod: (id: string) => void;
  showTopics: boolean;
}) {
  const [filter, setFilter] = useState('');
  const solver = solvers.find((s) => s.id === solverId) ?? solvers[0];

  /** Each topic appears under its most advanced subject, so nothing repeats. */
  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = solvers.filter(
      (s) =>
        q === '' ||
        s.title.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.methods.some((m) => m.name.toLowerCase().includes(q)),
    );
    return GROUPS.map((group) => ({
      group,
      items: matches.filter((s) => primarySubject(s) === group),
    })).filter((g) => g.items.length > 0);
  }, [solvers, filter]);

  return (
    <div>
      {showTopics && (
        <>
          <div className="panel-title">Topic</div>
          <input
            type="search"
            className="topic-filter"
            placeholder="Search topics…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search topics"
          />
          <div className="topic-groups">
            {grouped.map(({ group, items }) => (
              <div key={group} className="topic-group">
                <div className="topic-group-name">{group}</div>
                <div className="topic-grid">
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="topic-chip"
                      aria-pressed={s.id === solverId}
                      onClick={() => onSelectSolver(s.id)}
                      title={s.blurb}
                    >
                      <span className="topic-chip-name">{s.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && <p className="setting-hint">No topics match “{filter}”.</p>}
          </div>
        </>
      )}

      <div className="methods" style={{ marginTop: showTopics ? 'var(--sp-4)' : 0 }}>
        <div className="panel-title" style={{ marginBottom: 'var(--sp-2)' }}>
          Method — {solver.title}
        </div>
        {solver.methods.length > 1 ? (
          <>
            <div className="method-tabs" role="tablist" aria-label="Choose a method">
              {solver.methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={m.id === methodId}
                  className="method-tab"
                  onClick={() => onSelectMethod(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <p className="method-blurb">
              {solver.methods.find((m) => m.id === methodId)?.blurb}
            </p>
          </>
        ) : (
          <p className="method-blurb">{solver.methods[0]?.blurb}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Where a topic is principally taught — the first subject it lists, not the
 * most advanced one. Differentiation is examined in Specialist too, but a
 * student goes looking for it under Methods.
 */
function primarySubject(s: Solver): SaceSubject {
  return s.subjects[0] ?? 'General';
}
