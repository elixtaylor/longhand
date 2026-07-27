import { useEffect, useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage';
import type { ThemeId, RevealMode, TextSize } from './lib/ui';
import { Workspace } from './components/Workspace';
import { SettingsPanel } from './components/SettingsPanel';

export default function App() {
  const [theme, setTheme] = useLocalStorage<ThemeId>('longhand.theme', 'editorial');
  const [revealMode, setRevealMode] = useLocalStorage<RevealMode>('longhand.reveal', 'all');
  const [dark, setDark] = useLocalStorage<boolean>('longhand.dark', false);
  const [textSize, setTextSize] = useLocalStorage<TextSize>('longhand.textSize', 'md');
  /**
   * Off by default: the working itself is what a student came for, and a
   * sentence above every line pushes the maths apart. The toggle sits with
   * the working rather than in settings, because it is a thing you reach for
   * mid-question and put back.
   */
  const [showNotes, setShowNotes] = useLocalStorage<boolean>('longhand.notes', false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply the theme to <html> so the token sets in themes.css take effect.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.dark = dark ? 'on' : 'off';
    document.documentElement.dataset.textSize = textSize;
  }, [theme, dark, textSize]);

  // Keyboard shortcuts: "/" focuses the problem box, "," opens settings.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('problem')?.focus();
      } else if (e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <span className="wordmark-mark">L</span>
          Longhand
        </div>
        <div className="masthead-meta">
          <button
            type="button"
            className="icon-btn"
            aria-label="Open settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            {/* gear glyph */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <Workspace
        revealMode={revealMode}
        showNotes={showNotes}
        onShowNotes={setShowNotes}
      />

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          onTheme={setTheme}
          revealMode={revealMode}
          onRevealMode={setRevealMode}
          dark={dark}
          onDark={setDark}
          textSize={textSize}
          onTextSize={setTextSize}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
