import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocalStorage } from './lib/useLocalStorage';
import type {
  ThemeId,
  RevealMode,
  TextSize,
  DisplayMode,
  LogarithmBase,
} from './lib/ui';
import { Workspace } from './components/Workspace';
import { DisplayModeContext } from './components/TeX';
import type { SettingsPanelProps } from './components/SettingsPanel';
import type { CalculatorRef } from './data/calculators';
import { pageFromPath, pagePath, type PageId } from './lib/routes';

const GraphingWorkspace = lazy(() =>
  import('./components/GraphingWorkspace').then((module) => ({
    default: module.GraphingWorkspace,
  })),
);
const CalculatorsPage = lazy(() =>
  import('./components/CalculatorsPage').then((module) => ({
    default: module.CalculatorsPage,
  })),
);
const SettingsPanel = lazy(() =>
  import('./components/SettingsPanel').then((module) => ({
    default: module.SettingsPanel,
  })),
);

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
  const [logarithmBase, setLogarithmBase] = useLocalStorage<LogarithmBase>(
    'longhand.logarithmBase',
    'natural',
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
  const [autoScroll, setAutoScroll] = useLocalStorage<boolean>(
    'longhand.autoScroll',
    true,
  );
  const [showReading, setShowReading] = useLocalStorage<boolean>(
    'longhand.reading',
    true,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState<PageId>(() =>
    pageFromPath(window.location.pathname),
  );
  const [pendingCalculator, setPendingCalculator] =
    useState<CalculatorRef | null>(null);
  const [resetKey, setResetKey] = useState(0);
  function navigate(next: PageId, replace = false) {
    const url = pagePath(next);
    (replace ? window.history.replaceState : window.history.pushState).call(
      window.history,
      null,
      '',
      url,
    );
    setPage(next);
    setSidebarOpen(false);
  }
  function goHome() {
    setSidebarOpen(false);
    setPendingCalculator(null);
    setResetKey((key) => key + 1);
    navigate('home', true);
    window.requestAnimationFrame(() =>
      document.getElementById('problem')?.focus(),
    );
  }

  useEffect(() => {
    function onPopState() {
      setPage(pageFromPath(window.location.pathname));
      setSidebarOpen(false);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Page changes should start at the page heading. Without this, opening a
  // calculator from lower in the directory inherits that scroll position and
  // can land with its diagram and first fields already above the viewport.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.title =
      page === 'home'
        ? 'Longhand'
        : page === 'calculators'
          ? 'Calculators | Longhand'
          : page === 'graphing'
            ? 'Graphs and Equations | Longhand'
            : 'Settings | Longhand';
  }, [page]);
  const closeSidebar = () => {
    const restoreMenuFocus = sidebarOpen;
    setSidebarOpen(false);
    if (restoreMenuFocus) {
      window.requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>('[aria-label="Open menu"]')
          ?.focus(),
      );
    }
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
        {page === 'home' && (
          <header className="masthead">
            <div className="masthead-top">
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
        )}

        <Suspense fallback={<RouteLoading page={page} />}>
          {page === 'graphing' ? (
            <GraphingWorkspace onClose={() => navigate('home')} />
          ) : page === 'calculators' ? (
            <CalculatorsPage
              onReturn={() => navigate('home')}
              onOpenCalculator={(calculator) => {
                setPendingCalculator(calculator);
                navigate('home');
              }}
            />
          ) : page === 'settings' ? (
            <SettingsPage
              onReturn={() => navigate('home')}
              theme={theme}
              onTheme={setTheme}
              revealMode={revealMode}
              onRevealMode={setRevealMode}
              dark={dark}
              onDark={setDark}
              textSize={textSize}
              onTextSize={setTextSize}
              showPalette={showPalette}
              onShowPalette={setShowPalette}
              displayMode={displayMode}
              onDisplayMode={setDisplayMode}
              logarithmBase={logarithmBase}
              onLogarithmBase={setLogarithmBase}
              autoScroll={autoScroll}
              onAutoScroll={setAutoScroll}
              showReading={showReading}
              onShowReading={setShowReading}
              showNotes={showNotes}
              onShowNotes={setShowNotes}
              onResetPreferences={() => {
                setTheme('mono');
                setRevealMode('all');
                setDark(false);
                setTextSize('md');
                setDisplayMode('exact');
                setLogarithmBase('natural');
                setShowPalette(true);
                setAutoScroll(true);
                setShowReading(true);
                setShowNotes(false);
              }}
            />
          ) : (
            <div className="home-workspace">
              <div className="masthead-menu">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Open menu"
                  aria-haspopup="dialog"
                  onClick={() => setSidebarOpen((open) => !open)}
                >
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
              </div>
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
                logarithmBase={logarithmBase}
                onLogarithmBase={setLogarithmBase}
                autoScroll={autoScroll}
                showReading={showReading}
                onNavigatePage={navigate}
                pendingCalculator={pendingCalculator}
                onCalculatorHandled={() => setPendingCalculator(null)}
              />
            </div>
          )}
        </Suspense>
      </div>
    </DisplayModeContext.Provider>
  );
}

function RouteLoading({ page }: { page: PageId }) {
  return (
    <main className="page-shell" aria-busy="true">
      <p className="sr-only" role="status">
        Loading {page}
      </p>
    </main>
  );
}

function SettingsPage({
  onReturn,
  onResetPreferences,
  ...settings
}: SettingsPanelProps & {
  onReturn: () => void;
  onResetPreferences: () => void;
}) {
  return (
    <main className="page-shell settings-page">
      <header className="graphing-header">
        <div className="graphing-header-left">
          <button
            type="button"
            className="return-btn"
            aria-label="Return to equation input"
            onClick={onReturn}
          >
            ← Return
          </button>
          <h1 className="graphing-kicker">Settings</h1>
        </div>
      </header>
      <section className="page-card">
        <SettingsPanel {...settings} onResetPreferences={onResetPreferences} />
      </section>
    </main>
  );
}
