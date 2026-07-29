import { describe, expect, it } from 'vitest';
import { checkAnswer } from './checking';

describe('answer checking', () => {
  it('accepts equivalent numerical answers', () => {
    expect(checkAnswer('x = 3.5', '3.500').status).toBe('correct');
  });
  it('rejects a wrong answer', () => {
    expect(checkAnswer('x = 3.5', '4').status).toBe('incorrect');
  });
});
