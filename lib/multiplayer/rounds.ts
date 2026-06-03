// Contenido de ronda generado por el ANFITRIÓN y transmitido a todos por broadcast.
// Así no hace falta determinismo por semilla: el host genera, los demás renderizan.
import { createRng } from "@/lib/engine/rng";
import { TOURNAMENTS } from "@/lib/data";
import { generateQuestion } from "@/lib/engine/generateQuestion";
import { generarRondaQ } from "@/lib/quienes/generate";
import { generarRonda } from "@/lib/conexion/generate";
import { getRandomAnswer } from "@/lib/incognita/daily";

export interface OptionsRound {
  kind: "options";
  prompt?: string;
  foto?: string;
  sub?: string;
  options: string[];
  answer: number;
}
export interface ConexionRound {
  kind: "conexion";
  cards: { id: string; nombre: string; paisEs: string; posicion: string; foto?: string }[];
  correct: string[];
  label: string;
}
export interface IncognitaRound {
  kind: "incognita";
  word: string;
  hint: string;
}
export interface PenalesRound {
  kind: "penales";
  prompt: string;
  sub?: string;
  options: string[];
  answer: number;
}
export type Round = OptionsRound | ConexionRound | IncognitaRound | PenalesRound;

export const TOTAL_ROUNDS = 5;

export function buildRound(game: string): Round {
  if (game === "quien-es") {
    const r = generarRondaQ();
    if (r?.player.foto) {
      return { kind: "options", foto: r.player.foto.archivo, sub: "¿Quién es?", options: r.opciones, answer: r.correcta };
    }
    // sin fotos → cae a quiz
  }

  if (game === "conexion") {
    const r = generarRonda();
    return {
      kind: "conexion",
      cards: r.players.map((p) => ({ id: p.id, nombre: p.nombre, paisEs: p.paisEs, posicion: p.posicion, foto: p.foto?.archivo })),
      correct: r.matchIds,
      label: r.label,
    };
  }

  if (game === "incognita") {
    const a = getRandomAnswer();
    return { kind: "incognita", word: a.word, hint: a.hint };
  }

  if (game === "penales") {
    // Solo preguntas de 4 opciones: un penal con 50% de acierto al azar (V/F) sería regalado.
    return { kind: "penales", ...pickOptionsQuestion(true) };
  }

  // quiz (por defecto): primera pregunta con opciones (no numérica), V/F incluido.
  return { kind: "options", ...pickOptionsQuestion(false) };
}

// Pregunta con opciones (no numérica) del motor de trivia, dificultad media.
function pickOptionsQuestion(soloCuatro: boolean): { prompt: string; sub?: string; options: string[]; answer: number } {
  const rng = createRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  for (let i = 0; i < 25; i++) {
    const q = generateQuestion({ tournaments: TOURNAMENTS, targetDifficulty: 2, tournamentFilter: "all", seenIds: [], rng });
    if (q.format !== "number" && q.options && (!soloCuatro || q.options.length === 4) && q.answerIndex != null) {
      return {
        prompt: q.prompt,
        sub: q.tournamentYear ? `Mundial ${q.tournamentYear}` : undefined,
        options: q.options,
        answer: q.answerIndex,
      };
    }
  }
  return { prompt: "—", options: ["A", "B", "C", "D"], answer: 0 };
}

// Puntos por respuesta: base + bonus por velocidad (cuanto antes, más).
export function scoreFor(correct: boolean, elapsedMs: number, roundMs: number): number {
  if (!correct) return 0;
  const speed = Math.max(0, 1 - elapsedMs / roundMs);
  return 100 + Math.round(100 * speed);
}

export const PENALES_MAX_ROUNDS = 15;

// ¿Sigue la tanda de penales tras completar la ronda nextIdx-1?
// 5 rondas fijas; después, muerte súbita mientras haya empate en la cima (tope de seguridad).
export function penalesContinua(goles: number[], nextIdx: number): boolean {
  if (nextIdx < TOTAL_ROUNDS) return true;
  if (nextIdx >= PENALES_MAX_ROUNDS) return false;
  const sorted = [...goles].sort((a, b) => b - a);
  return sorted.length >= 2 && sorted[0] === sorted[1];
}
