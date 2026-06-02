import type { Tournament } from '@/lib/data/types';

export const FRANCIA_1998: Tournament = {
  year: 1998,
  hosts: ['Francia'],
  champion: 'Francia',
  runnerUp: 'Brasil',
  third: 'Croacia',
  fourth: 'Países Bajos',
  finalScore: '3-0',
  finalVenue: 'Stade de France, Saint-Denis',
  goldenBoot: { player: 'Davor Šuker', goals: 6 },
  goldenBall: 'Ronaldo',
  mascot: 'Footix',
  numTeams: 32,
  totalGoals: 171,
  notableTeams: ['Francia', 'Brasil', 'Croacia', 'Países Bajos', 'Italia', 'Alemania', 'Argentina', 'Dinamarca'],
  notableMatches: [
    { stage: 'Final', teamA: 'Francia', teamB: 'Brasil', score: '3-0', note: 'Doblete de Zidane.' },
    { stage: 'Semifinal', teamA: 'Francia', teamB: 'Croacia', score: '2-1', note: 'Doblete de Lilian Thuram.' },
  ],
};
