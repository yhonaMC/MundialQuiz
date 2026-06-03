"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, RotateCcw, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { generarRondaQ, type RondaQ } from "@/lib/quienes/generate";
import { sfx } from "@/lib/sound";

const VIDAS = 3;

export default function QuienEsPage() {
  const [ronda, setRonda] = useState<RondaQ | null>(null);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<"playing" | "revealed" | "gameover">("playing");
  const [lives, setLives] = useState(VIDAS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente (fotos + random)
    setRonda(generarRondaQ());
    setReady(true);
  }, []);

  const responder = useCallback(
    (i: number) => {
      if (!ronda || status !== "playing") return;
      const correct = i === ronda.correcta;
      setPicked(i);
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
    },
    [ronda, status, streak, lives],
  );

  const siguiente = useCallback(() => {
    setRonda(generarRondaQ());
    setPicked(null);
    setStatus("playing");
  }, []);

  const reiniciar = useCallback(() => {
    sfx.tap();
    setLives(VIDAS);
    setScore(0);
    setStreak(0);
    setRonda(generarRondaQ());
    setPicked(null);
    setStatus("playing");
  }, []);

  if (!ready) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }

  // Sin fotos descargadas todavía.
  if (!ronda) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <h1 className="text-2xl font-black uppercase italic">¿Quién es?</h1>
        <p className="max-w-sm text-[var(--color-gray-light)]/80">
          Aún no hay fotos descargadas. Corre <code className="rounded bg-white/10 px-1.5 py-0.5">node scripts/build-images.mjs</code> y vuelve.
        </p>
        <Link href="/" className="text-sm underline text-[var(--color-gray-light)]/70">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const optColor = (i: number): { bg: string; fg: string } => {
    if (status === "playing") return { bg: "rgba(255,255,255,0.1)", fg: "#fff" };
    if (i === ronda.correcta) return { bg: "var(--color-green)", fg: "var(--color-navy-deep)" };
    if (i === picked) return { bg: "var(--color-red)", fg: "#fff" };
    return { bg: "rgba(255,255,255,0.05)", fg: "rgba(255,255,255,0.5)" };
  };

  return (
    <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <MemphisBackground />
      {status === "revealed" && picked === ronda.correcta && <Confetti pieces={48} />}

      <header className="flex w-full max-w-sm items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <span className="flex items-center gap-1 rounded-full bg-[var(--color-green)] px-3 py-1 text-sm font-extrabold text-[var(--color-navy-deep)]">
          <AnimatedNumber value={score} /> pts
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          {Array.from({ length: VIDAS }).map((_, i) => (
            <Heart key={i} className="h-4 w-4" style={{ color: i < lives ? "var(--color-red)" : "rgba(255,255,255,0.2)" }} fill={i < lives ? "var(--color-red)" : "transparent"} />
          ))}
        </span>
      </header>

      <h1 className="text-center text-xl font-black uppercase italic sm:text-2xl">¿Quién es?</h1>

      {status === "gameover" ? (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="flex flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] px-7 py-6 text-center shadow-2xl ring-1 ring-white/10"
        >
          <Trophy className="h-10 w-10 text-[var(--color-green)]" />
          <p className="text-2xl font-black uppercase italic">¡Fin!</p>
          <p className="text-sm text-[var(--color-gray-light)]">Puntaje: <span className="font-black text-white">{score}</span></p>
          <motion.button onClick={reiniciar} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} className="mt-1 flex items-center gap-2 rounded-2xl bg-[var(--color-green)] px-7 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_6px_0_0_#2c8a2b]">
            <RotateCcw className="h-5 w-5" /> Jugar de nuevo
          </motion.button>
          <Link href="/" className="text-xs font-bold text-[var(--color-gray-light)]/60 hover:text-white">Volver al inicio</Link>
        </motion.div>
      ) : (
        <>
          {/* Foto */}
          <div className="h-44 w-44 overflow-hidden rounded-3xl bg-white/5 shadow-2xl ring-1 ring-white/10 sm:h-52 sm:w-52">
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public */}
            <img src={ronda.player.foto!.archivo} alt="¿Quién es este jugador?" className="h-full w-full object-cover" />
          </div>
          <p className="-mt-1 max-w-[13rem] text-center text-[10px] text-[var(--color-gray-light)]/50">
            Foto: {ronda.player.foto!.autor} · {ronda.player.foto!.licencia}
          </p>

          {/* Opciones */}
          <div className="grid w-full max-w-sm gap-2.5">
            {ronda.opciones.map((nombre, i) => {
              const c = optColor(i);
              return (
                <motion.button
                  key={i}
                  onClick={() => responder(i)}
                  disabled={status !== "playing"}
                  whileTap={status === "playing" ? { scale: 0.97 } : undefined}
                  style={{ backgroundColor: c.bg, color: c.fg }}
                  className="rounded-2xl px-5 py-3 text-left font-extrabold ring-1 ring-white/10"
                >
                  {nombre}
                </motion.button>
              );
            })}
          </div>

          {status === "revealed" && (
            <Button variant="primary" onClick={siguiente}>
              Siguiente →
            </Button>
          )}
        </>
      )}
    </main>
  );
}
