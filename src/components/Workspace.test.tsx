import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Workspace } from './Workspace';

describe('Workspace solution reveal', () => {
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
});
