import { THEMES, type ThemeId, type RevealMode, type TextSize } from '../lib/ui';

/**
 * The settings controls, inline — this is one section of the sidebar (see
 * Sidebar), not a dialog of its own, so it owns no open/close state.
 */
export function SettingsPanel({
  theme,
  onTheme,
  revealMode,
  onRevealMode,
  dark,
  onDark,
  textSize,
  onTextSize,
}: {
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  revealMode: RevealMode;
  onRevealMode: (m: RevealMode) => void;
  dark: boolean;
  onDark: (d: boolean) => void;
  textSize: TextSize;
  onTextSize: (s: TextSize) => void;
}) {
  return (
    <div className="settings-fields">
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
        <span className="field-label">Text size</span>
        <span className="setting-hint">How large the working itself renders.</span>
        <div className="segmented" role="group" aria-label="Text size">
          <button type="button" aria-pressed={textSize === 'sm'} onClick={() => onTextSize('sm')}>
            Small
          </button>
          <button type="button" aria-pressed={textSize === 'md'} onClick={() => onTextSize('md')}>
            Medium
          </button>
          <button type="button" aria-pressed={textSize === 'lg'} onClick={() => onTextSize('lg')}>
            Large
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="field-label">Working out</span>
        <span className="setting-hint">Show every line at once, or reveal one step at a time.</span>
        <div className="segmented" role="group" aria-label="Reveal mode">
          <button type="button" aria-pressed={revealMode === 'all'} onClick={() => onRevealMode('all')}>
            Show all steps
          </button>
          <button type="button" aria-pressed={revealMode === 'step'} onClick={() => onRevealMode('step')}>
            One at a time
          </button>
        </div>
      </div>

      <p className="setting-hint">
        Longhand works out every problem itself — no AI, no guessing. Every line is exact.
      </p>
    </div>
  );
}
