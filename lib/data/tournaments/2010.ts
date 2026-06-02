import type { Tournament } from '@/lib/data/types';

export const SUDAFRICA_2010: Tournament = {
  year: 2010,
  hosts: ['Sudáfrica'],
  champion: 'España',
  runnerUp: 'Países Bajos',
  third: 'Alemania',
  fourth: 'Uruguay',
  finalScore: '1-0 (pr)',
  finalVenue: 'Soccer City, Johannesburgo',
  goldenBoot: { player: 'Thomas Müller', goals: 5 },
  goldenBall: 'Diego Forlán',
  mascot: 'Zakumi',
  numTeams: 32,
  totalGoals: 145,
  notableTeams: ['España', 'Países Bajos', 'Alemania', 'Uruguay', 'Brasil', 'Argentina', 'Ghana', 'Paraguay'],
  notableMatches: [
    { stage: 'Final', teamA: 'España', teamB: 'Países Bajos', score: '1-0 (pr)', note: 'Gol de Andrés Iniesta en la prórroga.' },
    { stage: 'Cuartos de final', teamA: 'Uruguay', teamB: 'Ghana', score: '1-1 (4-2 pen)', note: 'Mano de Luis Suárez en la línea.' },
  ],
};
