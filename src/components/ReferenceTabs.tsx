import { useEffect, useRef, useState } from 'react';
import type { Solver } from '../lib/engine/types';
import { importedFor, sourceOf, type ImportedProblem } from '../data/imported';
import { formulasFor } from '../data/formulas';
import { getSolver } from '../lib/engine/registry';
import type { HistoryEntry } from '../lib/history';
import { TeX } from './TeX';

/**
 * Formulas, textbook questions and recent work, reachable from the
 * top of the page rather than by scrolling past the working.
 *
 * They used to sit in a column under the input, which put the formula sheet
 * below the fold exactly when a student was mid-question and wanted it. As
 * tabs they cost one row of the page and open in place.
 *
 * A tab with nothing behind it is not shown at all, so the strip never offers
 * a dead end.
 */

type TabId = 'formulas' | 'textbook' | 'recent';

export function ReferenceTabs({
  solver,
  onLoadImported,
  history,
  onLoadHistory,
  onClearHistory,
}: {
  solver: Solver;
  onLoadImported: (p: ImportedProblem) => void;
  history: HistoryEntry[];
  onLoadHistory: (h: HistoryEntry) => void;
  onClearHistory: () => void;
}) {
  const [open, setOpen] = useState<TabId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const formulas = formulasFor(solver.id);
  const imported = importedFor(solver.id);

  const tabs: Array<{ id: TabId; label: string; count?: number; available: boolean }> = [
    { id: 'formulas', label: 'Formulas', count: formulas.length, available: formulas.length > 0 },
    { id: 'textbook', label: 'Textbook questions', count: imported.length, available: imported.length > 0 },
    { id: 'recent', label: 'Recent', count: history.length, available: history.length > 0 },
  ];
  const shown = tabs.filter((t) => t.available);

  // Changing topic can pull the open tab out from under the student.
  useEffect(() => {
    if (open && !shown.some((t) => t.id === open)) setOpen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solver.id, history.length]);

  if (shown.length === 0) return null;

  function toggle(id: TabId) {
    setOpen((cur) => (cur === id ? null : id));
  }

  /** Left/right arrows move along the strip, as tabs are expected to. */
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = (index + delta + shown.length) % shown.length;
    const el = panelRef.current?.parentElement?.querySelectorAll<HTMLButtonElement>('.ref-tab');
    el?.[next]?.focus();
  }

  return (
    <div className="reference">
      <div className="ref-strip" role="tablist" aria-label="Reference">
        {shown.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className="ref-tab"
            role="tab"
            aria-selected={open === t.id}
            aria-controls={`ref-panel-${t.id}`}
            onClick={() => toggle(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.count !== undefined && <span className="ref-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {open && (
        <div className="ref-panel" id={`ref-panel-${open}`} role="tabpanel" ref={panelRef}>
          {open === 'formulas' && (
            <>
              <div className="ref-panel-title">{solver.title}</div>
              <dl className="formula-grid">
                {formulas.map((f) => (
                  <div key={f.name} className="formula-row">
                    <dt>{f.name}</dt>
                    <dd>
                      <TeX tex={f.latex} />
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}


          {open === 'textbook' && (
            <>
              <div className="examples examples-grid">
                {imported.map((p) => (
                  <button key={p.ref} type="button" className="example-row" onClick={() => onLoadImported(p)}>
                    <span className="example-expr">{p.label}</span>
                    <span className="example-tag">{p.ref}</span>
                  </button>
                ))}
              </div>
              <p className="attribution">
                Questions from{' '}
                <a href={sourceOf(imported[0]).url} target="_blank" rel="noreferrer">
                  {sourceOf(imported[0]).title}
                </a>{' '}
                ({sourceOf(imported[0]).publisher}), used under{' '}
                <a href={sourceOf(imported[0]).licenceUrl} target="_blank" rel="noreferrer">
                  {sourceOf(imported[0]).licence}
                </a>
                . All working is Longhand’s own.
              </p>
            </>
          )}

          {open === 'recent' && (
            <>
              <div className="examples examples-grid">
                {history.slice(0, 12).map((h) => (
                  <button
                    key={`${h.at}-${h.input}`}
                    type="button"
                    className="example-row"
                    onClick={() => onLoadHistory(h)}
                    title={h.input}
                  >
                    <span className="example-expr">{truncate(h.input, 34)}</span>
                    <span className="example-tag">{getSolver(h.solverId)?.title ?? ''}</span>
                  </button>
                ))}
              </div>
              <p className="attribution">
                <button type="button" className="link-btn" onClick={onClearHistory}>
                  Clear recent problems
                </button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
