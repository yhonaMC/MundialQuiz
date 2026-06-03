"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const item = {
  hidden: { opacity: 0, y: 32, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 18 } as const,
  },
};

// Tarjeta de juego con estética de cancha: franja con césped rayado, círculo
// central y línea de medio campo; cuerpo en navy con título tipo dorsal.
export function GameCard({
  href,
  title,
  subtitle,
  badge,
  accent,
  visual,
}: {
  href: string;
  title: ReactNode;
  subtitle: string;
  badge?: string;
  accent: string;
  visual: ReactNode;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -8, rotate: -1, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[var(--color-navy)] shadow-2xl ring-1 ring-white/10"
      >
        {/* Franja de cancha */}
        <div
          className="relative flex h-32 items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "var(--color-green)",
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 22px, rgba(255,255,255,0) 22px 44px)",
          }}
        >
          {/* Línea de medio campo + círculo central */}
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/40" />
          <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          {/* Visual del juego */}
          <div className="relative z-10 drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
            {visual}
          </div>
          {/* Etiqueta tipo dorsal */}
          {badge && (
            <span className="absolute right-3 top-3 rounded-md bg-[var(--color-navy-deep)]/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              {badge}
            </span>
          )}
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-xl font-black uppercase italic leading-tight sm:text-2xl">{title}</h3>
          <p className="mt-1 text-sm text-[var(--color-gray-light)]/80">{subtitle}</p>
          <span
            className="mt-4 inline-flex items-center gap-1 self-start rounded-full px-4 py-1.5 text-sm font-extrabold text-[var(--color-navy-deep)]"
            style={{ backgroundColor: accent }}
          >
            Jugar
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
