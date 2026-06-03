import type { TournamentFilter } from '@/lib/engine/generateQuestion';

export type DifficultyCurve = 'fixed' | 'ascending' | 'adaptive';

export interface GameMode {
  id: string;
  name: string;
  icon: string;                  // clave semántica de icono (ver components/ui/ModeIcon)
  description: string;
  tournamentFilter: TournamentFilter;
  difficultyCurve: DifficultyCurve;
  difficultyRange?: [number, number];
  timer?: { totalSeconds: number; bonusPerCorrect: number };
  lives?: number;
  questionCount: number | 'until-fail';
  allowCashOut?: boolean;
  scoring: { base: number; speedBonusMax: number; streakMultiplierStep: number };
}

const defaultScoring = { base: 100, speedBonusMax: 0, streakMultiplierStep: 0.1 };

export const MODES: GameMode[] = [
  {
    id: 'por-mundial',
    name: 'Por Mundial',
    icon: 'trophy',
    description: 'Elige una edición y responde solo preguntas de ese Mundial.',
    tournamentFilter: 'all',     // se sobrescribe en runtime con el año elegido
    difficultyCurve: 'adaptive',
    questionCount: 10,
    scoring: { ...defaultScoring },
  },
  {
    id: 'contrarreloj',
    name: 'Contrarreloj',
    icon: 'timer',
    description: '60 segundos para sumar todos los puntos que puedas. La velocidad da bonus.',
    tournamentFilter: 'all',
    difficultyCurve: 'adaptive',
    timer: { totalSeconds: 60, bonusPerCorrect: 3 },
    questionCount: 'until-fail',
    scoring: { base: 80, speedBonusMax: 120, streakMultiplierStep: 0.1 },
  },
  {
    id: 'supervivencia',
    name: 'Supervivencia',
    icon: 'heart',
    description: '3 vidas. La dificultad sube con cada acierto. ¿Cuánto aguantas?',
    tournamentFilter: 'all',
    difficultyCurve: 'ascending',
    lives: 3,
    questionCount: 'until-fail',
    scoring: { base: 120, speedBonusMax: 0, streakMultiplierStep: 0.15 },
  },
  {
    id: 'escalera',
    name: 'Escalera',
    icon: 'ladder',
    description: 'La dificultad sube y el multiplicador crece. Retírate con tus puntos… o arriésgalos.',
    tournamentFilter: 'all',
    difficultyCurve: 'ascending',
    questionCount: 'until-fail',
    allowCashOut: true,
    scoring: { base: 100, speedBonusMax: 0, streakMultiplierStep: 0.25 },
  },
  {
    id: 'maraton',
    name: 'Maratón Mundialista',
    icon: 'globe',
    description: 'Recorre 1998 → 2022 en una sola partida épica.',
    tournamentFilter: 'sequential',
    difficultyCurve: 'adaptive',
    questionCount: 21,           // 3 preguntas × 7 torneos
    scoring: { ...defaultScoring },
  },
  {
    id: 'experto',
    name: 'Modo Experto',
    icon: 'brain',
    description: 'Solo preguntas difíciles y multiplicadores altos. Para los que se las saben todas.',
    tournamentFilter: 'all',
    difficultyCurve: 'fixed',
    difficultyRange: [4, 5],
    questionCount: 10,
    scoring: { base: 150, speedBonusMax: 0, streakMultiplierStep: 0.2 },
  },
];

export function getMode(id: string): GameMode | undefined {
  return MODES.find((m) => m.id === id);
}
