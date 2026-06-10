export interface Stats {
  gamesPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
}

// Estado del Diario de la Rejilla guardado al terminar la partida de hoy.
export interface RejillaDiario {
  fecha: string; // dateKey (YYYY-MM-DD)
  respuestas: ({ id: string; ok: boolean } | null)[]; // 9 celdas; null = no resuelta
  puntos: number;
}

export interface RejillaStats {
  mejorPuntaje: number;
  partidasJugadas: number;
  mejorLlenado: number; // máx. celdas resueltas en una partida (0..9)
  rachaDiaria: number; // días consecutivos jugando el Diario
  ultimoDiaJugado: string | null; // dateKey del último Diario jugado
  diario: RejillaDiario | null; // resultado del Diario de hoy (si ya se jugó)
}

export interface SaveData {
  totalPoints: number;
  highScores: Record<string, number>;
  bestStreak: number;
  seenIds: string[];
  stats: Stats;
  // Récord de Penales por nivel ('facil' | 'normal' | 'dificil').
  penales: Record<string, { ganados: number; perdidos: number }>;
  // Récords y estado del Diario de la Rejilla Mundialera.
  rejilla: RejillaStats;
}

export function defaultRejillaStats(): RejillaStats {
  return { mejorPuntaje: 0, partidasJugadas: 0, mejorLlenado: 0, rachaDiaria: 0, ultimoDiaJugado: null, diario: null };
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
    penales: {},
    rejilla: defaultRejillaStats(),
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
    return {
      ...defaultSaveData(),
      ...parsed,
      stats: { ...defaultSaveData().stats, ...parsed.stats },
      penales: parsed.penales ?? {},
      rejilla: { ...defaultRejillaStats(), ...parsed.rejilla },
    };
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

export function recordPenales(nivel: string, won: boolean, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const current = data.penales[nivel] ?? { ganados: 0, perdidos: 0 };
  const next: SaveData = {
    ...data,
    penales: {
      ...data.penales,
      [nivel]: {
        ganados: current.ganados + (won ? 1 : 0),
        perdidos: current.perdidos + (won ? 0 : 1),
      },
    },
  };
  saveData(next, storage);
  return next;
}

// Diferencia en días entre dos claves "YYYY-MM-DD" (b - a). Determinista (Date.UTC).
function diffDias(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function conAgregados(r: RejillaStats, puntos: number, celdas: number): RejillaStats {
  return {
    ...r,
    mejorPuntaje: Math.max(r.mejorPuntaje, puntos),
    partidasJugadas: r.partidasJugadas + 1,
    mejorLlenado: Math.max(r.mejorLlenado, celdas),
  };
}

// Registra una partida de Práctica (solo récords agregados).
export function recordRejilla(puntos: number, celdasResueltas: number, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const next: SaveData = { ...data, rejilla: conAgregados(data.rejilla, puntos, celdasResueltas) };
  saveData(next, storage);
  return next;
}

// Registra el Diario: guarda el tablero de hoy, actualiza récords y la racha de días.
// Idempotente: re-guardar el mismo día no vuelve a contar la partida ni la racha.
export function recordRejillaDiario(
  diario: RejillaDiario,
  celdasResueltas: number,
  storage?: StorageLike,
): SaveData {
  const data = loadData(storage);
  const prev = data.rejilla;
  const yaJugadoHoy = prev.ultimoDiaJugado === diario.fecha;

  let racha = prev.rachaDiaria;
  if (yaJugadoHoy) {
    /* idempotente: mantener racha */
  } else if (prev.ultimoDiaJugado && diffDias(prev.ultimoDiaJugado, diario.fecha) === 1) {
    racha = prev.rachaDiaria + 1;
  } else {
    racha = 1;
  }

  const base = yaJugadoHoy ? prev : conAgregados(prev, diario.puntos, celdasResueltas);
  const rejilla: RejillaStats = { ...base, diario, ultimoDiaJugado: diario.fecha, rachaDiaria: racha };
  const next: SaveData = { ...data, rejilla };
  saveData(next, storage);
  return next;
}
