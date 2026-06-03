"use client";
import { motion } from "framer-motion";
import { Flame, Heart, Timer } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

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
      <span className="rounded-full bg-[var(--color-green)] px-3 py-1 text-[var(--color-navy-deep)]">
        <AnimatedNumber value={score} /> pts
      </span>

      {streak > 1 && (
        // key={streak} remonta el elemento en cada incremento → re-dispara el pop.
        <motion.span
          key={streak}
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: [1.4, 1], rotate: [6, 0] }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"
        >
          <Flame className="h-4 w-4 text-[var(--color-red)]" aria-hidden /> x{streak}
        </motion.span>
      )}

      {lives != null && (
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
            <Heart key={i} className="h-4 w-4 fill-[var(--color-red)] text-[var(--color-red)]" aria-hidden />
          ))}
        </span>
      )}

      {timeRemaining != null && (
        <motion.span
          animate={lowTime ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ repeat: lowTime ? Infinity : 0, duration: 0.6 }}
          className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ backgroundColor: lowTime ? "var(--color-red)" : "rgba(255,255,255,0.1)" }}
        >
          <Timer className="h-4 w-4" aria-hidden /> {timeRemaining}s
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
