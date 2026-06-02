"use client";
import { motion } from "framer-motion";

const COLORS = ["#ec1e9c", "#ffce1f", "#14b866", "#25c4d6", "#6f2dbd", "#e8332a"];

// Confeti simple basado en el índice de la pieza (determinista, sin Math.random en render).
export function Confetti({ pieces = 24 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 6) * 0.05;
        const color = COLORS[i % COLORS.length];
        const drift = ((i % 5) - 2) * 20;
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 420, x: drift, opacity: 0, rotate: 360 }}
            transition={{ duration: 1.4, delay, ease: "easeIn" }}
            className="absolute top-0 h-3 w-2 rounded-sm"
            style={{ left: `${left}%`, backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
