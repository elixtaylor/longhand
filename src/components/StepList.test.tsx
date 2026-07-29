import { render, screen } from '@testing-library/react';
import { StepList } from './StepList';

describe('StepList annotations', () => {
  it('keeps operation annotations out of the equation line', () => {
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
    render(
      <StepList
        solution={{
          headline: 'Solve an equation',
          methodName: 'Balancing',
          steps: [
            {
              note: 'Subtract 4 from both sides.',
              latex: '3x + 4 - 4 = 10 - 4',
              annotation: 'same to both sides',
            },
          ],
        }}
        revealMode="all"
        showNotes={false}
      />,
    );
    expect(screen.getByRole('listitem').className).not.toContain(
      'step-operation',
    );
    expect(screen.queryByText('same to both sides')).toBeNull();
  });
});
