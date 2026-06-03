"use client";
import { motion, useReducedMotion } from "framer-motion";

// Fondo "Stadium Night": resplandores de la paleta que se desplazan de forma
// fluida y orgánica (efecto aurora/lava-lamp), más una retícula de puntos.
const BLOBS = [
  {
    color: "var(--color-green)",
    opacity: 0.45,
    pos: "-left-24 -top-12 h-80 w-80",
    x: [0, 180, 90, 240, 60, 0],
    y: [0, 120, 220, 90, 180, 0],
    s: [1, 1.2, 0.85, 1.15, 0.95, 1],
    d: 16,
  },
  {
    color: "var(--color-red)",
    opacity: 0.4,
    pos: "-right-20 top-6 h-72 w-72",
    x: [0, -160, -40, -220, -80, 0],
    y: [0, 150, 40, 200, 90, 0],
    s: [1, 0.88, 1.2, 1, 1.1, 1],
    d: 19,
  },
  {
    color: "var(--color-navy)",
    opacity: 0.6,
    pos: "left-1/4 top-1/4 h-72 w-72",
    x: [0, 220, -120, 160, -60, 0],
    y: [0, -130, 120, -60, 70, 0],
    s: [1, 1.25, 0.9, 1.15, 1, 1],
    d: 21,
  },
  {
    color: "var(--color-green)",
    opacity: 0.35,
    pos: "-bottom-16 left-1/4 h-80 w-80",
    x: [0, -150, 110, -200, 70, 0],
    y: [0, -120, 60, -160, -40, 0],
    s: [1, 1.15, 0.85, 1.2, 0.95, 1],
    d: 18,
  },
  {
    color: "var(--color-red)",
    opacity: 0.3,
    pos: "bottom-0 right-1/4 h-72 w-72",
    x: [0, 140, -180, 90, -120, 0],
    y: [0, 90, -150, 50, -100, 0],
    s: [1, 0.88, 1.2, 0.95, 1.1, 1],
    d: 17,
  },
];

export function MemphisBackground() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${b.pos}`}
          style={{ backgroundColor: b.color, opacity: b.opacity }}
          animate={reduce ? undefined : { x: b.x, y: b.y, scale: b.s }}
          transition={{ duration: b.d, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
