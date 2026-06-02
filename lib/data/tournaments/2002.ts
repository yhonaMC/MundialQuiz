import type { Tournament } from '@/lib/data/types';

export const COREAJAPON_2002: Tournament = {
  year: 2002,
  hosts: ['Corea del Sur', 'Japón'],
  champion: 'Brasil',
  runnerUp: 'Alemania',
  third: 'Turquía',
  fourth: 'Corea del Sur',
  finalScore: '2-0',
  finalVenue: 'Estadio Internacional de Yokohama',
  goldenBoot: { player: 'Ronaldo', goals: 8 },
  goldenBall: 'Oliver Kahn',
  mascot: 'Ato, Kaz y Nik (The Spheriks)',
  numTeams: 32,
  totalGoals: 161,
  notableTeams: ['Brasil', 'Alemania', 'Turquía', 'Corea del Sur', 'España', 'Inglaterra', 'Estados Unidos', 'Senegal'],
  notableMatches: [
    { stage: 'Final', teamA: 'Brasil', teamB: 'Alemania', score: '2-0', note: 'Doblete de Ronaldo.' },
    { stage: 'Semifinal', teamA: 'Brasil', teamB: 'Turquía', score: '1-0' },
  ],
};
