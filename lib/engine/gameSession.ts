import type { Question } from '@/lib/data/types';

export type SessionStatus = 'idle' | 'question' | 'feedback' | 'gameover';

export interface AnswerRecord {
  question: Question;
  correct: boolean;
  pointsEarned: number;
}

export interface SessionState {
  status: SessionStatus;
  questionNumber: number;          // 1-based: cuántas preguntas se han mostrado
  score: number;
  streak: number;
  lives: number | null;            // null = sin sistema de vidas
  timeRemaining: number | null;    // null = sin reloj
  difficulty: number;
  currentQuestion: Question | null;
  recentResults: boolean[];        // últimas 5 respuestas (para dificultad adaptativa)
  lastPointsEarned: number;
  history: AnswerRecord[];
  cashedOut: boolean;
}

export type SessionAction =
  | { type: 'START'; question: Question; difficulty: number; lives: number | null; timeRemaining: number | null }
  | { type: 'ANSWER'; correct: boolean; points: number }
  | { type: 'NEXT'; question: Question; difficulty: number }
  | { type: 'TICK' }
  | { type: 'CASH_OUT' }
  | { type: 'END' };

const RECENT_LIMIT = 5;

export const initialSessionState: SessionState = {
  status: 'idle',
  questionNumber: 0,
  score: 0,
  streak: 0,
  lives: null,
  timeRemaining: null,
  difficulty: 1,
  currentQuestion: null,
  recentResults: [],
  lastPointsEarned: 0,
  history: [],
  cashedOut: false,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      return {
        ...initialSessionState,
        status: 'question',
        questionNumber: 1,
        difficulty: action.difficulty,
        lives: action.lives,
        timeRemaining: action.timeRemaining,
        currentQuestion: action.question,
      };

    case 'ANSWER': {
      if (state.status !== 'question' || !state.currentQuestion) return state;
      const recentResults = [...state.recentResults, action.correct].slice(-RECENT_LIMIT);
      const lives = state.lives != null && !action.correct ? state.lives - 1 : state.lives;
      const history: AnswerRecord[] = [
        ...state.history,
        { question: state.currentQuestion, correct: action.correct, pointsEarned: action.points },
      ];
      const dead = lives != null && lives <= 0;
      return {
        ...state,
        status: dead ? 'gameover' : 'feedback',
        score: state.score + action.points,
        streak: action.correct ? state.streak + 1 : 0,
        lives,
        recentResults,
        lastPointsEarned: action.points,
        history,
      };
    }

    case 'NEXT':
      if (state.status === 'gameover') return state;
      return {
        ...state,
        status: 'question',
        questionNumber: state.questionNumber + 1,
        difficulty: action.difficulty,
        currentQuestion: action.question,
      };

    case 'TICK': {
      if (state.timeRemaining == null) return state;
      const timeRemaining = state.timeRemaining - 1;
      return {
        ...state,
        timeRemaining: Math.max(0, timeRemaining),
        status: timeRemaining <= 0 ? 'gameover' : state.status,
      };
    }

    case 'CASH_OUT':
      return { ...state, status: 'gameover', cashedOut: true };

    case 'END':
      return { ...state, status: 'gameover' };

    default:
      return state;
  }
}
