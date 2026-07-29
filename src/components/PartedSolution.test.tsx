import { fireEvent, render, screen } from '@testing-library/react';
import { runWorked } from '../lib/engine/run';
import { partMethodKey } from '../lib/engine/parts';
import { PartedSolution } from './PartedSolution';

describe('PartedSolution method choices', () => {
  function setupLayout() {
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
  }

  it('keeps method choices visible for each topic in a mixed question', () => {
    setupLayout();

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

  it('keeps equivalent applicable methods available inside a mixed question', () => {
    setupLayout();
    const worked = runWorked('ln x = 5 then d/dx x^3');
    render(
      <PartedSolution
        worked={worked}
        revealMode="all"
        showNotes={false}
        onSelectPartMethod={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Equating indices' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Taking logs' })).toBeTruthy();
  });

  it('briefly marks the method changed in the affected part', () => {
    setupLayout();
    const derivative = 'd/dx x^3 - 4x^2';
    const worked = runWorked(`x^2 - 4 = 0 then ${derivative}`, undefined, {
      [partMethodKey('differentiate', derivative)]: 'first-principles',
    });
    render(
      <PartedSolution
        worked={worked}
        revealMode="all"
        showNotes={false}
        changedPart={{ label: 'b', methodId: 'first-principles' }}
        onSelectPartMethod={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'First principles' }).className,
    ).toContain('method-tab--changed');
    expect(
      screen.getByRole('tab', { name: 'Quadratic formula' }).className,
    ).not.toContain('method-tab--changed');
  });
});
