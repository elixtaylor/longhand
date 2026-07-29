import { act, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary recovery', () => {
  it('clears the problem state and shows a small recovery notice', () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
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
    consoleError.mockRestore();
    vi.useRealTimers();
  });

  it('recovers again after a later malformed shared problem', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
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
    consoleError.mockRestore();
  });
});
