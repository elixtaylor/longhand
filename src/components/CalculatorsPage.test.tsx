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
    expect(screen.getByRole('heading', { name: 'Calculators' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(expectedCount + 1);

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onOpenCalculator).toHaveBeenCalledWith(CALCULATORS[0].items[0]);
  });
});
