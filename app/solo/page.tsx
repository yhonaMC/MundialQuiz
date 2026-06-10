"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { GameCard } from "@/components/GameCard";
import { AdBanner } from "@/components/ui/AdBanner";
import { conFoto } from "@/lib/db/queries";

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const FOTOS = conFoto();

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

function MiniTiles() {
  const tiles: [string, string, string][] = [
    ["M", "var(--color-green)", "var(--color-navy-deep)"],
    ["E", "var(--color-amber)", "var(--color-navy-deep)"],
    ["S", "rgba(255,255,255,0.25)", "#fff"],
  ];
  return (
    <div className="flex gap-1.5">
      {tiles.map(([l, bg, fg], i) => (
        <span key={i} className="grid h-11 w-11 place-items-center rounded-lg text-xl font-black" style={{ backgroundColor: bg, color: fg }}>
          {l}
        </span>
      ))}
    </div>
  );
}

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

function RejillaMini() {
  // 3×3: dos casillas resueltas con foto, el resto pendientes.
  const conFotoCeldas = new Map<number, string | undefined>([
    [1, FOTOS[1]?.foto?.archivo],
    [5, FOTOS[3]?.foto?.archivo],
  ]);
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, i) =>
        conFotoCeldas.has(i) ? (
          <Avatar key={i} src={conFotoCeldas.get(i)} className="h-9 w-9 rounded-md" ring />
        ) : (
          <span key={i} className="h-9 w-9 rounded-md bg-white/10 ring-1 ring-white/15" />
        ),
      )}
    </div>
  );
}

export default function SoloPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      <MemphisBackground />

      <div className="flex w-full max-w-2xl items-center">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Link>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: -24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="mt-2 text-center text-4xl font-black uppercase italic sm:text-5xl"
      >
        Jugar <span className="text-[var(--color-green)]">solo</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mt-2 text-center text-[var(--color-gray-light)]/80">
        Elige un juego
      </motion.p>

      <motion.div variants={grid} initial="hidden" animate="show" className="mt-8 grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <GameCard href="/quiz" badge="Trivia" accent="var(--color-green)" title="Quiz" subtitle="6 modos de trivia mundialista. Responde, suma puntos y supera tus rachas." visual={<QuizStack />} />
        <GameCard href="/incognita" accent="var(--color-amber)" title={<>La Incógnita<br />Mundialera</>} subtitle="Adivina el jugador o la selección oculta en 6 intentos. ¡Una distinta cada vez!" visual={<MiniTiles />} />
        <GameCard href="/conexion" accent="var(--color-red)" title={<>La Conexión<br />Mundialera</>} subtitle="6 jugadores, 3 comparten algo. Descubre la conexión y selecciónalos." visual={<ConexionMini />} />
        <GameCard href="/quien-es" accent="var(--color-green)" title="¿Quién es?" subtitle="Adivina el jugador por su foto entre varias opciones. Suma puntos y rachas." visual={<QuienEsMini />} />
        <GameCard href="/rejilla" badge="Difícil" accent="var(--color-cyan)" title={<>Rejilla<br />Mundialera</>} subtitle="Rellena la grilla 3×3: un jugador que cumpla el cruce de cada fila y columna." visual={<RejillaMini />} />
      </motion.div>

      <AdBanner className="mt-10 w-full max-w-2xl" />
    </main>
  );
}
