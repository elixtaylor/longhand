import { describe, expect, it } from 'vitest';
import { pageFromPath } from './routes';

describe('page routes', () => {
  it('recognises the Pages graphing and settings paths', () => {
    expect(pageFromPath('/longhand/graphing')).toBe('graphing');
    expect(pageFromPath('/longhand/calculators')).toBe('calculators');
    expect(pageFromPath('/longhand/settings')).toBe('settings');
    expect(pageFromPath('/longhand/')).toBe('home');
  });

  it('also recognises root deployments', () => {
    expect(pageFromPath('/graphing')).toBe('graphing');
    expect(pageFromPath('/settings/')).toBe('settings');
  });
});
