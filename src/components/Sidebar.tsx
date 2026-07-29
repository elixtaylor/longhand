import { useEffect, useRef, useState } from 'react';
import type { Solver } from '../lib/engine/types';
import type { ThemeId, RevealMode, TextSize, DisplayMode } from '../lib/ui';
import { CALCULATORS } from '../data/calculators';
import { importedFor, sourceOf, type ImportedProblem } from '../data/imported';
import { getSolver } from '../lib/engine/registry';
import type { HistoryEntry } from '../lib/history';
import { SettingsPanel } from './SettingsPanel';
import { AnswerCheckPanel } from './AnswerCheckPanel';
import { PracticePanel } from './PracticePanel';
import type { Worked } from '../lib/engine/run';
import type { Example } from '../data/examples';

/**
 * The collapsible drawer keeps calculators, practice, answer checking,
 * textbook questions, recent work and settings in one compact list.
 *
 * Mounted only while open (see Workspace), same as the settings modal it
 * replaces — so this owns the scrim, Escape-to-close and focus-on-open it
 * used to own, and `onClose` is its only way out.
 */

type SectionId =
  | 'graphing'
  | 'calculators'
  | 'textbook'
  | 'recent'
  | 'check'
  | 'practice'
  | 'settings';

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
  showPalette,
  onShowPalette,
  input = '',
  worked = null,
  onOpenExample = () => undefined,
  displayMode = 'exact',
  onDisplayMode = () => undefined,
  onNavigatePage = () => undefined,
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
  showPalette: boolean;
  onShowPalette: (show: boolean) => void;
  input?: string;
  worked?: Worked | null;
  onOpenExample?: (example: Example) => void;
  displayMode?: DisplayMode;
  onDisplayMode?: (mode: DisplayMode) => void;
  onNavigatePage?: (page: 'home' | 'graphing' | 'settings') => void;
}) {
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const imported = importedFor(solver.id);
  const calculators = CALCULATORS.flatMap((group) => group.items);

  const sections: Array<{
    id: SectionId;
    label: string;
    available: boolean;
  }> = [
    { id: 'graphing', label: 'Graphing', available: true },
    {
      id: 'calculators',
      label: 'Calculators',
      available: true,
    },
    {
      id: 'textbook',
      label: 'Textbook questions',
      available: imported.length > 0,
    },
    {
      id: 'recent',
      label: 'Recent',
      available: history.length > 0,
    },
    { id: 'settings', label: 'Settings', available: true },
    { id: 'check', label: 'Check my answer', available: true },
    { id: 'practice', label: 'Practice mode', available: true },
  ];
  const shown = sections.filter((s) => s.available);

  // Changing topic can pull the open textbook tab out from under the student.
  useEffect(() => {
    if (openSection && !shown.some((s) => s.id === openSection))
      setOpenSection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solver.id, history.length]);

  // Close on Escape; focus the panel when it opens.
  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(id: SectionId) {
    setOpenSection((cur) => (cur === id ? null : id));
  }

  function activate(id: SectionId) {
    if (id === 'graphing' || id === 'settings') {
      onNavigatePage(id);
      onClose();
      return;
    }
    toggle(id);
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
          <div className="sidebar-title-group">
            <span className="sidebar-kicker">Longhand</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close menu"
            onClick={onClose}
          >
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
                  aria-expanded={
                    s.id === 'graphing' || s.id === 'settings'
                      ? undefined
                      : openSection === s.id
                  }
                  aria-controls={
                    s.id === 'graphing' || s.id === 'settings'
                      ? undefined
                      : `sidebar-panel-${s.id}`
                  }
                  onClick={() => activate(s.id)}
                >
                  {s.label}
                </button>
              </h3>

              {openSection === s.id && (
                <div className="accordion-panel" id={`sidebar-panel-${s.id}`}>
                  {s.id === 'calculators' && (
                    <div className="calc-list">
                      {calculators.map((item) => {
                        const itemSolver = getSolver(item.solverId)!;
                        const method = itemSolver.methods.find(
                          (m) => m.id === item.methodId,
                        )!;
                        return (
                          <button
                            key={`${item.solverId}-${item.methodId}`}
                            type="button"
                            className="calc-item"
                            onClick={() =>
                              jumpToCalculator(item.solverId, item.methodId)
                            }
                          >
                            <span className="calc-item-label">
                              {item.label ?? method.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {s.id === 'textbook' && (
                    <>
                      <div className="examples examples-grid">
                        {imported.map((p) => (
                          <button
                            key={p.ref}
                            type="button"
                            className="example-row"
                            onClick={() => loadImported(p)}
                          >
                            <span className="example-expr">{p.label}</span>
                            <span className="example-tag">{p.ref}</span>
                          </button>
                        ))}
                      </div>
                      <p className="attribution">
                        Questions from{' '}
                        <a
                          href={sourceOf(imported[0]).url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {sourceOf(imported[0]).title}
                        </a>{' '}
                        ({sourceOf(imported[0]).publisher}), used under{' '}
                        <a
                          href={sourceOf(imported[0]).licenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {sourceOf(imported[0]).licence}
                        </a>
                        . All working is Longhand’s own.
                      </p>
                    </>
                  )}

                  {s.id === 'recent' && (
                    <>
                      <div className="examples examples-grid recent-list">
                        {history.slice(0, 12).map((h) => (
                          <button
                            key={`${h.at}-${h.input}`}
                            type="button"
                            className="example-row"
                            onClick={() => loadHistory(h)}
                            title={h.input}
                          >
                            <span className="example-expr">
                              {truncate(h.input, 34)}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="attribution">
                        <button
                          type="button"
                          className="link-btn"
                          onClick={onClearHistory}
                        >
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
                      showPalette={showPalette}
                      onShowPalette={onShowPalette}
                      displayMode={displayMode}
                      onDisplayMode={onDisplayMode}
                    />
                  )}
                  {s.id === 'check' && (
                    <AnswerCheckPanel input={input} worked={worked} />
                  )}
                  {s.id === 'practice' && (
                    <PracticePanel onOpenExample={onOpenExample} />
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
