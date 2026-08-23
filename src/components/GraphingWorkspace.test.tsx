import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  evaluateGraphExpression,
  GraphingWorkspace,
} from './GraphingWorkspace';

describe('graphing expression table', () => {
  it('evaluates growth, polynomial and trigonometric expressions against x', () => {
    expect(evaluateGraphExpression('100e^(0.05x)', 2)).toBeCloseTo(110.517, 2);
    expect(evaluateGraphExpression('x^2 - 4', -3)).toBe(5);
    expect(evaluateGraphExpression('sin(x)', Math.PI / 2)).toBeCloseTo(1, 8);
  });

  it('opens a compact viewing-window settings modal and shows table labels', () => {
    render(<GraphingWorkspace onClose={vi.fn()} />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Graphs and Equations',
      }),
    ).toBeTruthy();
    expect(
      document.querySelectorAll('.graph-point-label').length,
    ).toBeGreaterThan(0);
    expect(document.querySelector('.graph-point-label.is-visible')).toBeNull();
    const pointTarget = document.querySelector('.graph-point-hover-target');
    expect(pointTarget).toBeTruthy();
    fireEvent.mouseEnter(pointTarget!);
    expect(
      document.querySelector('.graph-point-label.is-visible'),
    ).toBeTruthy();
    const point = document.querySelector('.graph-table-point');
    const labelBackground = document.querySelector(
      '.graph-point-label-bg.is-visible',
    );
    const labelText = document.querySelector('.graph-point-label.is-visible');
    expect(point).toBeTruthy();
    expect(labelBackground).toBeTruthy();
    expect(labelText).toBeTruthy();
    const pointX = Number(point?.getAttribute('cx'));
    const pointY = Number(point?.getAttribute('cy'));
    const labelX = Number(labelBackground?.getAttribute('x'));
    const labelY = Number(labelBackground?.getAttribute('y'));
    const labelWidth = Number(labelBackground?.getAttribute('width'));
    const labelHeight = Number(labelBackground?.getAttribute('height'));
    expect(labelX + labelWidth / 2).toBeCloseTo(pointX, 1);
    expect(labelY).toBeLessThan(pointY);
    expect(Number(labelText?.getAttribute('x'))).toBeCloseTo(
      labelX + labelWidth / 2,
      1,
    );
    expect(Number(labelText?.getAttribute('y'))).toBeCloseTo(
      labelY + labelHeight / 2,
      1,
    );
    expect(labelText?.getAttribute('text-anchor')).toBe('middle');
    expect(labelText?.getAttribute('dominant-baseline')).toBe('middle');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Graph settings' })).toBeTruthy();
    expect(screen.getByLabelText('x min')).toBeTruthy();
    expect(screen.getByLabelText('x axis increment')).toBeTruthy();
    expect(screen.getByLabelText('y axis increment')).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Enable trackpad zoom' }),
    ).toBeTruthy();
  });

  it('zooms the graph with the trackpad setting enabled', () => {
    render(<GraphingWorkspace onClose={vi.fn()} />);
    const plot = document.querySelector('.graphing-plot-wrap');
    const gridLines = () =>
      Array.from(document.querySelectorAll('.graph-grid-line'))
        .map((line) => `${line.getAttribute('x1')}:${line.getAttribute('y1')}`)
        .join('|');
    expect(plot).toBeTruthy();
    expect(document.querySelector('.graph-grid-line')).toBeTruthy();
    const before = gridLines();

    fireEvent.wheel(plot!, { deltaY: -120 });

    expect(gridLines()).not.toBe(before);
  });

  it('keeps editing focus on the nearest row after deleting a table row', () => {
    render(<GraphingWorkspace onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove table row 5' }));

    expect(document.activeElement).toBe(screen.getByLabelText('x value 4'));
  });
});
