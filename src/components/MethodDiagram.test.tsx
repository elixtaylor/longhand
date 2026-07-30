import { render, screen } from '@testing-library/react';
import { MethodDiagram } from './MethodDiagram';

describe('circle method diagrams', () => {
  it.each([
    ['measurements', 'radius r and diameter d'],
    ['arc-sector', 'radius r, central angle theta and arc length'],
    ['chord', 'chord, two radii and a shaded circular segment'],
    ['centre-angle', 'angle at the centre with an angle at the circumference'],
    ['cyclic', 'cyclic quadrilateral inside a circle'],
    ['same-segment', 'two equal angles in the same segment'],
    ['semicircle', 'triangle in a circle with a diameter'],
    ['tangent-radius', 'radius meeting a tangent at a right angle'],
    ['equal-tangents', 'equal tangents from one external point'],
    ['equal-chords', 'two equal chords and equal central angles'],
    ['tangent-chord', 'tangent and chord at a point on a circle'],
    ['chord-distance', 'chord with a perpendicular distance from the centre'],
    ['tangent-length', 'external point joined to a circle centre'],
    ['intersecting-chords', 'chords intersecting inside a circle'],
    ['power-of-point', 'tangent and secant from an external point'],
  ])('%s has a labelled reference diagram', (methodId, label) => {
    render(<MethodDiagram methodId={methodId} />);
    expect(screen.getByRole('img', { name: new RegExp(label) })).toBeTruthy();
  });
});
