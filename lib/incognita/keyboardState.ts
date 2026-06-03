import { evaluate, type TileState } from "./evaluate";
import { normalize } from "./normalize";

// Mejor estado conocido por letra, para colorear el teclado.
const RANK: Record<TileState, number> = { absent: 1, present: 2, correct: 3 };

export function keyboardState(guesses: string[], answer: string): Record<string, TileState> {
  const map: Record<string, TileState> = {};
  for (const guess of guesses) {
    const states = evaluate(guess, answer);
    const g = normalize(guess);
    for (let i = 0; i < g.length; i++) {
      const ch = g[i];
      const st = states[i];
      if (!map[ch] || RANK[st] > RANK[map[ch]]) map[ch] = st;
    }
  }
  return map;
}
