import { describe, expect, it } from 'vitest';
import { SACE_CURRICULUM } from './curriculum';
import { getSolver } from '../lib/engine/registry';

describe('SACE curriculum coverage', () => {
  it('lists every requested Stage 1 and Stage 2 topic exactly once', () => {
    expect(SACE_CURRICULUM).toHaveLength(24);
    const keys = SACE_CURRICULUM.map(
      (item) => `${item.stage}/${item.course}/${item.topic}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('maps every topic to registered solvers', () => {
    for (const item of SACE_CURRICULUM) {
      expect(item.solverIds.length, item.topic).toBeGreaterThan(0);
      for (const id of item.solverIds)
        expect(getSolver(id), `${item.topic} → ${id}`).toBeDefined();
    }
  });
});
