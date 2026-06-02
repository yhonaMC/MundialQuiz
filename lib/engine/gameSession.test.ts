import { describe, it, expect } from 'vitest';
import { sessionReducer, initialSessionState, type SessionState } from '@/lib/engine/gameSession';
import type { Question } from '@/lib/data/types';

const q = (id: string): Question => ({
  id,
  format: 'multiple-choice',
  prompt: 'p',
  options: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  difficulty: 2,
  explanation: 'e',
  tags: [],
});

function start(overrides: Partial<{ lives: number | null; timeRemaining: number | null }> = {}): SessionState {
  return sessionReducer(initialSessionState, {
    type: 'START',
    question: q('q1'),
    difficulty: 2,
    lives: overrides.lives ?? null,
    timeRemaining: overrides.timeRemaining ?? null,
  });
}

describe('sessionReducer', () => {
  it('START puts the session into the question state', () => {
    const s = start();
    expect(s.status).toBe('question');
    expect(s.currentQuestion?.id).toBe('q1');
    expect(s.questionNumber).toBe(1);
    expect(s.score).toBe(0);
  });

  it('ANSWER correct increases score and streak, then shows feedback', () => {
    let s = start();
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 100 });
    expect(s.status).toBe('feedback');
    expect(s.score).toBe(100);
    expect(s.streak).toBe(1);
    expect(s.lastPointsEarned).toBe(100);
    expect(s.history).toHaveLength(1);
  });

  it('ANSWER wrong resets streak and costs a life', () => {
    let s = start({ lives: 3 });
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 100 });
    s = sessionReducer(s, { type: 'NEXT', question: q('q2'), difficulty: 2 });
    s = sessionReducer(s, { type: 'ANSWER', correct: false, points: 0 });
    expect(s.streak).toBe(0);
    expect(s.lives).toBe(2);
    expect(s.status).toBe('feedback');
  });

  it('reaching 0 lives ends the game', () => {
    let s = start({ lives: 1 });
    s = sessionReducer(s, { type: 'ANSWER', correct: false, points: 0 });
    expect(s.lives).toBe(0);
    expect(s.status).toBe('gameover');
  });

  it('NEXT advances to a new question and increments the counter', () => {
    let s = start();
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 50 });
    s = sessionReducer(s, { type: 'NEXT', question: q('q2'), difficulty: 3 });
    expect(s.status).toBe('question');
    expect(s.currentQuestion?.id).toBe('q2');
    expect(s.questionNumber).toBe(2);
    expect(s.difficulty).toBe(3);
  });

  it('TICK decrements the timer and ends at zero', () => {
    let s = start({ timeRemaining: 2 });
    s = sessionReducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(1);
    s = sessionReducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(0);
    expect(s.status).toBe('gameover');
  });

  it('CASH_OUT ends the game and flags cashedOut', () => {
    let s = start();
    s = sessionReducer(s, { type: 'CASH_OUT' });
    expect(s.status).toBe('gameover');
    expect(s.cashedOut).toBe(true);
  });

  it('keeps only the last 5 recent results', () => {
    let s = start();
    for (let i = 0; i < 7; i++) {
      s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 10 });
      s = sessionReducer(s, { type: 'NEXT', question: q(`x${i}`), difficulty: 2 });
    }
    expect(s.recentResults.length).toBeLessThanOrEqual(5);
  });
});
