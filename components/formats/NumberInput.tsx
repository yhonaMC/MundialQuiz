"use client";
import { useState } from "react";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function NumberInput({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (value: number) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const n = Number(value);
    if (Number.isFinite(n)) onAnswer(n);
  }

  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tu respuesta…"
        aria-label={question.prompt}
        className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-lg font-bold text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-green)]"
      />
      <Button type="submit" variant="primary" disabled={disabled || value === ""}>
        OK
      </Button>
    </form>
  );
}
