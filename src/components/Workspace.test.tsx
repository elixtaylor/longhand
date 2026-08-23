import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Workspace } from './Workspace';
import { ErrorBoundary } from './ErrorBoundary';
import { encodeShare } from '../lib/history';

describe('Workspace solution reveal', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/longhand/');
  });

  it('scrolls the new working into view after Show the working', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    render(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Your problem'), {
      target: { value: '2x + 3 = 9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show the working' }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('clears the active equation when the home reset signal changes', async () => {
    const view = render(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
        resetKey={0}
      />,
    );
    fireEvent.change(screen.getByLabelText('Your problem'), {
      target: { value: '2x + 3 = 9' },
    });
    expect(
      (screen.getByLabelText('Your problem') as HTMLInputElement).value,
    ).toBe('2x + 3 = 9');

    view.rerender(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
        resetKey={1}
      />,
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Your problem') as HTMLInputElement).value,
      ).toBe(''),
    );
  });

  it('opens the PMI calculator from the calculator directory', async () => {
    const onCalculatorHandled = vi.fn();
    render(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
        pendingCalculator={{ solverId: 'induction', methodId: 'sum' }}
        onCalculatorHandled={onCalculatorHandled}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Summand f(r)')).toBeTruthy(),
    );
    expect(screen.getByLabelText('Start n₀')).toBeTruthy();
    expect(screen.getByLabelText('Induction domain')).toBeTruthy();
    expect(onCalculatorHandled).toHaveBeenCalled();
  });

  it('keeps a pinned right-triangle calculator and its values after solving', async () => {
    render(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="mono"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
        pendingCalculator={{
          solverId: 'right-triangle',
          methodId: 'pythagoras',
        }}
        onCalculatorHandled={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('a')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('a'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '4' } });
    await waitFor(() =>
      expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('5'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy working' })).toBeTruthy(),
    );
    expect((screen.getByLabelText('a') as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText('c') as HTMLInputElement).value).toBe('5');
    expect(screen.queryByLabelText('C')).toBeNull();
    expect(
      screen
        .getByRole('tab', { name: 'Pythagoras' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('gives a valid shared problem precedence over a saved draft', async () => {
    localStorage.setItem('longhand.draft', JSON.stringify('old draft'));
    window.history.replaceState(
      null,
      '',
      `/longhand/${encodeShare({
        input: '2x + 3 = 9',
        solverId: 'linear',
        methodId: 'balance',
      })}`,
    );

    render(
      <Workspace
        revealMode="all"
        onRevealMode={vi.fn()}
        showNotes={false}
        onShowNotes={vi.fn()}
        sidebarOpen={false}
        onSidebarClose={vi.fn()}
        theme="mono"
        onTheme={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        (screen.getByLabelText('Your problem') as HTMLInputElement).value,
      ).toBe('2x + 3 = 9'),
    );
  });

  it('clears a malformed shared link and reports it without restoring a draft', async () => {
    localStorage.setItem('longhand.draft', JSON.stringify('old draft'));
    window.history.replaceState(null, '', '/longhand/#nothing=here');

    render(
      <ErrorBoundary>
        <Workspace
          revealMode="all"
          onRevealMode={vi.fn()}
          showNotes={false}
          onShowNotes={vi.fn()}
          sidebarOpen={false}
          onSidebarClose={vi.fn()}
          theme="mono"
          onTheme={vi.fn()}
          dark={false}
          onDark={vi.fn()}
          textSize="md"
          onTextSize={vi.fn()}
          showPalette
          onShowPalette={vi.fn()}
        />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText('Your problem') as HTMLInputElement).value,
      ).toBe('');
      expect(screen.getByText('An error occurred.')).toBeTruthy();
      expect(window.location.hash).toBe('');
    });
  });
});
