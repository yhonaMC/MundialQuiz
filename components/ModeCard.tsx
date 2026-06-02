"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { GameMode } from "@/lib/modes/modes";

export function ModeCard({ mode, href }: { mode: GameMode; href: string }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className="flex h-full flex-col rounded-3xl bg-[var(--color-indigo-base)] p-5 shadow-xl ring-1 ring-white/10"
      >
        <span className="text-4xl">{mode.icon}</span>
        <h3 className="mt-3 text-lg font-black">{mode.name}</h3>
        <p className="mt-1 text-sm text-white/70">{mode.description}</p>
      </Link>
    </motion.div>
  );
}
