"use client";
import { motion } from "framer-motion";

// Versión compacta y seleccionable de las game cards (banda de cancha + nombre).
export function GameTile({
  nombre,
  accent,
  selected,
  disabled,
  onClick,
}: {
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
      className="relative flex flex-col overflow-hidden rounded-2xl bg-[var(--color-navy)] text-left shadow-lg transition-shadow"
      style={{ border: `2px solid ${selected ? accent : "rgba(255,255,255,0.12)"}` }}
    >
      {/* Banda de cancha */}
      <div
        className="relative flex h-9 items-center justify-center overflow-hidden"
        style={{
          backgroundColor: accent,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 12px, rgba(255,255,255,0) 12px 24px)",
        }}
      >
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/30" />
        <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
      </div>
      <span className="px-3 py-2 text-sm font-black uppercase italic leading-tight">{nombre}</span>
      {selected && (
        <span
          className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-[var(--color-navy-deep)]"
          style={{ backgroundColor: accent }}
        >
          ✓
        </span>
      )}
    </motion.button>
  );
}
