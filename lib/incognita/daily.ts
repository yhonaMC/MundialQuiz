import { ANSWERS, type Respuesta } from "./data/answers";

// Clave de día local (YYYY-MM-DD). El día cambia a la medianoche local.
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysSinceEpoch(date: Date): number {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(utcMidnight / 86_400_000);
}

// Índice determinista por día, disperso con un multiplicador grande para que
// días consecutivos no caigan en respuestas alfabéticamente contiguas.
export function dailyIndex(date: Date, length: number = ANSWERS.length): number {
  const n = daysSinceEpoch(date);
  return ((n * 1_103_515_245 + 12_345) % length + length) % length;
}

export function getDailyAnswer(date: Date): Respuesta {
  return ANSWERS[dailyIndex(date)];
}

// Respuesta aleatoria: una distinta cada vez que se entra al juego.
export function getRandomAnswer(): Respuesta {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}
