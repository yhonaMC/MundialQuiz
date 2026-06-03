import { VALID_SURNAMES } from "./data/validGuesses";
import { ANSWERS } from "./data/answers";
import { normalize } from "./normalize";

// Diccionario de intentos aceptados: apellidos reales de mundialistas (generados)
// más todas las respuestas curadas (selecciones incluidas). Todo ya normalizado.
const VALID = new Set<string>([...VALID_SURNAMES, ...ANSWERS.map((a) => a.word)]);

export function isValidGuess(word: string): boolean {
  return VALID.has(normalize(word));
}

export const VALID_COUNT = VALID.size;
