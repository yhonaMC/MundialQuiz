"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Question } from "@/lib/data/types";
import { MultipleChoice } from "@/components/formats/MultipleChoice";
import { TrueFalse } from "@/components/formats/TrueFalse";
import { OddOneOut } from "@/components/formats/OddOneOut";
import { NumberInput } from "@/components/formats/NumberInput";
import { Confetti } from "@/components/ui/Confetti";
import { Button } from "@/components/ui/Button";

export interface FeedbackInfo {
  correct: boolean;
  pointsEarned: number;
  exact?: boolean; // false = acierto por tolerancia (cerca pero no exacto)
}

function feedbackLabel(f: FeedbackInfo): string {
  if (!f.correct) return "Incorrecto";
  if (f.exact === false) return `¡Muy cerca! +${f.pointsEarned}`;
  return `¡Correcto! +${f.pointsEarned}`;
}

function feedbackColor(f: FeedbackInfo): string {
  if (!f.correct) return "var(--color-red)";
  if (f.exact === false) return "var(--color-amber)";
  return "var(--color-green)";
}

export function QuestionCard({
  question,
  feedback,
  onAnswer,
  onNext,
  isLast,
}: {
  question: Question;
  feedback: FeedbackInfo | null;
  onAnswer: (answer: number) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const answered = feedback !== null;
  const wrong = answered && !feedback.correct;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        // En respuesta incorrecta, sacude la tarjeta. La 'x' usa tween (multi-keyframe);
        // el resto usa spring. NO mezclar arrays de keyframes con spring (lanza error).
        animate={{ opacity: 1, y: 0, scale: 1, x: wrong ? [0, -12, 12, -8, 8, 0] : 0 }}
        exit={{ opacity: 0, y: -20, scale: 0.96, transition: { duration: 0.15 } }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 24,
          x: { type: "tween", duration: 0.45, ease: "easeInOut" },
        }}
        className="relative w-full max-w-xl rounded-3xl bg-[var(--color-navy)] p-6 shadow-2xl ring-1 ring-white/10"
      >
        {answered && feedback.correct && <Confetti />}

        {question.tournamentYear && (
          <span className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--color-green)]">
            Mundial {question.tournamentYear}
          </span>
        )}

        <h2 className="mb-5 text-xl font-black leading-tight sm:text-2xl">{question.prompt}</h2>

        {question.format === "multiple-choice" && (
          <MultipleChoice question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "odd-one-out" && (
          <OddOneOut question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "true-false" && (
          <TrueFalse question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "number" && (
          <NumberInput question={question} disabled={answered} onAnswer={onAnswer} />
        )}

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-5 rounded-2xl bg-white/10 p-4"
          >
            <p className="text-lg font-black" style={{ color: feedbackColor(feedback) }}>
              {feedbackLabel(feedback)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-gray-light)]/90">{question.explanation}</p>
            <div className="mt-4">
              <Button variant="primary" onClick={onNext}>
                {isLast ? "Ver resultados" : "Siguiente →"}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
