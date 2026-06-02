export type QuestionFormat =
  | 'multiple-choice'
  | 'true-false'
  | 'number'
  | 'odd-one-out';

export interface NotableMatch {
  stage: string;        // "Final", "Semifinal", "Cuartos de final", ...
  teamA: string;
  teamB: string;
  score: string;        // p.ej. "1-0", "3-3 (4-2 pen)"
  note?: string;        // dato curioso opcional
}

export interface Tournament {
  year: number;                 // 1998..2022
  hosts: string[];              // país(es) sede
  champion: string;
  runnerUp: string;
  third: string;
  fourth: string;
  finalScore: string;           // p.ej. "1-0 (pr)" = prórroga; "3-3 (4-2 pen)"
  finalVenue: string;
  goldenBoot: { player: string; goals: number };
  goldenBall: string;
  mascot: string;
  numTeams: number;
  totalGoals: number;
  notableTeams: string[];       // los 8 cuartofinalistas
  notableMatches: NotableMatch[];
}

export interface Question {
  id: string;                   // determinista; usado para no repetir
  format: QuestionFormat;
  prompt: string;
  options?: string[];           // multiple-choice / true-false / odd-one-out
  answerIndex?: number;         // índice de la opción correcta
  numericAnswer?: number;       // number
  tolerance?: number;           // number: margen para puntaje parcial
  difficulty: number;           // 1..5
  tournamentYear?: number;
  explanation: string;
  tags: string[];
}
