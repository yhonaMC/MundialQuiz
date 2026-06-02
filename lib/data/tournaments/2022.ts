import type { Tournament } from '@/lib/data/types';

export const CATAR_2022: Tournament = {
  year: 2022,
  hosts: ['Catar'],
  champion: 'Argentina',
  runnerUp: 'Francia',
  third: 'Croacia',
  fourth: 'Marruecos',
  finalScore: '3-3 (4-2 pen)',
  finalVenue: 'Estadio de Lusail',
  goldenBoot: { player: 'Kylian Mbappé', goals: 8 },
  goldenBall: 'Lionel Messi',
  mascot: "La'eeb",
  numTeams: 32,
  totalGoals: 172,
  notableTeams: ['Argentina', 'Francia', 'Croacia', 'Marruecos', 'Brasil', 'Países Bajos', 'Portugal', 'Inglaterra'],
  notableMatches: [
    { stage: 'Final', teamA: 'Argentina', teamB: 'Francia', score: '3-3 (4-2 pen)', note: 'Triplete de Mbappé; Argentina campeón en penales.' },
    { stage: 'Semifinal', teamA: 'Argentina', teamB: 'Croacia', score: '3-0' },
  ],
};
