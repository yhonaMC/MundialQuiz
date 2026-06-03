import type { Question, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import { GENERATORS, type Generator } from '@/lib/engine/questionGenerators';

export type TournamentFilter = number | 'all' | 'sequential';

export interface SelectOptions {
  tournaments: Tournament[];
  targetDifficulty: number;          // 1..5
  tournamentFilter: TournamentFilter;
  sequenceIndex?: number;            // requerido si filter === 'sequential'
  seenIds: string[];
  generatorIds?: string[];           // restringe los generadores elegibles (por id)
  rng: Rng;
}

const MAX_ATTEMPTS = 25;

function candidateTournaments(opts: SelectOptions): Tournament[] {
  const { tournaments, tournamentFilter, sequenceIndex } = opts;
  if (tournamentFilter === 'all') return tournaments;
  if (tournamentFilter === 'sequential') {
    const idx = Math.min(sequenceIndex ?? 0, tournaments.length - 1);
    return [tournaments[idx]];
  }
  const one = tournaments.find((t) => t.year === tournamentFilter);
  return one ? [one] : tournaments;
}

function generatorsForDifficulty(target: number, allowedIds?: string[]): Generator[] {
  const pool = allowedIds && allowedIds.length > 0
    ? GENERATORS.filter((g) => allowedIds.includes(g.id))
    : GENERATORS;
  // Ventana de ±1; si vacía, se ensancha progresivamente.
  for (let window = 1; window <= 5; window++) {
    const matches = pool.filter((g) => Math.abs(g.difficulty - target) <= window);
    if (matches.length > 0) return matches;
  }
  return pool.length > 0 ? pool : GENERATORS;
}

export function generateQuestion(opts: SelectOptions): Question {
  const { rng, seenIds } = opts;
  const tournaments = candidateTournaments(opts);
  const generators = generatorsForDifficulty(opts.targetDifficulty, opts.generatorIds);
  const seen = new Set(seenIds);

  let fallback: Question | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const gen = rng.pick(generators);
    const t = rng.pick(tournaments);
    const q = gen.build(t, opts.tournaments, rng);
    if (!fallback) fallback = q;
    if (!seen.has(q.id)) return q;
  }
  // Todas las candidatas ya vistas: devolvemos la última generada igual.
  return fallback!;
}
