import { useEffect, useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage';
import type { ThemeId, RevealMode, TextSize, DisplayMode } from './lib/ui';
import { Workspace } from './components/Workspace';
import { DisplayModeContext } from './components/TeX';

export default function App() {
  const [theme, setTheme] = useLocalStorage<ThemeId>('longhand.theme', 'mono');
  const [revealMode, setRevealMode] = useLocalStorage<RevealMode>(
    'longhand.reveal',
    'all',
  );
  const [dark, setDark] = useLocalStorage<boolean>('longhand.dark', false);
  const [textSize, setTextSize] = useLocalStorage<TextSize>(
    'longhand.textSize',
    'md',
  );
  const [displayMode, setDisplayMode] = useLocalStorage<DisplayMode>(
    'longhand.displayMode',
    'exact',
  );
  const [showPalette, setShowPalette] = useLocalStorage<boolean>(
    'longhand.palette',
    true,
  );
  /**
   * Off by default: the working itself is what a student came for, and a
   * sentence above every line pushes the maths apart. The toggle sits with
   * the working rather than in settings, because it is a thing you reach for
   * mid-question and put back.
   */
  const [showNotes, setShowNotes] = useLocalStorage<boolean>(
    'longhand.notes',
    false,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  function goHome() {
    setSidebarOpen(false);
    setResetKey((key) => key + 1);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    window.requestAnimationFrame(() =>
      document.getElementById('problem')?.focus(),
    );
  }
  const closeSidebar = () => {
    setSidebarOpen(false);
    window.requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Open menu"]')
        ?.focus(),
    );
  };

  // Apply the theme to <html> so the token sets in themes.css take effect.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.dark = dark ? 'on' : 'off';
    document.documentElement.dataset.textSize = textSize;
  }, [theme, dark, textSize]);

  // Keyboard shortcuts: "/" focuses the problem box, "," opens the menu.
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
        setSidebarOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <DisplayModeContext.Provider value={displayMode}>
      <div className="app">
        <header className="masthead">
          <div className="masthead-left">
            <button
              type="button"
              className="icon-btn"
              aria-label="Open menu"
              aria-haspopup="dialog"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              {/* hamburger glyph — the drawer holds calculators, practice,
                answer checking, textbook questions and settings */}
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
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <button
              type="button"
              className="wordmark"
              aria-label="Longhand home, clear the current problem"
              onClick={goHome}
            >
              <span className="wordmark-mark">L</span>
              Longhand
            </button>
          </div>
        </header>

        <Workspace
          revealMode={revealMode}
          onRevealMode={setRevealMode}
          showNotes={showNotes}
          onShowNotes={setShowNotes}
          sidebarOpen={sidebarOpen}
          onSidebarClose={closeSidebar}
          theme={theme}
          onTheme={setTheme}
          dark={dark}
          onDark={setDark}
          textSize={textSize}
          onTextSize={setTextSize}
          showPalette={showPalette}
          onShowPalette={setShowPalette}
          resetKey={resetKey}
          displayMode={displayMode}
          onDisplayMode={setDisplayMode}
        />
      </div>
    </DisplayModeContext.Provider>
  );
}
