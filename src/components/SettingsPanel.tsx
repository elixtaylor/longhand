import { useEffect, useRef } from 'react';
import { THEMES, type ThemeId, type RevealMode } from '../lib/ui';

export function SettingsPanel({
  theme,
  onTheme,
  revealMode,
  onRevealMode,
  dark,
  onDark,
  onClose,
}: {
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  revealMode: RevealMode;
  onRevealMode: (m: RevealMode) => void;
  dark: boolean;
  onDark: (d: boolean) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape; focus the panel when it opens.
  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button type="button" className="icon-btn" aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="setting-row">
          <span className="field-label">Theme</span>
          <span className="setting-hint">Three complete looks — pick whichever suits you.</span>
          <div className="theme-swatches">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="theme-swatch"
                aria-pressed={t.id === theme}
                onClick={() => onTheme(t.id)}
              >
                <span
                  className="swatch-chip"
                  style={{
                    background: t.swatch.bg,
                    borderBottom: `6px solid ${t.swatch.accent}`,
                  }}
                />
                <span>{t.name}</span>
                <span className="setting-hint" style={{ fontSize: '0.7rem' }}>
                  {t.note}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <span className="field-label">Light or dark</span>
          <span className="setting-hint">Each theme keeps its own character after dark.</span>
          <div className="segmented" role="group" aria-label="Light or dark">
            <button type="button" aria-pressed={!dark} onClick={() => onDark(false)}>
              Light
            </button>
            <button type="button" aria-pressed={dark} onClick={() => onDark(true)}>
              Dark
            </button>
          </div>
        </div>

        <div className="setting-row">
          <span className="field-label">Working out</span>
          <span className="setting-hint">Show every line at once, or reveal one step at a time.</span>
          <div className="segmented" role="group" aria-label="Reveal mode">
            <button
              type="button"
              aria-pressed={revealMode === 'all'}
              onClick={() => onRevealMode('all')}
            >
              Show all steps
            </button>
            <button
              type="button"
              aria-pressed={revealMode === 'step'}
              onClick={() => onRevealMode('step')}
            >
              One at a time
            </button>
          </div>
        </div>

        <p className="setting-hint" style={{ marginTop: 'auto' }}>
          Longhand works out every problem itself — no AI, no guessing. Every line is exact.
        </p>
      </div>
    </div>
  );
}
