"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Hand, Trophy, Users } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Marcador } from "@/components/penales/Marcador";
import { MultipleChoice } from "@/components/formats/MultipleChoice";
import { TrueFalse } from "@/components/formats/TrueFalse";
import { OddOneOut } from "@/components/formats/OddOneOut";
import { NumberInput } from "@/components/formats/NumberInput";
import { usePenales } from "@/hooks/usePenales";
import { AI_GOAL_PROBABILITY, NIVELES, NIVEL_LABEL, type Nivel } from "@/lib/penales/ai";
import { loadData } from "@/lib/storage/localStore";

export default function PenalesPage() {
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [gameKey, setGameKey] = useState(0);

  // Semilla solo-cliente (post-mount) para evitar mismatch de hidratación.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semilla solo-cliente intencional
    setSeed(Date.now() >>> 0);
  }, []);

  const replay = () => {
    setSeed(Date.now() >>> 0);
    setGameKey((k) => k + 1);
  };

  if (!nivel) {
    return <LevelSelect mounted={seed !== null} onPick={setNivel} />;
  }
  if (seed === null) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }
  return (
    <PenalesGame
      key={gameKey}
      nivel={nivel}
      seed={seed}
      onReplay={replay}
      onChangeLevel={() => setNivel(null)}
    />
  );
}

function LevelSelect({ mounted, onPick }: { mounted: boolean; onPick: (n: Nivel) => void }) {
  // El récord se lee solo tras montar (localStorage no existe en SSR).
  const record = mounted ? loadData().penales : {};
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <MemphisBackground />
      <h1 className="text-center text-3xl font-black uppercase italic">Penales Quiz</h1>
      <p className="max-w-md text-center text-sm text-[var(--color-gray-light)]/80">
        Cada pregunta es un penal: acierta y es gol, falla y lo ataja el portero. Gana la tanda al
        mejor de 5. Empate = muerte súbita. Elige un nivel para retar a la IA, o juega contra tus
        amigos en multijugador.
      </p>
      <div className="grid w-full max-w-md gap-3">
        {NIVELES.map((n) => {
          const r = record[n];
          return (
            <motion.button
              key={n}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(n)}
              className="flex items-center justify-between rounded-2xl bg-[var(--color-navy)] px-5 py-4 text-left shadow-lg ring-1 ring-white/10"
            >
              <span>
                <span className="block text-lg font-black">{NIVEL_LABEL[n]}</span>
                <span className="text-xs text-[var(--color-gray-light)]/70">
                  La IA anota el {Math.round(AI_GOAL_PROBABILITY[n] * 100)}% de sus penales
                </span>
              </span>
              <span className="text-xs font-bold text-[var(--color-gray-light)]/70">
                {r ? `${r.ganados}G · ${r.perdidos}P` : "—"}
              </span>
            </motion.button>
          );
        })}
      </div>
      <Link
        href="/multijugador"
        className="flex w-full max-w-md items-center justify-between rounded-2xl bg-[var(--color-green)] px-5 py-4 font-black text-[var(--color-navy-deep)] shadow-lg"
      >
        <span className="flex items-center gap-2"><Users className="h-5 w-5" /> Jugar de 2 o más</span>
        <span className="text-xs font-bold uppercase">Multijugador →</span>
      </Link>
      <Link href="/" className="text-sm text-white/60 underline">
        Volver al inicio
      </Link>
    </main>
  );
}

function PenalesGame({
  nivel,
  seed,
  onReplay,
  onChangeLevel,
}: {
  nivel: Nivel;
  seed: number;
  onReplay: () => void;
  onChangeLevel: () => void;
}) {
  const { state, question, lastPlayerGoal, lastAiGoal, answer, aiShot, nextRound, playerGoals, aiGoals } =
    usePenales(nivel, seed);

  if (state.phase === "gameover") {
    const won = state.winner === "player";
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        {won && <Confetti pieces={36} />}
        {won ? <Trophy className="h-12 w-12 text-[var(--color-amber)]" /> : <Hand className="h-12 w-12 text-[var(--color-red)]" />}
        <h1 className="text-3xl font-black uppercase italic">
          {won ? "¡Ganaste la tanda!" : "La IA ganó esta vez…"}
        </h1>
        <p className="text-6xl font-black">
          <span style={{ color: "var(--color-green)" }}>{playerGoals}</span>
          <span className="text-white/40"> - </span>
          <span style={{ color: won ? "var(--color-gray-light)" : "var(--color-red)" }}>{aiGoals}</span>
        </p>
        <Marcador
          playerShots={state.playerShots}
          aiShots={state.aiShots}
          suddenDeath={state.suddenDeath}
          round={state.round}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={onReplay}>
            Jugar de nuevo
          </Button>
          <Button variant="ghost" onClick={onChangeLevel}>
            Cambiar nivel
          </Button>
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando penal…</p>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-xs font-bold text-[var(--color-gray-light)]/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
      </div>
      <Marcador
        playerShots={state.playerShots}
        aiShots={state.aiShots}
        suddenDeath={state.suddenDeath}
        round={state.round}
      />

      <div className="relative w-full max-w-xl rounded-3xl bg-[var(--color-navy)] p-6 shadow-2xl ring-1 ring-white/10">
        <span className="mb-3 inline-block rounded-full bg-[var(--color-green)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--color-navy-deep)]">
          {state.suddenDeath ? "Muerte súbita" : `Penal ${state.round} de 5`} · {NIVEL_LABEL[nivel]}
        </span>

        <h2 className="mb-5 text-xl font-black leading-tight sm:text-2xl">{question.prompt}</h2>

        {state.phase === "question" && (
          <>
            {question.format === "multiple-choice" && (
              <MultipleChoice question={question} onAnswer={answer} />
            )}
            {question.format === "odd-one-out" && <OddOneOut question={question} onAnswer={answer} />}
            {question.format === "true-false" && <TrueFalse question={question} onAnswer={answer} />}
            {question.format === "number" && <NumberInput question={question} onAnswer={answer} />}
          </>
        )}

        {state.phase === "player-feedback" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white/10 p-4 text-center"
          >
            {lastPlayerGoal && <Confetti pieces={18} />}
            <p
              className="flex items-center justify-center gap-2 text-3xl font-black uppercase italic"
              style={{ color: lastPlayerGoal ? "var(--color-green)" : "var(--color-red)" }}
            >
              {lastPlayerGoal ? <><Check className="h-7 w-7" /> ¡GOOOL!</> : <><Hand className="h-7 w-7" /> ¡Atajado!</>}
            </p>
            <p className="mt-2 text-sm text-white/80">{question.explanation}</p>
            <div className="mt-4">
              <Button variant="accent" onClick={aiShot}>
                {state.winner !== null ? "Ver resultado" : "Tira la IA →"}
              </Button>
            </div>
          </motion.div>
        )}

        {state.phase === "ai-feedback" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white/10 p-4 text-center"
          >
            <p
              className="flex items-center justify-center gap-2 text-3xl font-black uppercase italic"
              style={{ color: lastAiGoal ? "var(--color-red)" : "var(--color-green)" }}
            >
              {lastAiGoal ? <>La IA anotó <Check className="h-7 w-7" /></> : <>¡La IA falló! <Hand className="h-7 w-7" /></>}
            </p>
            <div className="mt-4">
              <Button variant="accent" onClick={nextRound}>
                {state.winner !== null ? "Ver resultado" : "Siguiente penal →"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
