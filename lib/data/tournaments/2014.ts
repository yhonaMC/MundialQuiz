import type { Tournament } from '@/lib/data/types';

export const BRASIL_2014: Tournament = {
  year: 2014,
  hosts: ['Brasil'],
  champion: 'Alemania',
  runnerUp: 'Argentina',
  third: 'Países Bajos',
  fourth: 'Brasil',
  finalScore: '1-0 (pr)',
  finalVenue: 'Estadio Maracaná, Río de Janeiro',
  goldenBoot: { player: 'James Rodríguez', goals: 6 },
  goldenBall: 'Lionel Messi',
  mascot: 'Fuleco',
  numTeams: 32,
  totalGoals: 171,
  notableTeams: ['Alemania', 'Argentina', 'Países Bajos', 'Brasil', 'Francia', 'Colombia', 'Bélgica', 'Costa Rica'],
  notableMatches: [
    { stage: 'Final', teamA: 'Alemania', teamB: 'Argentina', score: '1-0 (pr)', note: 'Gol de Mario Götze en la prórroga.' },
    { stage: 'Semifinal', teamA: 'Alemania', teamB: 'Brasil', score: '7-1', note: 'El histórico "Mineirazo".' },
  ],
};
