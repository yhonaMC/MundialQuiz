import { describe, it, expect } from 'vitest';
import { scoreAnswer, numericCloseness } from '@/lib/engine/scoring';

const base = { base: 100, speedBonusMax: 100, streakMultiplierStep: 0.1 };

describe('numericCloseness', () => {
  it('is 1 for an exact match', () => {
    expect(numericCloseness(8, 8, 2)).toBe(1);
  });
  it('is 0 at or beyond the tolerance', () => {
    expect(numericCloseness(10, 8, 2)).toBe(0);
    expect(numericCloseness(20, 8, 2)).toBe(0);
  });
  it('scales linearly within the tolerance', () => {
    expect(numericCloseness(9, 8, 2)).toBeCloseTo(0.5);
  });
});

describe('scoreAnswer', () => {
  it('returns 0 for a wrong answer', () => {
    expect(scoreAnswer({ ...base, correct: false, difficulty: 1, streak: 0 })).toBe(0);
  });

  it('awards more points for higher difficulty', () => {
    const easy = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0 });
    const hard = scoreAnswer({ ...base, correct: true, difficulty: 5, streak: 0 });
    expect(hard).toBeGreaterThan(easy);
  });

  it('adds a speed bonus proportional to time remaining', () => {
    const slow = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0, timeRemainingRatio: 0 });
    const fast = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0, timeRemainingRatio: 1 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('applies the streak multiplier', () => {
    const noStreak = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0 });
    const streak5 = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 5 });
    expect(streak5).toBeGreaterThan(noStreak);
  });

  it('scales by closeness for numeric answers', () => {
    const partial = scoreAnswer({ ...base, correct: true, difficulty: 3, streak: 0, closeness: 0.5 });
    const full = scoreAnswer({ ...base, correct: true, difficulty: 3, streak: 0, closeness: 1 });
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThan(0);
  });
});
