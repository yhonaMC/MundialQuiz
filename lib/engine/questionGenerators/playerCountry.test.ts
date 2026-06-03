import { describe, it, expect } from 'vitest';
import { playerCountry, playerCountryHard } from '@/lib/engine/questionGenerators/playerCountry';
import { GENERATORS } from '@/lib/engine/questionGenerators';
import { TOURNAMENTS, getTournament } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';
import { PLAYERS } from '@/lib/db/players';

// confederación por país, derivada de la DB (para verificar distractores)
const CONF_BY_COUNTRY = new Map(PLAYERS.map((p) => [p.paisEs, p.confederacion]));
const COUNTRIES_PER_CONF = new Map<string, Set<string>>();
for (const p of PLAYERS) {
  if (!COUNTRIES_PER_CONF.has(p.confederacion)) COUNTRIES_PER_CONF.set(p.confederacion, new Set());
  COUNTRIES_PER_CONF.get(p.confederacion)!.add(p.paisEs);
}

function playerFromId(qid: string) {
  const pid = qid.split(':')[1];
  return PLAYERS.find((p) => p.id === pid)!;
}

describe('playerCountry generators', () => {
  it('are registered in GENERATORS', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(ids).toContain('player-country');
    expect(ids).toContain('player-country-hard');
  });

  it('produce a valid question for every tournament', () => {
    const rng = createRng(7);
    for (const gen of [playerCountry, playerCountryHard]) {
      for (const t of TOURNAMENTS) {
        const q = gen.build(t, TOURNAMENTS, rng);
        expect(q.format).toBe('multiple-choice');
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        expect(q.prompt).toContain('selección');
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('the correct answer is the player country (player identified by question id)', () => {
    for (let seed = 0; seed < 10; seed++) {
      const q = playerCountry.build(getTournament(2022)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      expect(player).toBeDefined();
      expect(q.options![q.answerIndex!]).toBe(player.paisEs);
      expect(q.prompt).toContain(player.nombre);
    }
  });

  it('distractors come from the same confederation when it has enough countries', () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = playerCountry.build(getTournament(2018)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      const confCountries = COUNTRIES_PER_CONF.get(player.confederacion)!;
      if (confCountries.size >= 4) {
        for (const opt of q.options!) {
          expect(CONF_BY_COUNTRY.get(opt)).toBe(player.confederacion);
        }
      }
    }
  });

  it('respects the tournament filter (player played that World Cup)', () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = playerCountry.build(getTournament(2014)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      expect(player.mundiales).toContain(2014);
      expect(q.tournamentYear).toBe(2014);
    }
  });

  it('famous and hard populations target different players', () => {
    const famous = playerFromId(playerCountry.build(getTournament(2022)!, TOURNAMENTS, createRng(1)).id);
    expect(famous.campeon || famous.mundiales.length >= 3).toBe(true);
    const hard = playerFromId(playerCountryHard.build(getTournament(2022)!, TOURNAMENTS, createRng(1)).id);
    expect(hard.campeon).toBe(false);
    expect(hard.mundiales.length).toBeLessThan(3);
  });
});
