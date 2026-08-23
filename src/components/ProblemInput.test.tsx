import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProblemInput } from './ProblemInput';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <ProblemInput
      value={value}
      onChange={setValue}
      placeholder="Type a problem"
    />
  );
}

describe('ProblemInput', () => {
  it('keeps the symbol palette available to keyboard users', () => {
    render(<Harness />);
    const x = screen.getByRole('button', { name: 'x' });
    expect(x.tabIndex).toBe(0);
    fireEvent.click(x);
    expect(
      (screen.getByLabelText('Your problem') as HTMLInputElement).value,
    ).toBe('x');
  });

  it('can hide the symbol palette while keeping the calculator available', () => {
    render(
      <ProblemInput
        value=""
        onChange={vi.fn()}
        placeholder="Type a problem"
        showPalette={false}
      />,
    );

    expect(screen.queryByRole('group', { name: 'Insert symbol' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Simple calculator' }),
    ).toBeTruthy();
  });

  it('offers direct and inverse trig shortcuts for triangle work', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'tan⁻¹' }));

    expect(
      (screen.getByLabelText('Your problem') as HTMLInputElement).value,
    ).toBe('arctan()');
  });

  it('opens the basic calculator from the input heading', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Simple calculator' }));

    expect(
      await screen.findByRole('dialog', { name: 'Basic calculator' }),
    ).toBeTruthy();
  });
});
