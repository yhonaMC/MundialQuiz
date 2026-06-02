"use client";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function TrueFalse({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="gold" disabled={disabled} onClick={() => onAnswer(0)}>
        ✓ {question.options![0]}
      </Button>
      <Button variant="ghost" disabled={disabled} onClick={() => onAnswer(1)}>
        ✗ {question.options![1]}
      </Button>
    </div>
  );
}
