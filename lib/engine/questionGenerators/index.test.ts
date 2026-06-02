import { describe, it, expect } from 'vitest';
import { GENERATORS } from '@/lib/engine/questionGenerators';
import { TOURNAMENTS, getTournament } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';
import type { Question } from '@/lib/data/types';

function assertValidQuestion(q: Question) {
  expect(q.id.length).toBeGreaterThan(0);
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
  expect(q.difficulty).toBeGreaterThanOrEqual(1);
  expect(q.difficulty).toBeLessThanOrEqual(5);

  if (q.format === 'multiple-choice' || q.format === 'odd-one-out') {
    expect(q.options).toBeDefined();
    expect(q.options!.length).toBe(4);
    expect(new Set(q.options).size).toBe(4); // opciones únicas
    expect(q.answerIndex).toBeGreaterThanOrEqual(0);
    expect(q.answerIndex).toBeLessThan(4);
  }
  if (q.format === 'true-false') {
    expect(q.options).toEqual(['Verdadero', 'Falso']);
    expect([0, 1]).toContain(q.answerIndex);
  }
  if (q.format === 'number') {
    expect(typeof q.numericAnswer).toBe('number');
    expect(q.tolerance).toBeGreaterThan(0);
  }
}

describe('GENERATORS', () => {
  it('every generator produces a valid question for every tournament', () => {
    const rng = createRng(123);
    for (const gen of GENERATORS) {
      for (const t of TOURNAMENTS) {
        const q = gen.build(t, TOURNAMENTS, rng);
        assertValidQuestion(q);
      }
    }
  });

  it('covers all four formats across the generator set', () => {
    const formats = new Set(GENERATORS.flatMap((g) => g.formats));
    expect(formats).toContain('multiple-choice');
    expect(formats).toContain('true-false');
    expect(formats).toContain('number');
    expect(formats).toContain('odd-one-out');
  });

  it('the champion generator marks the correct answer', () => {
    const gen = GENERATORS.find((g) => g.id === 'champion')!;
    const t = getTournament(2010)!;
    const q = gen.build(t, TOURNAMENTS, createRng(5));
    expect(q.options![q.answerIndex!]).toBe('España');
  });

  it('generator ids are unique', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
