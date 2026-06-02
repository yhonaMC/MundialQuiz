export interface Stats {
  gamesPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
}

export interface SaveData {
  totalPoints: number;
  highScores: Record<string, number>;
  bestStreak: number;
  seenIds: string[];
  stats: Stats;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'mundialquiz:v1';

export function defaultSaveData(): SaveData {
  return {
    totalPoints: 0,
    highScores: {},
    bestStreak: 0,
    seenIds: [],
    stats: { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0 },
  };
}

// En SSR / entornos sin window, devuelve null para getItem.
function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      return (globalThis as unknown as { localStorage: StorageLike }).localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

export function loadData(storage?: StorageLike): SaveData {
  const s = resolveStorage(storage);
  if (!s) return defaultSaveData();
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return defaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSaveData(), ...parsed, stats: { ...defaultSaveData().stats, ...parsed.stats } };
  } catch {
    return defaultSaveData();
  }
}

export function saveData(data: SaveData, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno o no disponible: se ignora silenciosamente.
  }
}

export interface GameResult {
  modeId: string;
  score: number;
  bestStreak: number;
  correct: number;
  answered: number;
}

export function recordGame(result: GameResult, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const next: SaveData = {
    ...data,
    totalPoints: data.totalPoints + result.score,
    bestStreak: Math.max(data.bestStreak, result.bestStreak),
    highScores: {
      ...data.highScores,
      [result.modeId]: Math.max(data.highScores[result.modeId] ?? 0, result.score),
    },
    stats: {
      gamesPlayed: data.stats.gamesPlayed + 1,
      totalCorrect: data.stats.totalCorrect + result.correct,
      totalAnswered: data.stats.totalAnswered + result.answered,
    },
  };
  saveData(next, storage);
  return next;
}

export function addSeenIds(ids: string[], max = 200, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const merged = [...data.seenIds, ...ids].slice(-max);
  const next = { ...data, seenIds: merged };
  saveData(next, storage);
  return next;
}
