import { normalize } from "./normalize";

export type TileState = "correct" | "present" | "absent";

// Evalúa un intento contra la respuesta y devuelve el estado de cada casilla.
// Maneja letras repetidas en dos pasadas (Wordle): primero los aciertos exactos,
// luego los "presentes" consumiendo el conteo restante de cada letra en la respuesta.
export function evaluate(guess: string, answer: string): TileState[] {
  const g = normalize(guess);
  const a = normalize(answer);
  const result: TileState[] = Array.from({ length: g.length }, () => "absent");

  const remaining: Record<string, number> = {};
  for (const ch of a) remaining[ch] = (remaining[ch] ?? 0) + 1;

  // Pasada 1: aciertos en la posición correcta.
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      result[i] = "correct";
      remaining[g[i]]--;
    }
  }

  // Pasada 2: letras presentes en otra posición, mientras queden disponibles.
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    const ch = g[i];
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = "present";
      remaining[ch]--;
    }
  }

  return result;
}
