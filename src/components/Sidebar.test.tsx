import { fireEvent, render, screen } from '@testing-library/react';
import { solvers } from '../lib/engine/registry';
import { Sidebar } from './Sidebar';

describe('Sidebar navigation', () => {
  it('opens the calculator directory route', () => {
    const onNavigatePage = vi.fn();
    render(
      <Sidebar
        onClose={vi.fn()}
        solver={solvers[0]}
        onLoadImported={vi.fn()}
        history={[]}
        onLoadHistory={vi.fn()}
        onClearHistory={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        revealMode="all"
        onRevealMode={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
        onNavigatePage={onNavigatePage}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Calculators/ }));

    expect(onNavigatePage).toHaveBeenCalledWith('calculators');
    expect(document.querySelector('.sidebar-nav-index')).toBeNull();
    expect(document.querySelector('.accordion-chevron')).toBeNull();
    expect(document.querySelector('.ref-count')).toBeNull();
    expect(screen.queryByRole('button', { name: /Practice mode/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Check my answer/ }),
    ).toBeNull();
  });

  it('shows recent equations without topic labels', () => {
    render(
      <Sidebar
        onClose={vi.fn()}
        solver={solvers[0]}
        onLoadImported={vi.fn()}
        history={[
          {
            input: '2x + 3 = 9',
            solverId: 'linear',
            methodId: 'balance',
            at: 1,
          },
        ]}
        onLoadHistory={vi.fn()}
        onClearHistory={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        revealMode="all"
        onRevealMode={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Recent/ }));
    expect(screen.getByText('2x + 3 = 9')).toBeTruthy();
    expect(screen.queryByText('General')).toBeNull();
    expect(document.querySelector('.recent-list .example-tag')).toBeNull();
  });
});
