import type { Question, QuestionFormat, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';

export interface Generator {
  id: string;
  difficulty: number;          // 1..5
  formats: QuestionFormat[];
  build(t: Tournament, all: Tournament[], rng: Rng): Question;
}

// Helper: arma 4 opciones de opción múltiple con la correcta + 3 distractores únicos.
export function makeOptions(correct: string, pool: string[], rng: Rng): { options: string[]; answerIndex: number } {
  const distractors = rng
    .shuffle(pool.filter((x) => x !== correct))
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 3);
  const options = rng.shuffle([correct, ...distractors]);
  return { options, answerIndex: options.indexOf(correct) };
}
