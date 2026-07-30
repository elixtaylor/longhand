import { fireEvent, render, screen } from '@testing-library/react';
import { TopicMethodPicker } from './TopicMethodPicker';

describe('TopicMethodPicker', () => {
  it('uses a compact dropdown for larger method sets', () => {
    const onSelectMethod = vi.fn();
    render(
      <TopicMethodPicker
        solverId="circle-geometry"
        input=""
        methodId="measurements"
        onSelectMethod={onSelectMethod}
        forceAll
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Choose a method' });
    expect(select).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();

    fireEvent.change(select, { target: { value: 'cyclic' } });
    expect(onSelectMethod).toHaveBeenCalledWith('cyclic');
  });
});
