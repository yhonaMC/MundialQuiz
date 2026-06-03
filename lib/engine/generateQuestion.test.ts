import { describe, it, expect } from 'vitest';
import { generateQuestion } from '@/lib/engine/generateQuestion';
import { TOURNAMENTS } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';

const base = {
  tournaments: TOURNAMENTS,
  seenIds: [] as string[],
};

describe('generateQuestion', () => {
  it('returns a question for filter "all"', () => {
    const q = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'all', rng: createRng(1) });
    expect(q.id).toBeTruthy();
    expect(q.prompt).toBeTruthy();
  });

  it('respects a specific tournament filter', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateQuestion({ ...base, targetDifficulty: 2, tournamentFilter: 2014, rng: createRng(i) });
      // Las preguntas cross-tournament (not-champion) no tienen año fijo del torneo objetivo;
      // pero si tournamentYear está definido, debe coincidir con el filtro.
      if (q.tournamentYear !== undefined && !q.id.startsWith('not-champion')) {
        expect(q.tournamentYear).toBe(2014);
      }
    }
  });

  it('avoids ids already in seenIds when possible', () => {
    const seen: string[] = [];
    const rng = createRng(99);
    for (let i = 0; i < 8; i++) {
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: 1,
        tournamentFilter: 2010,
        seenIds: seen,
        rng,
      });
      expect(seen).not.toContain(q.id);
      seen.push(q.id);
    }
  });

  it('selects from the sequential tournament for maratón', () => {
    const q0 = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'sequential', sequenceIndex: 0, rng: createRng(3) });
    if (q0.tournamentYear !== undefined && !q0.id.startsWith('not-champion')) {
      expect(q0.tournamentYear).toBe(1998);
    }
    const q6 = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'sequential', sequenceIndex: 6, rng: createRng(3) });
    if (q6.tournamentYear !== undefined && !q6.id.startsWith('not-champion')) {
      expect(q6.tournamentYear).toBe(2022);
    }
  });

  it('restricts generators when generatorIds is provided', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateQuestion({
        ...base,
        targetDifficulty: 3,
        tournamentFilter: 'all',
        generatorIds: ['player-country', 'player-country-hard'],
        rng: createRng(i),
      });
      expect(q.id.startsWith('player-country')).toBe(true);
    }
  });
});
