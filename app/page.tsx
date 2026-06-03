"use client";
import { motion } from "framer-motion";
import { User, Users } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { GameCard } from "@/components/GameCard";
import { AdBanner } from "@/components/ui/AdBanner";

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-14">
      <MemphisBackground />

      <motion.h1
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="text-center text-5xl font-black uppercase italic sm:text-6xl"
      >
        Juega<span className="text-[var(--color-green)]">Mundial</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mt-2 text-center text-[var(--color-gray-light)]/80"
      >
        Juegos de los Mundiales · 1930 – 2026
      </motion.p>

      <motion.div
        variants={grid}
        initial="hidden"
        animate="show"
        className="mt-10 grid w-full max-w-2xl gap-5 sm:grid-cols-2"
      >
        <GameCard
          href="/solo"
          accent="var(--color-green)"
          title="Solo"
          subtitle="Juega a tu ritmo: Quiz, La Incógnita, La Conexión y ¿Quién es?"
          visual={
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-green)]">
              <User className="h-8 w-8 text-[var(--color-navy-deep)]" />
            </span>
          }
        />
        <GameCard
          href="/multijugador"
          accent="var(--color-red)"
          title="Multijugador"
          subtitle="Crea una sala, invita por código o link y compitan en tiempo real."
          visual={
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-red)]">
              <Users className="h-8 w-8 text-white" />
            </span>
          }
        />
      </motion.div>

      <AdBanner className="mt-10 w-full max-w-2xl" />
    </main>
  );
}
