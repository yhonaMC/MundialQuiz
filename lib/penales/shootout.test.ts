import { describe, it, expect } from 'vitest';
import {
  shootoutReducer, initialShootoutState, goals, type ShootoutState,
} from '@/lib/penales/shootout';

function start(): ShootoutState {
  return shootoutReducer(initialShootoutState, { type: 'START' });
}

// Juega una ronda completa: tiro del jugador + tiro de la IA + (opcional) avanzar.
function playRound(s: ShootoutState, playerGoal: boolean, aiGoal: boolean, advance = true): ShootoutState {
  let st = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: playerGoal });
  if (st.winner === null) st = shootoutReducer(st, { type: 'AI_SHOT', goal: aiGoal });
  if (advance) st = shootoutReducer(st, { type: 'NEXT_ROUND' });
  return st;
}

describe('shootoutReducer', () => {
  it('START enters the question phase at round 1', () => {
    const s = start();
    expect(s.phase).toBe('question');
    expect(s.round).toBe(1);
    expect(s.playerShots).toEqual([]);
    expect(s.suddenDeath).toBe(false);
  });

  it('PLAYER_SHOT records the shot and moves to player-feedback', () => {
    let s = start();
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.phase).toBe('player-feedback');
    expect(s.playerShots).toEqual([true]);
    expect(s.winner).toBeNull();
  });

  it('AI_SHOT only works from player-feedback', () => {
    const s = start();
    expect(shootoutReducer(s, { type: 'AI_SHOT', goal: true })).toBe(s);
  });

  it('a full round advances the round counter', () => {
    let s = start();
    s = playRound(s, true, true);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('question');
    expect(goals(s.playerShots)).toBe(1);
    expect(goals(s.aiShots)).toBe(1);
  });

  it('early end: 3-0 with 2 AI shots remaining decides the game', () => {
    let s = start();
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, true, false);   // 2-0
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });  // 3-...
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: false });     // 3-0, IA con 2 restantes
    expect(s.winner).toBe('player');                              // 0 + 2 < 3
    expect(s.phase).toBe('ai-feedback');                          // feedback del tiro decisivo
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('no early end while the difference is still reachable (3-1, 2 remaining)', () => {
    let s = start();
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, true, true);    // 2-1
    s = playRound(s, true, false);   // 3-1 con 2 restantes de IA → 1+2 >= 3, sigue
    expect(s.winner).toBeNull();
    expect(s.round).toBe(4);
  });

  it("a decisive PLAYER shot ends it without an AI shot", () => {
    let s = start();
    s = playRound(s, false, false);  // 0-0
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, false, true);   // 1-1
    s = playRound(s, true, false);   // 2-1
    // Ronda 5: el jugador anota → 3-1 con 1 tiro restante de IA → 1+1 < 3: decidido
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.winner).toBe('player');
    expect(s.phase).toBe('player-feedback');
    // La IA ya no tira: AI_SHOT se ignora
    const after = shootoutReducer(s, { type: 'AI_SHOT', goal: true });
    expect(after.aiShots).toHaveLength(4);
    // NEXT_ROUND desde player-feedback con winner → gameover
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('AI can win by early end too', () => {
    let s = start();
    s = playRound(s, false, true);   // 0-1
    s = playRound(s, false, true);   // 0-2
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: false }); // 0-... jugador 3 tiros, 2 restantes
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: true });      // 0-3 → 0+2 < 3
    expect(s.winner).toBe('ai');
  });

  it('a 5-5 tie (all goals) enters sudden death', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);
    expect(s.winner).toBeNull();
    expect(s.round).toBe(6);
    expect(s.suddenDeath).toBe(true);
    expect(s.phase).toBe('question');
  });

  it('sudden death: decided only after the AI completes the round', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);  // 5-5 → MS
    // Ronda 6: jugador anota — aún sin decisión (la IA no ha tirado)
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.winner).toBeNull();
    // La IA falla → decidido
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: false });
    expect(s.winner).toBe('player');
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('sudden death continues while tied', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);  // 5-5
    s = playRound(s, false, false);                            // ambos fallan → sigue
    expect(s.winner).toBeNull();
    expect(s.round).toBe(7);
    expect(s.suddenDeath).toBe(true);
  });

  it('NEXT_ROUND without winner from player-feedback is ignored (AI must shoot)', () => {
    let s = start();
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: false });
    const same = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(same).toBe(s);
  });

  it('goals counts converted shots', () => {
    expect(goals([true, false, true, true])).toBe(3);
    expect(goals([])).toBe(0);
  });
});
