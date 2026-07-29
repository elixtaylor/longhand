import {
  THEMES,
  type ThemeId,
  type RevealMode,
  type TextSize,
} from '../lib/ui';

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
  showPalette,
  onShowPalette,
}: {
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
}) {
  return (
    <div className="settings-fields">
      <div className="setting-row">
        <span className="field-label">Theme</span>
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
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="field-label">Light or dark</span>
        <div className="segmented" role="group" aria-label="Light or dark">
          <button
            type="button"
            aria-pressed={!dark}
            onClick={() => onDark(false)}
          >
            Light
          </button>
          <button
            type="button"
            aria-pressed={dark}
            onClick={() => onDark(true)}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="field-label">Text size</span>
        <div className="segmented" role="group" aria-label="Text size">
          <button
            type="button"
            aria-pressed={textSize === 'sm'}
            onClick={() => onTextSize('sm')}
          >
            Small
          </button>
          <button
            type="button"
            aria-pressed={textSize === 'md'}
            onClick={() => onTextSize('md')}
          >
            Medium
          </button>
          <button
            type="button"
            aria-pressed={textSize === 'lg'}
            onClick={() => onTextSize('lg')}
          >
            Large
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="field-label">Working out</span>
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

      <div className="setting-row">
        <span className="field-label">Equation buttons</span>
        <button
          type="button"
          className="setting-switch"
          role="switch"
          aria-label="Equation buttons"
          aria-checked={showPalette}
          onClick={() => onShowPalette(!showPalette)}
        >
          <span className="setting-switch-track" aria-hidden="true">
            <span className="setting-switch-thumb" />
          </span>
          <span>{showPalette ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
}
