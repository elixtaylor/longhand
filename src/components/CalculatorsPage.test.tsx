import { fireEvent, render, screen } from '@testing-library/react';
import { CALCULATORS } from '../data/calculators';
import { getSolver } from '../lib/engine/registry';
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
    const cards = screen
      .getAllByRole('button')
      .filter((button) => button.classList.contains('calculator-card'));
    expect(cards).toHaveLength(expectedCount);

    fireEvent.click(cards[0]);
    expect(onOpenCalculator).toHaveBeenCalledWith(CALCULATORS[0].items[0]);
  });

  it('shows useful descriptions and lets the search be cleared', () => {
    render(<CalculatorsPage onReturn={vi.fn()} onOpenCalculator={vi.fn()} />);

    expect(
      screen.getByText(
        'Find a missing side or angle with sine, cosine or tangent.',
      ),
    ).toBeTruthy();
    const search = screen.getByLabelText('Search calculators');
    fireEvent.change(search, { target: { value: 'semicircle' } });
    expect(screen.getByText('Angle in a semicircle')).toBeTruthy();
    expect(screen.getByText('1 of 37 calculators')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear calculator search' }),
    );
    expect((search as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Circle measurements')).toBeTruthy();
  });

  it('filters the grouped directory by search text and topic', () => {
    render(<CalculatorsPage onReturn={vi.fn()} onOpenCalculator={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search calculators'), {
      target: { value: 'semicircle' },
    });
    expect(screen.getByText('Angle in a semicircle')).toBeTruthy();
    expect(screen.queryByText('Circle measurements')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search calculators'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Circle geometry 15' }));
    expect(screen.getByText('Tangent-secant power')).toBeTruthy();
    expect(screen.queryByText('Right-angled triangle')).toBeNull();
  });

  it('offers a recovery action when no calculator matches', () => {
    render(<CalculatorsPage onReturn={vi.fn()} onOpenCalculator={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search calculators'), {
      target: { value: 'not a real calculator' },
    });
    expect(
      screen.getByRole('heading', { name: 'No calculators found' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Show all calculators' }),
    );
    expect(screen.getByText('Right-angled triangle')).toBeTruthy();
  });

  it('matches punctuation-free words in any order and focuses search with slash', () => {
    render(<CalculatorsPage onReturn={vi.fn()} onOpenCalculator={vi.fn()} />);
    const search = screen.getByLabelText('Search calculators');

    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(search);

    fireEvent.change(search, { target: { value: 'angled right' } });
    expect(screen.getByText('Right-angled triangle')).toBeTruthy();
    expect(screen.queryByText('Circle measurements')).toBeNull();

    fireEvent.change(search, { target: { value: 'cosine sine' } });
    expect(screen.getByText('Any triangle')).toBeTruthy();
  });

  it('keeps every directory reference unique and connected to a real form', () => {
    const keys = new Set<string>();
    for (const group of CALCULATORS) {
      for (const calculator of group.items) {
        const key = `${calculator.solverId}/${calculator.methodId}`;
        expect(keys.has(key), `${key} is listed twice`).toBe(false);
        keys.add(key);

        const solver = getSolver(calculator.solverId);
        expect(solver, `${key} has no solver`).toBeTruthy();
        const method = solver?.methods.find(
          (candidate) => candidate.id === calculator.methodId,
        );
        expect(method, `${key} has no method`).toBeTruthy();
        expect(
          Boolean(method?.fields || method?.opForm),
          `${key} does not open a calculator form`,
        ).toBe(true);
        if (method?.fields) {
          expect(
            typeof method.serialize,
            `${key} has fields but cannot serialise them`,
          ).toBe('function');
        }
      }
    }
  });
});
