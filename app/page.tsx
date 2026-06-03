"use client";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { GameCard } from "@/components/GameCard";
import { AdBanner } from "@/components/ui/AdBanner";
import { conFoto } from "@/lib/db/queries";

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

// Fotos disponibles para las miniaturas del menú (estable SSR: PHOTOS es estático).
const FOTOS = conFoto();

// Avatar: foto del jugador si existe, si no una silueta.
function Avatar({ src, className, ring }: { src?: string; className: string; ring?: boolean }) {
  return (
    <span
      className={`block overflow-hidden bg-white/10 ${className} ${
        ring ? "ring-2 ring-[var(--color-green)]" : "ring-1 ring-white/15"
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <User className="h-1/2 w-1/2 text-white/40" />
        </span>
      )}
    </span>
  );
}

// Quiz: stack vertical de opciones con ??? (una correcta).
function QuizStack() {
  const rows = [true, false, false];
  return (
    <div className="flex w-36 flex-col gap-1.5">
      {rows.map((hl, i) => (
        <span
          key={i}
          className="rounded-lg px-3 py-1 text-center text-[11px] font-black tracking-widest"
          style={{
            backgroundColor: hl ? "var(--color-green)" : "rgba(255,255,255,0.12)",
            color: hl ? "var(--color-navy-deep)" : "#fff",
          }}
        >
          ???
        </span>
      ))}
    </div>
  );
}

// La Incógnita: fichas estilo Wordle.
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

// La Conexión: 6 mini-fotos sin nombre, 3 "conectadas" (anillo verde).
function ConexionMini() {
  const f = FOTOS.slice(0, 6);
  const connected = new Set([0, 2, 4]);
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Avatar key={i} src={f[i]?.foto?.archivo} ring={connected.has(i)} className="h-9 w-9 rounded-lg" />
      ))}
    </div>
  );
}

// ¿Quién es?: una foto con interrogante.
function QuienEsMini() {
  return (
    <div className="relative">
      <Avatar src={FOTOS[0]?.foto?.archivo} className="h-12 w-12 rounded-full" />
      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-green)] text-sm font-black text-[var(--color-navy-deep)] ring-2 ring-[var(--color-navy)]">
        ?
      </span>
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
          href="/quiz"
          badge="Trivia"
          accent="var(--color-green)"
          title="Quiz"
          subtitle="7 modos de trivia mundialista. Responde, suma puntos y supera tus rachas."
          visual={<QuizStack />}
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
          visual={<ConexionMini />}
        />
        <GameCard
          href="/quien-es"
          accent="var(--color-green)"
          title="¿Quién es?"
          subtitle="Adivina el jugador por su foto entre varias opciones. Suma puntos y rachas."
          visual={<QuienEsMini />}
        />
      </motion.div>

      {/* Anuncio al pie (no intrusivo; solo aparece si hay slot configurado) */}
      <AdBanner className="mt-10 w-full max-w-2xl" />
    </main>
  );
}
