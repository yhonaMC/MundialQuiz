import { describe, it, expect } from 'vitest';
import { aiShoots, questionDifficulty, AI_GOAL_PROBABILITY, NIVEL_DIFFICULTY, NIVELES } from '@/lib/penales/ai';
import { createRng } from '@/lib/engine/rng';

describe('aiShoots', () => {
  it('scores at a rate close to the configured probability (seeded)', () => {
    for (const nivel of NIVELES) {
      const rng = createRng(42);
      let goalsCount = 0;
      const N = 2000;
      for (let i = 0; i < N; i++) if (aiShoots(nivel, rng)) goalsCount++;
      const rate = goalsCount / N;
      expect(Math.abs(rate - AI_GOAL_PROBABILITY[nivel])).toBeLessThan(0.04);
    }
  });

  it('facil scores less often than dificil', () => {
    const a = createRng(7);
    const b = createRng(7);
    let facil = 0;
    let dificil = 0;
    for (let i = 0; i < 1000; i++) {
      if (aiShoots('facil', a)) facil++;
      if (aiShoots('dificil', b)) dificil++;
    }
    expect(dificil).toBeGreaterThan(facil);
  });
});

describe('questionDifficulty', () => {
  it('stays within the level range', () => {
    for (const nivel of NIVELES) {
      const rng = createRng(11);
      const [min, max] = NIVEL_DIFFICULTY[nivel];
      for (let i = 0; i < 200; i++) {
        const d = questionDifficulty(nivel, false, rng);
        expect(d).toBeGreaterThanOrEqual(min);
        expect(d).toBeLessThanOrEqual(max);
      }
    }
  });

  it('sudden death adds +1 capped at 5', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const d = questionDifficulty('dificil', true, rng);
      expect(d).toBeGreaterThanOrEqual(4); // [3,5] + 1 → [4,5] (tope 5)
      expect(d).toBeLessThanOrEqual(5);
    }
    const rng2 = createRng(3);
    for (let i = 0; i < 200; i++) {
      const d = questionDifficulty('facil', true, rng2);
      expect(d).toBeGreaterThanOrEqual(2); // [1,2] + 1 → [2,3]
      expect(d).toBeLessThanOrEqual(3);
    }
  });
});
