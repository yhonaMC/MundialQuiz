import { describe, it, expect } from 'vitest';
import { nextDifficulty } from '@/lib/engine/difficulty';

describe('nextDifficulty', () => {
  it('keeps difficulty until there are enough samples', () => {
    expect(nextDifficulty(3, [true, true])).toBe(3);
  });

  it('raises difficulty on high accuracy', () => {
    expect(nextDifficulty(3, [true, true, true])).toBe(4);
  });

  it('lowers difficulty on low accuracy', () => {
    expect(nextDifficulty(3, [false, false, false])).toBe(2);
  });

  it('stays in the middle band', () => {
    expect(nextDifficulty(3, [true, false, true])).toBe(3);
  });

  it('never goes below 1 or above 5', () => {
    expect(nextDifficulty(5, [true, true, true, true])).toBe(5);
    expect(nextDifficulty(1, [false, false, false, false])).toBe(1);
  });
});
