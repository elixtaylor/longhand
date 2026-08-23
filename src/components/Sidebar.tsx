import { useEffect, useRef, useState } from 'react';
import type {
  ThemeId,
  RevealMode,
  TextSize,
  DisplayMode,
  LogarithmBase,
} from '../lib/ui';
import type { HistoryEntry } from '../lib/history';
import { SettingsPanel } from './SettingsPanel';

/**
 * The collapsible drawer keeps routes, recent work and settings in one compact
 * list.
 *
 * Mounted only while open (see Workspace), same as the settings modal it
 * replaces — so this owns the scrim, Escape-to-close and focus-on-open it
 * used to own, and `onClose` is its only way out.
 */

type SectionId = 'graphing' | 'calculators' | 'recent' | 'settings';

export function Sidebar({
  onClose,
  history,
  onLoadHistory,
  onClearHistory,
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
  displayMode = 'exact',
  onDisplayMode = () => undefined,
  logarithmBase = 'natural',
  onLogarithmBase = () => undefined,
  onNavigatePage = () => undefined,
}: {
  onClose: () => void;
  history: HistoryEntry[];
  onLoadHistory: (h: HistoryEntry) => void;
  onClearHistory: () => void;
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
  displayMode?: DisplayMode;
  onDisplayMode?: (mode: DisplayMode) => void;
  logarithmBase?: LogarithmBase;
  onLogarithmBase?: (base: LogarithmBase) => void;
  onNavigatePage?: (
    page: 'home' | 'graphing' | 'calculators' | 'settings',
  ) => void;
}) {
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
      id: 'recent',
      label: 'Recent',
      available: history.length > 0,
    },
    { id: 'settings', label: 'Settings', available: true },
  ];
  const shown = sections.filter((s) => s.available);

  // Clearing history can remove the section while it is open.
  useEffect(() => {
    if (openSection === 'recent' && history.length === 0) setOpenSection(null);
  }, [history.length, openSection]);

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
    if (id === 'graphing' || id === 'calculators' || id === 'settings') {
      onNavigatePage(id);
      onClose();
      return;
    }
    toggle(id);
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
            <span className="sidebar-brand-mark" aria-hidden="true">
              L
            </span>
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
                    s.id === 'graphing' ||
                    s.id === 'calculators' ||
                    s.id === 'settings'
                      ? undefined
                      : openSection === s.id
                  }
                  aria-controls={
                    s.id === 'graphing' ||
                    s.id === 'calculators' ||
                    s.id === 'settings'
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
                      logarithmBase={logarithmBase}
                      onLogarithmBase={onLogarithmBase}
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
