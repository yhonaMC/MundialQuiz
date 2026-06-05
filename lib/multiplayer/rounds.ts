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
  hint?: string; // pista de texto (no revela la respuesta)
}
export interface ConexionRound {
  kind: "conexion";
  cards: { id: string; nombre: string; paisEs: string; posicion: string; foto?: string }[];
  correct: string[];
  label: string;
  hint?: string;
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
  hint?: string;
}
export type Round = OptionsRound | ConexionRound | IncognitaRound | PenalesRound;

export const TOTAL_ROUNDS = 5;

// Opciones de filtro "desde año del Mundial" que elige el anfitrión en la sala.
// value 0 = todos. Aplica a Quiz, ¿Quién es? y Penales (datos con año).
export const MUNDIAL_DESDE: { label: string; value: number }[] = [
  { label: "Todos", value: 0 },
  { label: "≥ 2002", value: 2002 },
  { label: "≥ 2010", value: 2010 },
  { label: "Solo 2022", value: 2022 },
];

// `desde`: año mínimo del Mundial (0 = todos). Solo afecta a juegos basados en datos por año.
export function buildRound(game: string, desde = 0): Round {
  if (game === "quien-es") {
    const r = generarRondaQ(desde);
    if (r?.player.foto) {
      const pl = r.player;
      return {
        kind: "options",
        foto: r.player.foto.archivo,
        sub: "¿Quién es?",
        options: r.opciones,
        answer: r.correcta,
        hint: `${pl.posicion} de ${pl.paisEs}${pl.mundiales.length ? ` · Mundial ${Math.max(...pl.mundiales)}` : ""}`,
      };
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
      hint: `La conexión es por: ${r.tipo}`,
    };
  }

  if (game === "incognita") {
    const a = getRandomAnswer();
    return { kind: "incognita", word: a.word, hint: a.hint };
  }

  if (game === "penales") {
    // Solo preguntas de 4 opciones: un penal con 50% de acierto al azar (V/F) sería regalado.
    return { kind: "penales", ...pickOptionsQuestion(true, desde) };
  }

  // quiz (por defecto): primera pregunta con opciones (no numérica), V/F incluido.
  return { kind: "options", ...pickOptionsQuestion(false, desde) };
}

// Pregunta con opciones (no numérica) del motor de trivia, dificultad media.
// `desde`: si se indica, restringe el pool de Mundiales a year >= desde.
function pickOptionsQuestion(
  soloCuatro: boolean,
  desde = 0,
): { prompt: string; sub?: string; options: string[]; answer: number; hint?: string } {
  const rng = createRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const pool = desde ? TOURNAMENTS.filter((t) => t.year >= desde) : TOURNAMENTS;
  const tournaments = pool.length ? pool : TOURNAMENTS;
  for (let i = 0; i < 25; i++) {
    const q = generateQuestion({ tournaments, targetDifficulty: 2, tournamentFilter: "all", seenIds: [], rng });
    if (q.format !== "number" && q.options && (!soloCuatro || q.options.length === 4) && q.answerIndex != null) {
      return {
        prompt: q.prompt,
        sub: q.tournamentYear ? `Mundial ${q.tournamentYear}` : undefined,
        options: q.options,
        answer: q.answerIndex,
        hint: q.explanation || undefined,
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
