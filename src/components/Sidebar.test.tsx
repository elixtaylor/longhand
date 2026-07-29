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
  });
});
