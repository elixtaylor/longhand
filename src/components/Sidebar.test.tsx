import { fireEvent, render, screen } from '@testing-library/react';
import { solvers } from '../lib/engine/registry';
import { Sidebar } from './Sidebar';

describe('Sidebar calculator directory', () => {
  it('uses compact labelled rows without calculator descriptions', () => {
    render(
      <Sidebar
        onClose={vi.fn()}
        solver={solvers[0]}
        onLoadImported={vi.fn()}
        history={[]}
        onLoadHistory={vi.fn()}
        onClearHistory={vi.fn()}
        onJumpToCalculator={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        revealMode="all"
        onRevealMode={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Calculators/ }));

    expect(screen.queryByText(/Fill in any two/)).toBeNull();
    expect(
      screen.getAllByRole('button', { name: 'Right-angled triangle' }),
    ).toHaveLength(1);
    expect(document.querySelectorAll('.calc-item').length).toBeGreaterThan(1);
    expect(document.querySelector('.sidebar-nav-index')).toBeNull();
    expect(screen.queryByRole('button', { name: /Formulas/ })).toBeNull();
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
        onJumpToCalculator={vi.fn()}
        theme="notebook"
        onTheme={vi.fn()}
        revealMode="all"
        onRevealMode={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Recent/ }));
    expect(screen.getByText('2x + 3 = 9')).toBeTruthy();
    expect(screen.queryByText('General')).toBeNull();
    expect(document.querySelector('.recent-list .example-tag')).toBeNull();
  });
});
