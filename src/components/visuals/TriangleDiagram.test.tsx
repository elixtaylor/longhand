import { render } from '@testing-library/react';
import { TriangleDiagram } from './TriangleDiagram';

describe('TriangleDiagram', () => {
  it('keeps labels readable when the data-sized viewBox is scaled', () => {
    render(
      <TriangleDiagram
        data={{
          a: 3,
          b: 4,
          c: 5,
          A: 36.87,
          B: 53.13,
          C: 90,
          rightAngle: true,
        }}
      />,
    );

    const labels = Array.from(
      document.querySelectorAll<SVGTextElement>('.diagram-label'),
    );

    expect(labels).toHaveLength(6);
    expect(labels.every((label) => parseFloat(label.style.fontSize) < 3)).toBe(
      true,
    );
  });
});
