import type { Tournament } from '@/lib/data/types';

export const RUSIA_2018: Tournament = {
  year: 2018,
  hosts: ['Rusia'],
  champion: 'Francia',
  runnerUp: 'Croacia',
  third: 'Bélgica',
  fourth: 'Inglaterra',
  finalScore: '4-2',
  finalVenue: 'Estadio Luzhnikí, Moscú',
  goldenBoot: { player: 'Harry Kane', goals: 6 },
  goldenBall: 'Luka Modrić',
  mascot: 'Zabivaka',
  numTeams: 32,
  totalGoals: 169,
  notableTeams: ['Francia', 'Croacia', 'Bélgica', 'Inglaterra', 'Uruguay', 'Brasil', 'Rusia', 'Suecia'],
  notableMatches: [
    { stage: 'Final', teamA: 'Francia', teamB: 'Croacia', score: '4-2' },
    { stage: 'Semifinal', teamA: 'Croacia', teamB: 'Inglaterra', score: '2-1 (pr)' },
  ],
};
