"use client";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function MultipleChoice({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="grid gap-3">
      {question.options!.map((opt, i) => (
        <Button key={i} variant="ghost" disabled={disabled} onClick={() => onAnswer(i)} className="text-left">
          {opt}
        </Button>
      ))}
    </div>
  );
}
