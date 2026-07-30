/**
 * The SACE Stage 1 and Stage 2 coverage map.
 *
 * Keeping this list separate from the solver registry makes the curriculum
 * contract explicit: a topic can use more than one solver when a question
 * naturally crosses a boundary (for example, differentiation applications).
 */
export type CurriculumStage = 'Stage 1' | 'Stage 2';
export type CurriculumCourse = 'Methods' | 'Specialist';

export interface CurriculumTopic {
  stage: CurriculumStage;
  course: CurriculumCourse;
  topic: string;
  solverIds: string[];
}

export const SACE_CURRICULUM: CurriculumTopic[] = [
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Further Differentiation and Applications',
    solverIds: ['differentiate', 'calculus-applications'],
  },
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Discrete Random Variables',
    solverIds: ['distributions'],
  },
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Integral Calculus',
    solverIds: ['integrate'],
  },
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Logarithmic Functions',
    solverIds: ['logarithms'],
  },
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Continuous Random Variables and the Normal Distribution',
    solverIds: ['distributions'],
  },
  {
    stage: 'Stage 2',
    course: 'Methods',
    topic: 'Sampling and Confidence Intervals',
    solverIds: ['distributions', 'statistics'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Mathematical Induction',
    solverIds: ['induction'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Complex Numbers',
    solverIds: ['complex'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Functions and Sketching Graphs',
    solverIds: ['functions'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Vectors in Three Dimensions',
    solverIds: ['vectors'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Integration Techniques and Applications',
    solverIds: ['integrate'],
  },
  {
    stage: 'Stage 2',
    course: 'Specialist',
    topic: 'Rates of Change and Differential Equations',
    solverIds: ['rates', 'calculus-applications'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Functions and graphs',
    solverIds: ['functions'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Polynomials',
    solverIds: ['polynomials'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Trigonometry',
    solverIds: ['right-triangle', 'triangle-rules', 'trig-equations'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Counting and Statistics',
    solverIds: ['counting', 'statistics'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Introduction to Differential Calculus',
    solverIds: ['differentiate'],
  },
  {
    stage: 'Stage 1',
    course: 'Methods',
    topic: 'Growth and Decay',
    solverIds: ['rates', 'financial'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Geometry and Proof',
    solverIds: ['geometry-proof', 'circle-geometry'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Arithmetic and Geometric Sequences and Series',
    solverIds: ['sequences'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Matrices',
    solverIds: ['matrices'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Vectors in the plane',
    solverIds: ['vectors'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Further Trigonometry',
    solverIds: ['triangle-rules', 'trig-equations'],
  },
  {
    stage: 'Stage 1',
    course: 'Specialist',
    topic: 'Real and Complex Numbers',
    solverIds: ['complex', 'indices'],
  },
];
