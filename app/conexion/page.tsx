"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PlayerCard, type Reveal } from "@/components/conexion/PlayerCard";
import { Button } from "@/components/ui/Button";
import { generarRonda, type Ronda } from "@/lib/conexion/generate";
import { sfx } from "@/lib/sound";

const VIDAS = 3;

export default function ConexionPage() {
  const [ronda, setRonda] = useState<Ronda | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"playing" | "revealed" | "gameover">("playing");
  const [lives, setLives] = useState(VIDAS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Ronda inicial solo en cliente (Math.random → evita mismatch de hidratación).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setRonda(generarRonda());
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (status !== "playing") return;
      sfx.tap();
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (next.size < 3) next.add(id);
        return next;
      });
    },
    [status],
  );

  const comprobar = useCallback(() => {
    if (!ronda || status !== "playing" || selected.size !== 3) return;
    const correct = ronda.matchIds.every((id) => selected.has(id));
    setLastCorrect(correct);
    if (correct) {
      sfx.correct();
      setScore((s) => s + 100 * (streak + 1));
      setStreak((k) => k + 1);
      setStatus("revealed");
    } else {
      sfx.wrong();
      setStreak(0);
      const left = lives - 1;
      setLives(left);
      setStatus(left <= 0 ? "gameover" : "revealed");
    }
  }, [ronda, status, selected, streak, lives]);

  const siguiente = useCallback(() => {
    setRonda(generarRonda());
    setSelected(new Set());
    setShowHint(false);
    setStatus("playing");
  }, []);

  const reiniciar = useCallback(() => {
    sfx.tap();
    setLives(VIDAS);
    setScore(0);
    setStreak(0);
    setRonda(generarRonda());
    setSelected(new Set());
    setShowHint(false);
    setStatus("playing");
  }, []);

  if (!ronda) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }

  const revealOf = (id: string): Reveal => {
    if (status === "playing") return "none";
    if (ronda.matchIds.includes(id)) return "match";
    return selected.has(id) ? "wrong" : "none";
  };

  return (
    <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <MemphisBackground />
      {status === "revealed" && lastCorrect && <Confetti pieces={48} />}

      <header className="flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <span className="flex items-center gap-1 rounded-full bg-[var(--color-green)] px-3 py-1 text-sm font-extrabold text-[var(--color-navy-deep)]">
          <AnimatedNumber value={score} /> pts
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          {Array.from({ length: VIDAS }).map((_, i) => (
            <Heart
              key={i}
              className="h-4 w-4"
              style={{ color: i < lives ? "var(--color-red)" : "rgba(255,255,255,0.2)" }}
              fill={i < lives ? "var(--color-red)" : "transparent"}
            />
          ))}
        </span>
      </header>

      <h1 className="text-center text-xl font-black uppercase italic sm:text-2xl">
        La Conexión<span className="text-[var(--color-green)]"> Mundialera</span>
      </h1>
      <p className="-mt-2 text-center text-sm text-[var(--color-gray-light)]/80">
        Elige los <b className="text-white">3</b> jugadores que comparten algo
      </p>

      {/* Pista opcional */}
      {status === "playing" && (
        <button
          onClick={() => {
            setShowHint(true);
            sfx.tap();
          }}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[var(--color-gray-light)]"
        >
          <Lightbulb className="h-3.5 w-3.5 text-[var(--color-amber)]" />
          {showHint ? `Pista: ${ronda.tipo}` : "Ver pista"}
        </button>
      )}

      <div className="grid w-full max-w-md grid-cols-3 gap-2.5">
        {ronda.players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            selected={selected.has(p.id)}
            reveal={revealOf(p.id)}
            disabled={status !== "playing"}
            onToggle={() => toggle(p.id)}
          />
        ))}
      </div>

      {status === "playing" ? (
        <Button variant="primary" disabled={selected.size !== 3} onClick={comprobar}>
          Comprobar ({selected.size}/3)
        </Button>
      ) : status === "revealed" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-navy)] px-6 py-4 text-center ring-1 ring-white/10"
        >
          <p
            className="text-lg font-black"
            style={{ color: lastCorrect ? "var(--color-green)" : "var(--color-red)" }}
          >
            {lastCorrect ? "¡Conexión encontrada!" : "¡No era esa!"}
          </p>
          <p className="text-sm text-[var(--color-gray-light)]">{ronda.label}</p>
          <Button variant="primary" onClick={siguiente}>
            Siguiente →
          </Button>
        </motion.div>
      ) : (
        // gameover
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="flex flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] px-7 py-6 text-center shadow-2xl ring-1 ring-white/10"
        >
          <Trophy className="h-10 w-10 text-[var(--color-green)]" />
          <p className="text-2xl font-black uppercase italic">¡Fin!</p>
          <p className="text-sm text-[var(--color-gray-light)]">
            Puntaje: <span className="font-black text-white">{score}</span>
          </p>
          <p className="text-sm text-[var(--color-gray-light)]">{ronda.label}</p>
          <motion.button
            onClick={reiniciar}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="mt-1 flex items-center gap-2 rounded-2xl bg-[var(--color-green)] px-7 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_6px_0_0_#2c8a2b]"
          >
            <RotateCcw className="h-5 w-5" /> Jugar de nuevo
          </motion.button>
          <Link href="/" className="text-xs font-bold text-[var(--color-gray-light)]/60 hover:text-white">
            Volver al inicio
          </Link>
        </motion.div>
      )}
    </main>
  );
}
