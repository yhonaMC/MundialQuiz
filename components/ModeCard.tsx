"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { GameMode } from "@/lib/modes/modes";
import { ModeIcon } from "@/components/ui/ModeIcon";

// Acentos que rotan por tarjeta: verde / rojo / azul.
const ACCENTS = ["var(--color-green)", "var(--color-red)", "var(--color-navy)"];

const item = {
  hidden: { opacity: 0, y: 28, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 18 } as const,
  },
};

export function ModeCard({ mode, href, index }: { mode: GameMode; href: string; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -6, rotate: -1.5, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 16 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[var(--color-navy)] shadow-xl ring-1 ring-white/10"
      >
        {/* Banda de césped rayado con círculo central */}
        <div
          className="relative flex h-16 items-center justify-center overflow-hidden"
          style={{
            backgroundColor: accent,
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 16px, rgba(255,255,255,0) 16px 32px)",
          }}
        >
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/30" />
          <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
          <ModeIcon
            name={mode.icon}
            className="relative z-10 h-7 w-7 text-white drop-shadow transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-black uppercase italic">{mode.name}</h3>
          <p className="mt-1 text-sm text-[var(--color-gray-light)]/80">{mode.description}</p>
        </div>
      </Link>
    </motion.div>
  );
}
