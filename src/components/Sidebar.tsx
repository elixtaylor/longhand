import { useEffect, useRef, useState } from 'react';
import type { Solver } from '../lib/engine/types';
import type { ThemeId, RevealMode, TextSize } from '../lib/ui';
import { CALCULATORS } from '../data/calculators';
import { importedFor, sourceOf, type ImportedProblem } from '../data/imported';
import { formulasFor } from '../data/formulas';
import { getSolver } from '../lib/engine/registry';
import type { HistoryEntry } from '../lib/history';
import { SettingsPanel } from './SettingsPanel';
import { TeX } from './TeX';

/**
 * The collapsible drawer that used to be the top ReferenceTabs strip plus the
 * gear-icon settings modal — now one place, opened from the masthead. An
 * accordion rather than tabs because a directory of calculators sits above
 * formulas/textbook/recent here, and those two shapes of content don't read
 * well side by side in a horizontal strip.
 *
 * Mounted only while open (see Workspace), same as the settings modal it
 * replaces — so this owns the scrim, Escape-to-close and focus-on-open it
 * used to own, and `onClose` is its only way out.
 */

type SectionId = 'calculators' | 'formulas' | 'textbook' | 'recent' | 'settings';

export function Sidebar({
  onClose,
  solver,
  onLoadImported,
  history,
  onLoadHistory,
  onClearHistory,
  onJumpToCalculator,
  theme,
  onTheme,
  revealMode,
  onRevealMode,
  dark,
  onDark,
  textSize,
  onTextSize,
}: {
  onClose: () => void;
  solver: Solver;
  onLoadImported: (p: ImportedProblem) => void;
  history: HistoryEntry[];
  onLoadHistory: (h: HistoryEntry) => void;
  onClearHistory: () => void;
  onJumpToCalculator: (solverId: string, methodId: string) => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  revealMode: RevealMode;
  onRevealMode: (m: RevealMode) => void;
  dark: boolean;
  onDark: (d: boolean) => void;
  textSize: TextSize;
  onTextSize: (s: TextSize) => void;
}) {
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const formulas = formulasFor(solver.id);
  const imported = importedFor(solver.id);

  const sections: Array<{ id: SectionId; label: string; count?: number; available: boolean }> = [
    { id: 'calculators', label: 'Calculators', available: true },
    { id: 'formulas', label: 'Formulas', count: formulas.length, available: formulas.length > 0 },
    { id: 'textbook', label: 'Textbook questions', count: imported.length, available: imported.length > 0 },
    { id: 'recent', label: 'Recent', count: history.length, available: history.length > 0 },
    { id: 'settings', label: 'Settings', available: true },
  ];
  const shown = sections.filter((s) => s.available);

  // Changing topic can pull the open formulas/textbook tab out from under the
  // student, same as ReferenceTabs used to guard against.
  useEffect(() => {
    if (openSection && !shown.some((s) => s.id === openSection)) setOpenSection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solver.id, history.length]);

  // Close on Escape; focus the panel when it opens.
  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(id: SectionId) {
    setOpenSection((cur) => (cur === id ? null : id));
  }

  function jumpToCalculator(solverId: string, methodId: string) {
    onJumpToCalculator(solverId, methodId);
    onClose();
  }

  function loadImported(p: ImportedProblem) {
    onLoadImported(p);
    onClose();
  }

  function loadHistory(h: HistoryEntry) {
    onLoadHistory(h);
    onClose();
  }

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="sidebar-panel"
        role="dialog"
        aria-label="Menu"
        aria-modal="true"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sidebar-head">
          <h2>Menu</h2>
          <button type="button" className="icon-btn" aria-label="Close menu" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="accordion">
          {shown.map((s) => (
            <div className="accordion-section" key={s.id}>
              <h3>
                <button
                  type="button"
                  className="accordion-trigger"
                  aria-expanded={openSection === s.id}
                  aria-controls={`sidebar-panel-${s.id}`}
                  onClick={() => toggle(s.id)}
                >
                  <span>
                    {s.label}
                    {s.count !== undefined && <span className="ref-count">{s.count}</span>}
                  </span>
                  <svg
                    className="accordion-chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </h3>

              {openSection === s.id && (
                <div className="accordion-panel" id={`sidebar-panel-${s.id}`}>
                  {s.id === 'calculators' && (
                    <div className="calc-groups">
                      {CALCULATORS.map((group) => (
                        <div className="calc-group" key={group.heading}>
                          <div className="ref-panel-title">{group.heading}</div>
                          <div className="examples">
                            {group.items.map((item) => {
                              const itemSolver = getSolver(item.solverId)!;
                              const method = itemSolver.methods.find((m) => m.id === item.methodId)!;
                              return (
                                <button
                                  key={`${item.solverId}-${item.methodId}`}
                                  type="button"
                                  className="calc-item"
                                  onClick={() => jumpToCalculator(item.solverId, item.methodId)}
                                >
                                  <span className="calc-item-label">{item.label ?? method.name}</span>
                                  <span className="calc-item-blurb">{item.blurb ?? method.blurb}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.id === 'formulas' && (
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

                  {s.id === 'textbook' && (
                    <>
                      <div className="examples examples-grid">
                        {imported.map((p) => (
                          <button key={p.ref} type="button" className="example-row" onClick={() => loadImported(p)}>
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

                  {s.id === 'recent' && (
                    <>
                      <div className="examples examples-grid">
                        {history.slice(0, 12).map((h) => (
                          <button
                            key={`${h.at}-${h.input}`}
                            type="button"
                            className="example-row"
                            onClick={() => loadHistory(h)}
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

                  {s.id === 'settings' && (
                    <SettingsPanel
                      theme={theme}
                      onTheme={onTheme}
                      revealMode={revealMode}
                      onRevealMode={onRevealMode}
                      dark={dark}
                      onDark={onDark}
                      textSize={textSize}
                      onTextSize={onTextSize}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
