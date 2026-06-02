import { describe, it, expect } from 'vitest';
import type { Tournament, Question, QuestionFormat } from '@/lib/data/types';

describe('types', () => {
  it('a Tournament object satisfies the interface', () => {
    const t: Tournament = {
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
      notableTeams: ['España', 'Países Bajos', 'Alemania', 'Uruguay'],
      notableMatches: [
        { stage: 'Final', teamA: 'España', teamB: 'Países Bajos', score: '1-0 (pr)' },
      ],
    };
    expect(t.year).toBe(2010);
  });

  it('a Question object satisfies the interface', () => {
    const formats: QuestionFormat[] = ['multiple-choice', 'true-false', 'number', 'odd-one-out'];
    const q: Question = {
      id: 'champion:2010',
      format: 'multiple-choice',
      prompt: '¿Quién ganó el Mundial 2010?',
      options: ['España', 'Países Bajos', 'Alemania', 'Brasil'],
      answerIndex: 0,
      difficulty: 1,
      tournamentYear: 2010,
      explanation: 'España ganó su primer Mundial en 2010.',
      tags: ['campeón'],
    };
    expect(formats).toContain(q.format);
  });
});
