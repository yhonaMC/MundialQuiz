"use client";
import { motion } from "framer-motion";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { GameCard } from "@/components/GameCard";

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

// Mini casillas estilo Wordle para la card de La Incógnita.
// Tres fichas de jugador: dos "conectadas" (verde) y una fuera (gris).
function Tokens() {
  const toks: [string, string][] = [
    ["var(--color-green)", "var(--color-navy-deep)"],
    ["var(--color-green)", "var(--color-navy-deep)"],
    ["rgba(255,255,255,0.25)", "#fff"],
  ];
  return (
    <div className="flex gap-1.5">
      {toks.map(([bg, fg], i) => (
        <span
          key={i}
          className="grid h-10 w-10 place-items-center rounded-full text-sm font-black"
          style={{ backgroundColor: bg, color: fg }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

// Silueta misteriosa para "¿Quién es?".
function MysteryFace() {
  return (
    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-4xl font-black text-white ring-2 ring-white/30">
      ?
    </span>
  );
}

function MiniTiles() {
  const tiles: [string, string, string][] = [
    ["M", "var(--color-green)", "var(--color-navy-deep)"],
    ["E", "var(--color-amber)", "var(--color-navy-deep)"],
    ["S", "rgba(255,255,255,0.25)", "#fff"],
  ];
  return (
    <div className="flex gap-1.5">
      {tiles.map(([l, bg, fg], i) => (
        <span
          key={i}
          className="grid h-11 w-11 place-items-center rounded-lg text-xl font-black"
          style={{ backgroundColor: bg, color: fg }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-12">
      <MemphisBackground />

      <motion.h1
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="text-center text-5xl font-black uppercase italic sm:text-6xl"
      >
        Mundial<span className="text-[var(--color-green)]">Trivia</span>
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
          href="/quiz"
          badge="Trivia"
          accent="var(--color-green)"
          title="Quiz"
          subtitle="6 modos de trivia mundialista. Responde, suma puntos y supera tus rachas."
          visual={
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-4xl font-black italic text-[var(--color-green)]">
              ?
            </span>
          }
        />
        <GameCard
          href="/incognita"
          accent="var(--color-amber)"
          title={<>La Incógnita<br />Mundialera</>}
          subtitle="Adivina el jugador o la selección oculta en 6 intentos. ¡Una distinta cada vez!"
          visual={<MiniTiles />}
        />
        <GameCard
          href="/conexion"
          accent="var(--color-red)"
          title={<>La Conexión<br />Mundialera</>}
          subtitle="6 jugadores, 3 comparten algo. Descubre la conexión y selecciónalos."
          visual={<Tokens />}
        />
        <GameCard
          href="/quien-es"
          accent="var(--color-green)"
          title="¿Quién es?"
          subtitle="Adivina el jugador por su foto entre varias opciones. Suma puntos y rachas."
          visual={<MysteryFace />}
        />
      </motion.div>
    </main>
  );
}
