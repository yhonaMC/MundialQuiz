"use client";
import { motion } from "framer-motion";
import type { TileState } from "@/lib/incognita/evaluate";

export type TileVisual = TileState | "empty" | "filled";

const COLORS: Record<TileVisual, { bg: string; fg: string; border: string }> = {
  correct: { bg: "var(--color-green)", fg: "var(--color-navy-deep)", border: "var(--color-green)" },
  present: { bg: "var(--color-amber)", fg: "var(--color-navy-deep)", border: "var(--color-amber)" },
  absent: { bg: "var(--color-gray-dark)", fg: "#ffffff", border: "var(--color-gray-dark)" },
  empty: { bg: "transparent", fg: "#ffffff", border: "rgba(255,255,255,0.15)" },
  filled: { bg: "rgba(255,255,255,0.06)", fg: "#ffffff", border: "rgba(255,255,255,0.45)" },
};

const CLASS =
  "flex aspect-square w-full items-center justify-center rounded-lg border-2 text-2xl font-black uppercase sm:text-3xl";

// El Board keya cada casilla por (col, revealed, letra), así cada animación se
// reproduce UNA sola vez al montar ese estado y nunca queda un transform a medias.
export function Tile({
  letter,
  state,
  revealed,
  index = 0,
}: {
  letter: string;
  state: TileVisual;
  revealed?: boolean;
  index?: number;
}) {
  const c = COLORS[state];
  const style = { backgroundColor: c.bg, color: c.fg, borderColor: c.border };

  if (revealed) {
    // Flip 3D ágil en cascada (perspectiva real; objetivo estable rotateX: 0 → nunca se traba).
    return (
      <motion.div
        initial={{ rotateX: 90 }}
        animate={{ rotateX: 0 }}
        transition={{ duration: 0.28, delay: index * 0.07, ease: "easeOut" }}
        style={{ ...style, transformPerspective: 500 }}
        className={CLASS}
      >
        {letter}
      </motion.div>
    );
  }

  // Casilla en edición: pop sutil al aparecer la letra.
  return (
    <motion.div
      initial={letter ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      style={style}
      className={CLASS}
    >
      {letter}
    </motion.div>
  );
}
