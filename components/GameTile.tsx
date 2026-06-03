"use client";
import { motion } from "framer-motion";
import { GameMini } from "@/components/GameMini";

// Versión compacta y seleccionable de las game cards (banda de cancha + mini-visual + nombre).
export function GameTile({
  game,
  nombre,
  accent,
  selected,
  disabled,
  onClick,
}: {
  game: string;
  nombre: string;
  accent: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -3, scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="relative flex flex-col overflow-hidden rounded-2xl bg-[var(--color-navy)] text-left shadow-lg"
      style={{ border: `2px solid ${selected ? accent : "rgba(255,255,255,0.12)"}` }}
    >
      {/* Banda de cancha con el mini-visual del juego */}
      <div
        className="relative flex h-20 items-center justify-center overflow-hidden"
        style={{
          backgroundColor: accent,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 14px, rgba(255,255,255,0) 14px 28px)",
        }}
      >
        <span className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
        <div className="relative z-10 scale-90">
          <GameMini game={game} small />
        </div>
      </div>
      <span className="px-3 py-2 text-sm font-black uppercase italic leading-tight">{nombre}</span>
      {selected && (
        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: accent }}>
          ✓
        </span>
      )}
    </motion.button>
  );
}
