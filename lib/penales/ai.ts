import type { Rng } from '@/lib/engine/rng';

export type Nivel = 'facil' | 'normal' | 'dificil';

export const NIVELES: Nivel[] = ['facil', 'normal', 'dificil'];

// Probabilidad de que la IA anote su penal, por nivel.
export const AI_GOAL_PROBABILITY: Record<Nivel, number> = {
  facil: 0.5,
  normal: 0.65,
  dificil: 0.8,
};

// Rango de dificultad de TUS preguntas, por nivel de IA.
export const NIVEL_DIFFICULTY: Record<Nivel, [number, number]> = {
  facil: [1, 2],
  normal: [2, 3],
  dificil: [3, 5],
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

export function aiShoots(nivel: Nivel, rng: Rng): boolean {
  return rng.next() < AI_GOAL_PROBABILITY[nivel];
}

// Dificultad de la próxima pregunta: aleatoria dentro del rango del nivel;
// en muerte súbita sube +1 (tope 5) para el dramatismo.
export function questionDifficulty(nivel: Nivel, suddenDeath: boolean, rng: Rng): number {
  const [min, max] = NIVEL_DIFFICULTY[nivel];
  const d = min + rng.int(max - min + 1);
  return Math.min(5, suddenDeath ? d + 1 : d);
}
