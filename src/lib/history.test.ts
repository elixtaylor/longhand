import { encodeShare, decodeShare, pushHistory, loadHistory, clearHistory } from './history';

describe('share links', () => {
  it('round-trips a problem through the URL fragment', () => {
    const state = { input: 'a=7, b=9, C=40', solverId: 'triangle-rules', methodId: 'cosine-rule' };
    const back = decodeShare(encodeShare(state));
    expect(back).toEqual(state);
  });

  it('survives characters that need escaping', () => {
    const state = { input: 'what is 50% of 200 & more?', solverId: 'percentages' };
    const back = decodeShare(encodeShare(state));
    expect(back?.input).toBe(state.input);
  });

  it('returns null for an empty or junk fragment', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#')).toBeNull();
    expect(decodeShare('#nothing=here')).toBeNull();
  });
});

describe('history', () => {
  beforeEach(() => clearHistory());

  it('stores the most recent problem first', () => {
    pushHistory({ input: 'first', solverId: 'linear', methodId: 'balance', at: 1 });
    pushHistory({ input: 'second', solverId: 'linear', methodId: 'balance', at: 2 });
    expect(loadHistory().map((h) => h.input)).toEqual(['second', 'first']);
  });

  it('moves a repeated problem back to the top rather than duplicating it', () => {
    pushHistory({ input: 'same', solverId: 'linear', methodId: 'balance', at: 1 });
    pushHistory({ input: 'other', solverId: 'linear', methodId: 'balance', at: 2 });
    pushHistory({ input: 'same', solverId: 'linear', methodId: 'balance', at: 3 });
    const list = loadHistory();
    expect(list.map((h) => h.input)).toEqual(['same', 'other']);
  });

  it('caps the list so storage cannot grow without bound', () => {
    for (let i = 0; i < 40; i++) {
      pushHistory({ input: `problem ${i}`, solverId: 'linear', methodId: 'balance', at: i });
    }
    expect(loadHistory().length).toBeLessThanOrEqual(20);
  });

  it('clears cleanly', () => {
    pushHistory({ input: 'x', solverId: 'linear', methodId: 'balance', at: 1 });
    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });
});
