import { describe, it, expect } from 'vitest';
import { createRng, hashSeed } from '@/lib/engine/rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('next() returns values in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns an integer in [0, n)', () => {
    const r = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = r.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick returns an element of the array', () => {
    const r = createRng(1);
    const arr = ['a', 'b', 'c'];
    expect(arr).toContain(r.pick(arr));
  });

  it('sample returns n unique elements', () => {
    const r = createRng(2);
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const out = r.sample(arr, 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    for (const x of out) expect(arr).toContain(x);
  });

  it('shuffle keeps the same elements', () => {
    const r = createRng(9);
    const arr = [1, 2, 3, 4, 5];
    const out = r.shuffle(arr);
    expect([...out].sort()).toEqual([...arr].sort());
  });

  it('hashSeed maps strings to stable numbers', () => {
    expect(hashSeed('2026-06-02')).toBe(hashSeed('2026-06-02'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
