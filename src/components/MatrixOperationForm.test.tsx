import { fireEvent, render, screen } from '@testing-library/react';
import { MatrixOperationForm } from './MatrixOperationForm';

function fillMatrix(label: string, values: number[][]) {
  values.forEach((row, rowIndex) =>
    row.forEach((value, columnIndex) =>
      fireEvent.change(
        screen.getByLabelText(
          `${label}, row ${rowIndex + 1}, column ${columnIndex + 1}`,
        ),
        { target: { value: String(value) } },
      ),
    ),
  );
}

describe('MatrixOperationForm', () => {
  it('builds a matrix addition from two visual grids', () => {
    const onSubmit = vi.fn();
    render(<MatrixOperationForm methodId="standard" onSubmit={onSubmit} />);

    fillMatrix('Matrix A', [
      [1, 2],
      [3, 4],
    ]);
    fillMatrix('Matrix B', [
      [5, 6],
      [7, 8],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(onSubmit).toHaveBeenCalledWith('[[1,2],[3,4]] + [[5,6],[7,8]]');
  });

  it('supports a three-by-three determinant without free-text syntax', () => {
    const onSubmit = vi.fn();
    render(<MatrixOperationForm methodId="determinant" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Matrix order'), {
      target: { value: '3' },
    });
    fillMatrix('Determinant matrix', [
      [1, 2, 3],
      [0, 1, 4],
      [5, 6, 0],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(onSubmit).toHaveBeenCalledWith('det [[1,2,3],[0,1,4],[5,6,0]]');
  });

  it('clears every visible matrix entry', () => {
    render(<MatrixOperationForm methodId="transpose" onSubmit={vi.fn()} />);
    fireEvent.change(
      screen.getByLabelText('Matrix to transpose, row 1, column 1'),
      { target: { value: '9' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(
      (
        screen.getByLabelText(
          'Matrix to transpose, row 1, column 1',
        ) as HTMLInputElement
      ).value,
    ).toBe('');
  });
});
