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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-xl rounded-3xl bg-[var(--color-indigo-base)] p-6 shadow-2xl"
      >
        {answered && feedback.correct && <Confetti />}

        {question.tournamentYear && (
          <span className="mb-3 inline-block rounded-full bg-[var(--color-magenta)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide">
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-5 rounded-2xl bg-white/10 p-4"
          >
            <p className="text-lg font-black" style={{ color: feedback.correct ? "var(--color-green-pitch)" : "var(--color-red-flag)" }}>
              {feedback.correct ? `¡Correcto! +${feedback.pointsEarned}` : "Incorrecto"}
            </p>
            <p className="mt-1 text-sm text-white/80">{question.explanation}</p>
            <div className="mt-4">
              <Button variant="gold" onClick={onNext}>
                {isLast ? "Ver resultados" : "Siguiente →"}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
