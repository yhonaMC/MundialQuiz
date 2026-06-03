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
export type Round = OptionsRound | ConexionRound | IncognitaRound;

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

  // quiz (por defecto): primera pregunta con opciones (no numérica).
  const rng = createRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  for (let i = 0; i < 25; i++) {
    const q = generateQuestion({ tournaments: TOURNAMENTS, targetDifficulty: 2, tournamentFilter: "all", seenIds: [], rng });
    if (q.format !== "number" && q.options && q.answerIndex != null) {
      return {
        kind: "options",
        prompt: q.prompt,
        sub: q.tournamentYear ? `Mundial ${q.tournamentYear}` : undefined,
        options: q.options,
        answer: q.answerIndex,
      };
    }
  }
  return { kind: "options", prompt: "—", options: ["A", "B", "C", "D"], answer: 0 };
}

// Puntos por respuesta: base + bonus por velocidad (cuanto antes, más).
export function scoreFor(correct: boolean, elapsedMs: number, roundMs: number): number {
  if (!correct) return 0;
  const speed = Math.max(0, 1 - elapsedMs / roundMs);
  return 100 + Math.round(100 * speed);
}
