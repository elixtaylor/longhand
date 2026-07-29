import { fireEvent, render, screen } from '@testing-library/react';
import { runWorked } from '../lib/engine/run';
import { PartedSolution } from './PartedSolution';

describe('PartedSolution method choices', () => {
  it('keeps method choices visible for each topic in a mixed question', () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );

    const worked = runWorked('x^2 - 4 = 0 then d/dx x^3 - 4x^2');
    const onSelectPartMethod = vi.fn();
    render(
      <PartedSolution
        worked={worked}
        revealMode="all"
        showNotes={false}
        onSelectPartMethod={onSelectPartMethod}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Quadratic formula' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'First principles' })).toBeTruthy();
    expect(screen.queryByText(/Always works, including/)).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'First principles' }));
    expect(onSelectPartMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        solver: expect.objectContaining({ id: 'differentiate' }),
      }),
      'first-principles',
    );
  });
});
