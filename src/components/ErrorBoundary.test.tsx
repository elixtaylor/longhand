import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary recovery', () => {
  it('clears the problem state and shows a small recovery notice', () => {
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
    consoleError.mockRestore();
  });
});
