import { act, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { notifyRecoverableError } from '../lib/recovery';

describe('ErrorBoundary recovery', () => {
  function suppressExpectedWindowError(event: ErrorEvent) {
    event.preventDefault();
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', suppressExpectedWindowError);
  });

  afterEach(() => {
    window.removeEventListener('error', suppressExpectedWindowError);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('clears the problem state and shows a small recovery notice', () => {
    vi.useFakeTimers();
    function UnstableProblem() {
      if (window.location.hash) {
        throw new Error('malformed shared problem');
      }
      return <main aria-label="Empty equation screen">Enter an equation</main>;
    }

    window.location.hash = '#q=broken';
    render(
      <ErrorBoundary>
        <UnstableProblem />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('main', { name: 'Empty equation screen' }),
    ).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('An error occurred.');
    expect(window.location.hash).toBe('');
    act(() => vi.advanceTimersByTime(25_000));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('recovers again after a later malformed shared problem', () => {
    function UnstableProblem() {
      if (window.location.hash) {
        throw new Error('malformed shared problem');
      }
      return <main aria-label="Empty equation screen">Enter an equation</main>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <UnstableProblem />
      </ErrorBoundary>,
    );
    window.location.hash = '#q=broken-again';
    rerender(
      <ErrorBoundary>
        <UnstableProblem />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('main', { name: 'Empty equation screen' }),
    ).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('An error occurred.');
    expect(window.location.hash).toBe('');
  });

  it('shows the same notice for a recoverable error that did not throw', () => {
    vi.useFakeTimers();
    render(
      <ErrorBoundary>
        <main>Ready</main>
      </ErrorBoundary>,
    );

    act(() => notifyRecoverableError());
    expect(screen.getByRole('status').textContent).toBe('An error occurred.');
    act(() => vi.advanceTimersByTime(25_000));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
