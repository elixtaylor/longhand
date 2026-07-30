import { fireEvent, render, screen } from '@testing-library/react';
import { CALCULATORS } from '../data/calculators';
import { CalculatorsPage } from './CalculatorsPage';

describe('CalculatorsPage', () => {
  it('lists every calculator in the directory and opens a selected method', () => {
    const onOpenCalculator = vi.fn();
    render(
      <CalculatorsPage
        onReturn={vi.fn()}
        onOpenCalculator={onOpenCalculator}
      />,
    );

    const expectedCount = CALCULATORS.reduce(
      (count, group) => count + group.items.length,
      0,
    );
    expect(screen.getByText('Calculators')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(expectedCount + 1);

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onOpenCalculator).toHaveBeenCalledWith(CALCULATORS[0].items[0]);
  });

  it('filters the dense directory by search text and topic', () => {
    render(<CalculatorsPage onReturn={vi.fn()} onOpenCalculator={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search calculators'), {
      target: { value: 'semicircle' },
    });
    expect(screen.getByText('Angle in a semicircle')).toBeTruthy();
    expect(screen.queryByText('Circle measurements')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search calculators'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Filter calculators'), {
      target: { value: 'Circle geometry' },
    });
    expect(screen.getByText('Tangent-secant power')).toBeTruthy();
    expect(screen.queryByText('Right-angled triangle')).toBeNull();
  });
});
