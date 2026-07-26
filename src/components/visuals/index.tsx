import type { StepVisual } from '../../lib/engine/types';
import type {
  GridMultiplyData,
  LongDivisionData,
  TriangleData,
  CurveData,
  NormalData,
  BoxPlotData,
  NumberLineData,
} from '../../lib/engine/visuals';
import { GridMultiply } from './GridMultiply';
import { LongDivision } from './LongDivision';
import { TriangleDiagram } from './TriangleDiagram';
import { CurveSketch } from './CurveSketch';
import { NormalCurve } from './NormalCurve';
import { BoxPlot } from './BoxPlot';
import { NumberLine } from './NumberLine';

/**
 * Dispatcher for bespoke step diagrams. These hand-drawn layouts are what make
 * the working read as real maths rather than generic output — and for topics
 * like trigonometry and statistics, the diagram *is* half the answer.
 */
export function StepVisualView({ visual }: { visual: StepVisual }) {
  switch (visual.kind) {
    case 'grid-multiply':
      return <GridMultiply data={visual.data as GridMultiplyData} />;
    case 'long-division':
      return <LongDivision data={visual.data as LongDivisionData} />;
    case 'triangle':
      return <TriangleDiagram data={visual.data as TriangleData} />;
    case 'curve':
      return <CurveSketch data={visual.data as CurveData} />;
    case 'normal':
      return <NormalCurve data={visual.data as NormalData} />;
    case 'box-plot':
      return <BoxPlot data={visual.data as BoxPlotData} />;
    case 'number-line':
      return <NumberLine data={visual.data as NumberLineData} />;
    default:
      return null;
  }
}
