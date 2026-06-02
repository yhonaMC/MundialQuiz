"use client";
import { motion } from "framer-motion";

export function Hud({
  score,
  streak,
  lives,
  timeRemaining,
  questionNumber,
  totalQuestions,
}: {
  score: number;
  streak: number;
  lives: number | null;
  timeRemaining: number | null;
  questionNumber: number;
  totalQuestions: number | null;
}) {
  const lowTime = timeRemaining != null && timeRemaining <= 10;

  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-3 text-sm font-extrabold">
      <span className="rounded-full bg-[var(--color-gold)] px-3 py-1 text-[var(--color-indigo-deep)]">
        {score} pts
      </span>

      {streak > 1 && (
        <span className="rounded-full bg-white/10 px-3 py-1">🔥 x{streak}</span>
      )}

      {lives != null && (
        <span className="rounded-full bg-white/10 px-3 py-1">
          {"❤️".repeat(Math.max(0, lives))}
        </span>
      )}

      {timeRemaining != null && (
        <motion.span
          animate={lowTime ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ repeat: lowTime ? Infinity : 0, duration: 0.6 }}
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: lowTime ? "var(--color-red-flag)" : "rgba(255,255,255,0.1)" }}
        >
          ⏱ {timeRemaining}s
        </motion.span>
      )}

      {totalQuestions != null && (
        <span className="rounded-full bg-white/10 px-3 py-1">
          {questionNumber}/{totalQuestions}
        </span>
      )}
    </div>
  );
}
