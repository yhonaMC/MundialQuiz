"use client";
import { Check, X } from "lucide-react";
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
      <Button variant="primary" disabled={disabled} onClick={() => onAnswer(0)} className="flex items-center justify-center gap-2">
        <Check className="h-5 w-5" aria-hidden /> {question.options![0]}
      </Button>
      <Button variant="ghost" disabled={disabled} onClick={() => onAnswer(1)} className="flex items-center justify-center gap-2">
        <X className="h-5 w-5" aria-hidden /> {question.options![1]}
      </Button>
    </div>
  );
}
