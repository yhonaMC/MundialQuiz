"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { MODES } from "@/lib/modes/modes";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { ModeCard } from "@/components/ModeCard";
import { AdBanner } from "@/components/ui/AdBanner";

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export default function QuizPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      <MemphisBackground />

      <header className="flex w-full max-w-3xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <span className="w-12" />
      </header>

      <motion.h1
        initial={{ opacity: 0, y: -24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="mt-2 text-center text-4xl font-black uppercase italic sm:text-5xl"
      >
        Modos de <span className="text-[var(--color-green)]">Quiz</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="mt-2 text-center text-[var(--color-gray-light)]/80"
      >
        Elige cómo quieres jugar
      </motion.p>

      <motion.div
        variants={grid}
        initial="hidden"
        animate="show"
        className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {MODES.map((mode, i) => {
          const href = mode.id === "por-mundial" ? "/play/por-mundial" : `/play/${mode.id}`;
          return <ModeCard key={mode.id} mode={mode} href={href} index={i} />;
        })}
      </motion.div>

      <AdBanner className="mt-10 w-full max-w-3xl" />
    </main>
  );
}
