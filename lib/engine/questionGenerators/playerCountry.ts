import type { Question, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import type { Player } from '@/lib/db/types';
import { PLAYERS } from '@/lib/db/players';
import { NATIONAL_TEAMS } from '@/lib/data/teams';
import { makeOptions, type Generator } from './core';

// Poblaciones (calculadas una vez por módulo):
// famosos = campeones del mundo o con 3+ mundiales; el resto va al generador difícil.
const VALID = PLAYERS.filter((p) => p.paisEs && p.paisEs.length > 0);
const FAMOUS = VALID.filter((p) => p.campeon || p.mundiales.length >= 3);
const REST = VALID.filter((p) => !p.campeon && p.mundiales.length < 3);

// Países por confederación, derivados de la propia DB.
const COUNTRIES_BY_CONF: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const p of VALID) {
    (map[p.confederacion] ??= new Set()).add(p.paisEs);
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
})();

// Distractores: misma confederación; si no alcanza para 3 (p. ej. OFC),
// se completa con el pool global de selecciones.
function distractorPool(player: Player): string[] {
  const sameConf = (COUNTRIES_BY_CONF[player.confederacion] ?? []).filter((c) => c !== player.paisEs);
  if (sameConf.length >= 3) return sameConf;
  return [...sameConf, ...NATIONAL_TEAMS.filter((c) => c !== player.paisEs && !sameConf.includes(c))];
}

function buildFor(population: Player[], idPrefix: string, difficulty: number) {
  return (t: Tournament, _all: Tournament[], rng: Rng): Question => {
    // Respeta el filtro de torneo: jugadores que disputaron ese mundial.
    // Si la población no tiene ninguno de ese año, usa la población completa.
    const ofYear = population.filter((p) => p.mundiales.includes(t.year));
    const candidates = ofYear.length > 0 ? ofYear : population;
    const player = rng.pick(candidates);
    const { options, answerIndex } = makeOptions(player.paisEs, distractorPool(player), rng);
    return {
      id: `${idPrefix}:${player.id}`,
      format: 'multiple-choice',
      prompt: `¿Para qué selección jugó ${player.nombre} en los Mundiales?`,
      options,
      answerIndex,
      difficulty,
      tournamentYear: t.year,
      explanation: `${player.nombre} disputó ${player.mundiales.length} Mundial(es) con ${player.paisEs} (${player.mundiales.join(', ')}).`,
      tags: ['jugador', 'país'],
    };
  };
}

export const playerCountry: Generator = {
  id: 'player-country',
  difficulty: 2,
  formats: ['multiple-choice'],
  build: buildFor(FAMOUS, 'player-country', 2),
};

export const playerCountryHard: Generator = {
  id: 'player-country-hard',
  difficulty: 4,
  formats: ['multiple-choice'],
  build: buildFor(REST, 'player-country-hard', 4),
};
