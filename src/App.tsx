import { useEffect, useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage';
import type { ThemeId, RevealMode } from './lib/ui';
import { Workspace } from './components/Workspace';
import { SettingsPanel } from './components/SettingsPanel';

export default function App() {
  const [theme, setTheme] = useLocalStorage<ThemeId>('longhand.theme', 'editorial');
  const [revealMode, setRevealMode] = useLocalStorage<RevealMode>('longhand.reveal', 'all');
  const [dark, setDark] = useLocalStorage<boolean>('longhand.dark', false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply the theme to <html> so the token sets in themes.css take effect.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.dark = dark ? 'on' : 'off';
  }, [theme, dark]);

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
          <span className="masthead-tag">SACE maths · line by line</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Open settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            {/* gear glyph */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 13a7.6 7.6 0 0 0 0-2l1.7-1.3-1.8-3.1-2 .8a7.7 7.7 0 0 0-1.7-1l-.3-2.1H9.7l-.3 2.1c-.6.25-1.17.58-1.7 1l-2-.8-1.8 3.1L5.6 11a7.6 7.6 0 0 0 0 2l-1.7 1.3 1.8 3.1 2-.8c.53.42 1.1.75 1.7 1l.3 2.1h4.6l.3-2.1c.6-.25 1.17-.58 1.7-1l2 .8 1.8-3.1L19.4 13Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <Workspace revealMode={revealMode} />

      <footer className="colophon">
        <span>Longhand — worked out exactly, never generated. Made for SACE maths.</span>
        <span>Foundations · General · Methods · Specialist</span>
      </footer>

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          onTheme={setTheme}
          revealMode={revealMode}
          onRevealMode={setRevealMode}
          dark={dark}
          onDark={setDark}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
