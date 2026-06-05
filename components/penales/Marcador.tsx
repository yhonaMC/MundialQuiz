"use client";
import { motion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";

function Dots({ shots, total, label }: { shots: boolean[]; total: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-xs font-black uppercase text-white/70">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const shot = shots[i]; // undefined = pendiente
          return (
            <motion.span
              key={i}
              initial={false}
              animate={shots.length - 1 === i ? { scale: [1.4, 1] } : { scale: 1 }}
              className="grid h-7 w-7 place-items-center rounded-full text-sm font-black text-white"
              style={{
                backgroundColor:
                  shot === undefined
                    ? "rgba(255,255,255,0.12)"
                    : shot
                      ? "var(--color-green)"
                      : "var(--color-red)",
              }}
            >
              {shot === undefined ? "" : shot ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

// Tablero de la tanda: una fila por lado; en muerte súbita crecen los círculos.
export function Marcador({
  playerShots,
  aiShots,
  suddenDeath,
  round,
}: {
  playerShots: boolean[];
  aiShots: boolean[];
  suddenDeath: boolean;
  round: number;
}) {
  const total = Math.max(5, round);
  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-2xl bg-[var(--color-navy)] p-4 ring-1 ring-white/10">
      {suddenDeath && (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="flex items-center justify-center gap-1 text-center text-xs font-black uppercase tracking-widest text-[var(--color-red)]"
        >
          <Zap className="h-3.5 w-3.5" /> Muerte súbita
        </motion.p>
      )}
      <Dots shots={playerShots} total={total} label="Tú" />
      <Dots shots={aiShots} total={total} label="IA" />
    </div>
  );
}
