export interface ScoreInput {
  correct: boolean;
  difficulty: number;            // 1..5
  streak: number;                // racha ANTES de esta respuesta
  base: number;
  speedBonusMax: number;
  streakMultiplierStep: number;
  timeRemainingRatio?: number;   // 0..1, solo modos con reloj
  closeness?: number;            // 0..1, solo formato number
}

export function numericCloseness(guess: number, answer: number, tolerance: number): number {
  const diff = Math.abs(guess - answer);
  if (diff === 0) return 1;
  if (diff >= tolerance) return 0;
  return 1 - diff / tolerance;
}

export function scoreAnswer(input: ScoreInput): number {
  if (!input.correct) return 0;
  const difficultyPoints = input.base * (1 + (input.difficulty - 1) * 0.25);
  const speed = input.timeRemainingRatio != null
    ? input.speedBonusMax * input.timeRemainingRatio
    : 0;
  const streakMultiplier = 1 + input.streak * input.streakMultiplierStep;
  const closenessFactor = input.closeness != null ? input.closeness : 1;
  return Math.round((difficultyPoints + speed) * streakMultiplier * closenessFactor);
}
