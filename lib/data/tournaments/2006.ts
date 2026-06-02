import type { Tournament } from '@/lib/data/types';

export const ALEMANIA_2006: Tournament = {
  year: 2006,
  hosts: ['Alemania'],
  champion: 'Italia',
  runnerUp: 'Francia',
  third: 'Alemania',
  fourth: 'Portugal',
  finalScore: '1-1 (5-3 pen)',
  finalVenue: 'Olympiastadion, Berlín',
  goldenBoot: { player: 'Miroslav Klose', goals: 5 },
  goldenBall: 'Zinedine Zidane',
  mascot: 'Goleo VI',
  numTeams: 32,
  totalGoals: 147,
  notableTeams: ['Italia', 'Francia', 'Alemania', 'Portugal', 'Brasil', 'Argentina', 'Inglaterra', 'Ucrania'],
  notableMatches: [
    { stage: 'Final', teamA: 'Italia', teamB: 'Francia', score: '1-1 (5-3 pen)', note: 'Cabezazo de Zidane a Materazzi y expulsión.' },
    { stage: 'Semifinal', teamA: 'Italia', teamB: 'Alemania', score: '2-0 (pr)' },
  ],
};
