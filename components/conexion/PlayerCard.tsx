"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Player } from "@/lib/db/types";

export type Reveal = "none" | "match" | "wrong";

// Color de borde según estado de selección/revelado.
function ring(selected: boolean, reveal: Reveal): string {
  if (reveal === "match") return "var(--color-green)";
  if (reveal === "wrong") return "var(--color-red)";
  if (selected) return "var(--color-green)";
  return "rgba(255,255,255,0.12)";
}

export function PlayerCard({
  player,
  selected,
  reveal,
  disabled,
  onToggle,
}: {
  player: Player;
  selected: boolean;
  reveal: Reveal;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const initials = player.apellido.slice(0, 2);

  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -4, scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      animate={reveal === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
      transition={{ x: { duration: 0.4 } }}
      className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-[var(--color-navy)] p-2 shadow-lg"
      style={{ border: `3px solid ${ring(selected, reveal)}` }}
    >
      {/* Marca de selección */}
      {selected && reveal === "none" && (
        <span className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-green)] text-[var(--color-navy-deep)]">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}

      {/* Foto o placeholder */}
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-white/5">
        {player.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public
          <img
            src={player.foto.archivo}
            alt={player.nombre}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-2xl font-black text-white/80"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-green) 18%, transparent)" }}
          >
            {initials}
          </div>
        )}
      </div>

      <p className="mt-1.5 w-full truncate text-center text-xs font-extrabold">{player.nombre}</p>
      <p className="w-full truncate text-center text-[10px] text-[var(--color-gray-light)]/70">
        {player.paisEs}
      </p>
    </motion.button>
  );
}
