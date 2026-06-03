import { describe, it, expect } from 'vitest';
import {
  loadData, saveData, recordGame, addSeenIds, defaultSaveData, recordPenales, type StorageLike,
} from '@/lib/storage/localStore';

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
  };
}

describe('localStore', () => {
  it('returns defaults when storage is empty', () => {
    const s = fakeStorage();
    expect(loadData(s)).toEqual(defaultSaveData());
  });

  it('round-trips saved data', () => {
    const s = fakeStorage();
    const data = { ...defaultSaveData(), totalPoints: 500, bestStreak: 7 };
    saveData(data, s);
    expect(loadData(s)).toEqual(data);
  });

  it('returns defaults if stored JSON is corrupt', () => {
    const s = fakeStorage();
    s.setItem('mundialquiz:v1', '{not valid json');
    expect(loadData(s)).toEqual(defaultSaveData());
  });

  it('recordGame accumulates points, high scores, streaks and stats', () => {
    const s = fakeStorage();
    recordGame({ modeId: 'contrarreloj', score: 300, bestStreak: 4, correct: 6, answered: 8 }, s);
    recordGame({ modeId: 'contrarreloj', score: 200, bestStreak: 9, correct: 3, answered: 5 }, s);
    const data = loadData(s);
    expect(data.totalPoints).toBe(500);
    expect(data.highScores.contrarreloj).toBe(300); // se queda el mayor
    expect(data.bestStreak).toBe(9);
    expect(data.stats.gamesPlayed).toBe(2);
    expect(data.stats.totalCorrect).toBe(9);
    expect(data.stats.totalAnswered).toBe(13);
  });

  it('addSeenIds keeps a bounded buffer', () => {
    const s = fakeStorage();
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`);
    addSeenIds(ids, 200, s);
    const data = loadData(s);
    expect(data.seenIds.length).toBe(200);
    // conserva los más recientes
    expect(data.seenIds).toContain('id249');
    expect(data.seenIds).not.toContain('id0');
  });

  it('recordPenales accumulates wins and losses per level', () => {
    const s = fakeStorage();
    recordPenales('normal', true, s);
    recordPenales('normal', true, s);
    recordPenales('normal', false, s);
    recordPenales('dificil', false, s);
    const data = loadData(s);
    expect(data.penales.normal).toEqual({ ganados: 2, perdidos: 1 });
    expect(data.penales.dificil).toEqual({ ganados: 0, perdidos: 1 });
    expect(data.penales.facil).toBeUndefined();
  });

  it('old saved data without penales loads with an empty record', () => {
    const s = fakeStorage();
    s.setItem('mundialquiz:v1', JSON.stringify({ totalPoints: 10 }));
    const data = loadData(s);
    expect(data.penales).toEqual({});
    expect(data.totalPoints).toBe(10);
  });
});
