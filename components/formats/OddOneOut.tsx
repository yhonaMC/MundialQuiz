"use client";
import { motion } from "framer-motion";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const option = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 20 } as const },
};

export function OddOneOut({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
      {question.options!.map((opt, i) => (
        <motion.div key={i} variants={option}>
          <Button variant="ghost" disabled={disabled} onClick={() => onAnswer(i)} className="w-full">
            {opt}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
