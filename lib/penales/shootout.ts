// Máquina de estados pura de una tanda de penales al mejor de 5 contra la IA.
// El jugador siempre tira primero en cada ronda. No genera preguntas ni usa RNG:
// el hook contenedor inyecta el resultado de cada tiro.

export type ShootoutPhase = 'idle' | 'question' | 'player-feedback' | 'ai-feedback' | 'gameover';
export type Winner = 'player' | 'ai' | null;

export const REGULAR_SHOTS = 5;

export interface ShootoutState {
  phase: ShootoutPhase;
  round: number;                 // 1-based; > REGULAR_SHOTS = muerte súbita
  playerShots: boolean[];        // resultado de cada tiro del jugador
  aiShots: boolean[];            // resultado de cada tiro de la IA
  suddenDeath: boolean;
  winner: Winner;
}

export type ShootoutAction =
  | { type: 'START' }
  | { type: 'PLAYER_SHOT'; goal: boolean }
  | { type: 'AI_SHOT'; goal: boolean }
  | { type: 'NEXT_ROUND' };

export const initialShootoutState: ShootoutState = {
  phase: 'idle',
  round: 1,
  playerShots: [],
  aiShots: [],
  suddenDeath: false,
  winner: null,
};

export function goals(shots: boolean[]): number {
  return shots.filter(Boolean).length;
}

// Regla de decisión, evaluada tras cada tiro.
function decide(playerShots: boolean[], aiShots: boolean[]): Winner {
  const pg = goals(playerShots);
  const ag = goals(aiShots);
  if (playerShots.length <= REGULAR_SHOTS && aiShots.length <= REGULAR_SHOTS) {
    // Fase regular: gana quien tenga una ventaja insalvable con los tiros restantes.
    const pRem = REGULAR_SHOTS - playerShots.length;
    const aRem = REGULAR_SHOTS - aiShots.length;
    if (pg > ag + aRem) return 'player';
    if (ag > pg + pRem) return 'ai';
    return null;
  }
  // Muerte súbita: decide solo con el mismo número de tiros por lado.
  if (playerShots.length === aiShots.length && pg !== ag) return pg > ag ? 'player' : 'ai';
  return null;
}

export function shootoutReducer(state: ShootoutState, action: ShootoutAction): ShootoutState {
  switch (action.type) {
    case 'START':
      return { ...initialShootoutState, phase: 'question' };

    case 'PLAYER_SHOT': {
      if (state.phase !== 'question') return state;
      const playerShots = [...state.playerShots, action.goal];
      return { ...state, playerShots, winner: decide(playerShots, state.aiShots), phase: 'player-feedback' };
    }

    case 'AI_SHOT': {
      // Ignorado si ya está decidido (el tiro del jugador cerró la tanda).
      if (state.phase !== 'player-feedback' || state.winner !== null) return state;
      const aiShots = [...state.aiShots, action.goal];
      return { ...state, aiShots, winner: decide(state.playerShots, aiShots), phase: 'ai-feedback' };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'player-feedback' && state.phase !== 'ai-feedback') return state;
      // Con ganador fijado, cualquier feedback avanza al final (deja animar el tiro decisivo).
      if (state.winner !== null) return { ...state, phase: 'gameover' };
      // Sin ganador, desde player-feedback falta el tiro de la IA: ignorar.
      if (state.phase === 'player-feedback') return state;
      const round = state.round + 1;
      return { ...state, round, suddenDeath: round > REGULAR_SHOTS, phase: 'question' };
    }

    default:
      return state;
  }
}
