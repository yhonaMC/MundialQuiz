import { NATIONAL_TEAMS } from '@/lib/data/teams';
import { makeOptions, type Generator } from './core';
import { playerCountry, playerCountryHard } from './playerCountry';

export type { Generator } from './core';

const champion: Generator = {
  id: 'champion',
  difficulty: 1,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.champion).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(t.champion, pool, rng);
    return {
      id: `champion:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué selección fue campeona del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 1,
      tournamentYear: t.year,
      explanation: `${t.champion} fue campeón del Mundial ${t.year} (sede: ${t.hosts.join(' y ')}).`,
      tags: ['campeón'],
    };
  },
};

const runnerUp: Generator = {
  id: 'runner-up',
  difficulty: 2,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.flatMap((x) => [x.runnerUp, x.champion]).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(t.runnerUp, pool, rng);
    return {
      id: `runner-up:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué selección fue subcampeona (finalista perdedora) del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 2,
      tournamentYear: t.year,
      explanation: `${t.runnerUp} perdió la final del Mundial ${t.year} ante ${t.champion} (${t.finalScore}).`,
      tags: ['subcampeón', 'final'],
    };
  },
};

const host: Generator = {
  id: 'host',
  difficulty: 2,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const correct = t.hosts[0];
    const pool = all.flatMap((x) => x.hosts).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(correct, pool, rng);
    return {
      id: `host:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué país fue (co)sede del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 2,
      tournamentYear: t.year,
      explanation: `El Mundial ${t.year} se jugó en ${t.hosts.join(' y ')}.`,
      tags: ['sede'],
    };
  },
};

const goldenBoot: Generator = {
  id: 'golden-boot',
  difficulty: 3,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const correct = t.goldenBoot.player;
    const pool = all.map((x) => x.goldenBoot.player).concat(all.map((x) => x.goldenBall));
    const { options, answerIndex } = makeOptions(correct, pool, rng);
    return {
      id: `golden-boot:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Quién ganó la Bota de Oro (máximo goleador) del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${correct} fue el máximo goleador del Mundial ${t.year} con ${t.goldenBoot.goals} goles.`,
      tags: ['goleador', 'bota de oro'],
    };
  },
};

const goldenBootGoals: Generator = {
  id: 'golden-boot-goals',
  difficulty: 3,
  formats: ['number'],
  build(t) {
    return {
      id: `golden-boot-goals:${t.year}`,
      format: 'number',
      prompt: `¿Cuántos goles marcó ${t.goldenBoot.player} para ganar la Bota de Oro del Mundial ${t.year}?`,
      numericAnswer: t.goldenBoot.goals,
      tolerance: 2,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${t.goldenBoot.player} marcó ${t.goldenBoot.goals} goles en el Mundial ${t.year}.`,
      tags: ['goleador', 'número'],
    };
  },
};

const mascot: Generator = {
  id: 'mascot',
  difficulty: 4,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.mascot);
    const { options, answerIndex } = makeOptions(t.mascot, pool, rng);
    return {
      id: `mascot:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Cuál fue la mascota oficial del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 4,
      tournamentYear: t.year,
      explanation: `La mascota del Mundial ${t.year} fue ${t.mascot}.`,
      tags: ['mascota'],
    };
  },
};

const finalScore: Generator = {
  id: 'final-score',
  difficulty: 3,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.finalScore);
    const { options, answerIndex } = makeOptions(t.finalScore, pool, rng);
    return {
      id: `final-score:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Cuál fue el marcador de la final del Mundial ${t.year} (${t.champion} vs ${t.runnerUp})?`,
      options,
      answerIndex,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `La final del Mundial ${t.year} terminó ${t.finalScore} a favor de ${t.champion}.`,
      tags: ['final', 'marcador'],
    };
  },
};

const wasChampion: Generator = {
  id: 'was-champion',
  difficulty: 1,
  formats: ['true-false'],
  build(t, all, rng) {
    // 50% afirmación verdadera, 50% falsa.
    const asksTruth = rng.next() < 0.5;
    const team = asksTruth
      ? t.champion
      : rng.pick(NATIONAL_TEAMS.filter((x) => x !== t.champion));
    const isTrue = team === t.champion;
    return {
      id: `was-champion:${t.year}:${team}`,
      format: 'true-false',
      prompt: `Verdadero o Falso: ${team} fue campeón del Mundial ${t.year}.`,
      options: ['Verdadero', 'Falso'],
      answerIndex: isTrue ? 0 : 1,
      difficulty: 1,
      tournamentYear: t.year,
      explanation: `El campeón del Mundial ${t.year} fue ${t.champion}.`,
      tags: ['campeón', 'verdadero-falso'],
    };
  },
};

const notChampion: Generator = {
  id: 'not-champion',
  difficulty: 3,
  formats: ['odd-one-out'],
  build(t, all, rng) {
    // 3 campeones reales + 1 selección que NO fue campeona en este set.
    const champions = Array.from(new Set(all.map((x) => x.champion)));
    const threeChampions = rng.sample(champions, 3);
    const nonChampion = rng.pick(
      NATIONAL_TEAMS.filter((x) => !champions.includes(x)),
    );
    const options = rng.shuffle([...threeChampions, nonChampion]);
    return {
      id: `not-champion:${nonChampion}:${[...threeChampions].sort().join('-')}`,
      format: 'odd-one-out',
      prompt: 'Tres de estas selecciones fueron campeonas del mundo entre 1998 y 2022. ¿Cuál NO lo fue?',
      options,
      answerIndex: options.indexOf(nonChampion),
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${nonChampion} no ganó ningún Mundial entre 1998 y 2022. Campeones: ${champions.join(', ')}.`,
      tags: ['campeón', 'descarta'],
    };
  },
};

const totalGoals: Generator = {
  id: 'total-goals',
  difficulty: 5,
  formats: ['number'],
  build(t) {
    return {
      id: `total-goals:${t.year}`,
      format: 'number',
      prompt: `¿Cuántos goles se marcaron en total en el Mundial ${t.year}?`,
      numericAnswer: t.totalGoals,
      tolerance: 15,
      difficulty: 5,
      tournamentYear: t.year,
      explanation: `En el Mundial ${t.year} se marcaron ${t.totalGoals} goles en total.`,
      tags: ['goles', 'número'],
    };
  },
};

export const GENERATORS: Generator[] = [
  champion,
  runnerUp,
  host,
  goldenBoot,
  goldenBootGoals,
  mascot,
  finalScore,
  wasChampion,
  notChampion,
  totalGoals,
  playerCountry,
  playerCountryHard,
];
