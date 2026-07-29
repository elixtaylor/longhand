import {
  THEMES,
  type ThemeId,
  type RevealMode,
  type TextSize,
  type DisplayMode,
} from '../lib/ui';

/**
 * The settings controls used by the dedicated Settings page. It owns no
 * navigation or open/close state.
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
  displayMode = 'exact',
  onDisplayMode = () => undefined,
  autoScroll = true,
  onAutoScroll = () => undefined,
  showReading = true,
  onShowReading = () => undefined,
  showNotes = false,
  onShowNotes = () => undefined,
  onResetPreferences,
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
  displayMode?: DisplayMode;
  onDisplayMode?: (mode: DisplayMode) => void;
  autoScroll?: boolean;
  onAutoScroll?: (value: boolean) => void;
  showReading?: boolean;
  onShowReading?: (value: boolean) => void;
  showNotes?: boolean;
  onShowNotes?: (value: boolean) => void;
  onResetPreferences?: () => void;
}) {
  function Switch({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }) {
    return (
      <button
        type="button"
        className="setting-switch"
        role="switch"
        aria-label={label}
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span className="setting-switch-track" aria-hidden="true">
          <span className="setting-switch-thumb" />
        </span>
        <span>{value ? 'On' : 'Off'}</span>
      </button>
    );
  }

  return (
    <div className="settings-fields">
      <div className="setting-row setting-row-theme">
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

      <div className="setting-row setting-row-light">
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

      <div className="setting-row setting-row-number">
        <span className="field-label">Number format</span>
        <div className="segmented" role="group" aria-label="Number format">
          <button
            type="button"
            aria-pressed={displayMode === 'exact'}
            onClick={() => onDisplayMode('exact')}
          >
            Exact
          </button>
          <button
            type="button"
            aria-pressed={displayMode === 'decimal'}
            onClick={() => onDisplayMode('decimal')}
          >
            Decimal
          </button>
        </div>
      </div>

      <div className="setting-row setting-row-text">
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

      <div className="setting-row setting-row-working">
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

      <div className="setting-row setting-row-palette">
        <span className="field-label">Equation buttons</span>
        <Switch
          label="Equation buttons"
          value={showPalette}
          onChange={onShowPalette}
        />
      </div>

      <div className="setting-row setting-row-auto">
        <span className="field-label">Auto-scroll to working</span>
        <Switch
          label="Auto-scroll to working"
          value={autoScroll}
          onChange={onAutoScroll}
        />
      </div>

      <div className="setting-row setting-row-reading">
        <span className="field-label">Reading preview</span>
        <Switch
          label="Reading preview"
          value={showReading}
          onChange={onShowReading}
        />
      </div>

      <div className="setting-row setting-row-notes">
        <span className="field-label">Why explanations</span>
        <Switch
          label="Why explanations"
          value={showNotes}
          onChange={onShowNotes}
        />
      </div>

      {onResetPreferences && (
        <div className="setting-row setting-reset-row">
          <button
            type="button"
            className="link-btn"
            onClick={onResetPreferences}
          >
            Reset preferences
          </button>
        </div>
      )}
    </div>
  );
}
