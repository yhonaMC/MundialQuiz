const MIN_SAMPLES = 3;
const RAISE_THRESHOLD = 0.8;
const LOWER_THRESHOLD = 0.4;

export function nextDifficulty(current: number, recentResults: boolean[]): number {
  if (recentResults.length < MIN_SAMPLES) return current;
  const accuracy = recentResults.filter(Boolean).length / recentResults.length;
  if (accuracy >= RAISE_THRESHOLD) return Math.min(5, current + 1);
  if (accuracy <= LOWER_THRESHOLD) return Math.max(1, current - 1);
  return current;
}
