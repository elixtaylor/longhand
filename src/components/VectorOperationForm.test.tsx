import { fireEvent, render, screen } from '@testing-library/react';
import { VectorOperationForm } from './VectorOperationForm';

describe('VectorOperationForm', () => {
  it('asks for both vectors when finding the angle between them', () => {
    const onSubmit = vi.fn();
    render(<VectorOperationForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Angle between' }));
    expect(screen.getByLabelText('Vector a — x')).toBeTruthy();
    expect(screen.getByLabelText('Vector b — x')).toBeTruthy();

    const inputs = [
      ['Vector a — x', '1'],
      ['Vector a — y', '0'],
      ['Vector a — z', '0'],
      ['Vector b — x', '0'],
      ['Vector b — y', '1'],
      ['Vector b — z', '0'],
    ];
    for (const [label, value] of inputs)
      fireEvent.change(screen.getByLabelText(label), { target: { value } });

    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(onSubmit).toHaveBeenCalledWith('angle (1,0,0) (0,1,0)');
  });
});
