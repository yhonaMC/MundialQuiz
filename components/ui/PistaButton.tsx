"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { sfx } from "@/lib/sound";

// Botón de pista reutilizable: al pulsarlo revela un texto de ayuda (que no spoilea
// la respuesta). Gestiona su propio estado; para reiniciarlo por ronda usa `key`.
export function PistaButton({
  hint,
  onReveal,
  penalty = true,
  className = "",
}: {
  hint: string;
  onReveal?: () => void;
  penalty?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  if (shown) {
    return (
      <span className={`flex items-center gap-1.5 rounded-full bg-[var(--color-amber)]/15 px-3 py-1 text-xs font-bold text-[var(--color-amber)] ${className}`}>
        <Lightbulb className="h-3.5 w-3.5" /> {hint}
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        setShown(true);
        sfx.tap();
        onReveal?.();
      }}
      className={`flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-[var(--color-gray-light)] ring-1 ring-white/15 hover:bg-white/15 ${className}`}
    >
      <Lightbulb className="h-3.5 w-3.5 text-[var(--color-amber)]" /> {penalty ? "Pista (−50% pts)" : "Ver pista"}
    </button>
  );
}
