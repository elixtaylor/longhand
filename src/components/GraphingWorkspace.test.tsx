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
      document.querySelectorAll('.graph-point-label').length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Graph settings' })).toBeTruthy();
    expect(screen.getByLabelText('x min')).toBeTruthy();
  });
});
