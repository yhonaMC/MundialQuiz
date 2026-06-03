import { describe, it, expect } from 'vitest';
import { buildRound, penalesContinua, TOTAL_ROUNDS, PENALES_MAX_ROUNDS } from '@/lib/multiplayer/rounds';

describe('buildRound("penales")', () => {
  it('returns a valid penales round', () => {
    for (let i = 0; i < 10; i++) {
      const r = buildRound('penales');
      expect(r.kind).toBe('penales');
      if (r.kind !== 'penales') continue;
      expect(r.prompt.length).toBeGreaterThan(0);
      expect(r.options.length).toBe(4);
      expect(new Set(r.options).size).toBe(4);
      expect(r.answer).toBeGreaterThanOrEqual(0);
      expect(r.answer).toBeLessThan(4);
    }
  });

  it('quiz keeps returning options rounds (no regression)', () => {
    expect(buildRound('quiz').kind).toBe('options');
  });
});

describe('penalesContinua', () => {
  it('always continues during the first 5 rounds', () => {
    expect(penalesContinua([0, 0], 1)).toBe(true);
    expect(penalesContinua([3, 0], 4)).toBe(true);
  });
  it('ends after 5 rounds when there is a leader', () => {
    expect(penalesContinua([3, 2], TOTAL_ROUNDS)).toBe(false);
  });
  it('continues on a tie at the top (sudden death)', () => {
    expect(penalesContinua([3, 3], TOTAL_ROUNDS)).toBe(true);
    expect(penalesContinua([3, 3, 1], 7)).toBe(true);
  });
  it('stops at the safety cap', () => {
    expect(penalesContinua([4, 4], PENALES_MAX_ROUNDS)).toBe(false);
  });
  it('a single player ends after 5 rounds', () => {
    expect(penalesContinua([4], TOTAL_ROUNDS)).toBe(false);
  });
});
