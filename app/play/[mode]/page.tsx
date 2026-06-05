"use client";
import { Suspense, use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Shuffle, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getMode, type GameMode } from "@/lib/modes/modes";
import { getTournament, TOURNAMENT_YEARS } from "@/lib/data";
import { useGameSession } from "@/hooks/useGameSession";
import { questionHint } from "@/lib/hints";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { LoaderScreen } from "@/components/ui/Loader";
import { Announce, useAnnounce } from "@/components/ui/Announce";
import { QuestionCard } from "@/components/QuestionCard";
import { Hud } from "@/components/Hud";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function LoadingScreen() {
  return <LoaderScreen label="Cargando" />;
}

// useSearchParams debe vivir dentro de un boundary de Suspense (requisito de Next 16).
export default function PlayPage({ params }: PageProps<"/play/[mode]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayResolver params={params} />
    </Suspense>
  );
}

function PlayResolver({ params }: { params: PageProps<"/play/[mode]">["params"] }) {
  const { mode: modeId } = use(params);
  const mode = getMode(modeId);
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const mixed = searchParams.get("mix") === "1";

  if (!mode) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <MemphisBackground />
        <p className="text-xl font-black">Modo no encontrado.</p>
        <Link href="/" className="underline">Volver al inicio</Link>
      </main>
    );
  }

  // Antes de empezar cualquier modo: elegir Mundial (Mezclado = todos los años, o uno).
  const chosen = mixed || year !== undefined;
  if (!chosen) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <MemphisBackground />
        <motion.h1
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="text-center text-3xl font-black uppercase italic"
        >
          {mode.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center text-[var(--color-gray-light)]/80"
        >
          ¿De qué Mundial quieres las preguntas?
        </motion.p>

        {/* Mezclado: todos los años */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-md"
        >
          <Link
            href={`/play/${mode.id}?mix=1`}
            className="flex items-center justify-center gap-2 rounded-3xl bg-[var(--color-green)] px-6 py-5 text-center text-lg font-black uppercase italic text-[var(--color-navy-deep)] shadow-xl"
          >
            <Shuffle className="h-5 w-5" /> Mezclado · todos los años
          </Link>
        </motion.div>

        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/50">
          o elige una edición
        </span>

        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {TOURNAMENT_YEARS.map((y) => {
            const t = getTournament(y)!;
            return (
              <motion.div
                key={y}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 360, damping: 18 } },
                }}
                whileHover={{ y: -5, scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
              >
                <Link
                  href={`/play/${mode.id}?year=${y}`}
                  className="block rounded-2xl bg-[var(--color-navy)] px-5 py-4 text-center font-black shadow-lg ring-1 ring-white/10"
                >
                  <div className="text-2xl text-[var(--color-green)]">{y}</div>
                  <div className="text-xs text-[var(--color-gray-light)]/70">{t.hosts.join(", ")}</div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
        <Link href="/quiz" className="text-sm underline text-[var(--color-gray-light)]/70">
          Volver
        </Link>
      </main>
    );
  }

  return <Game modeId={mode.id} year={year} />;
}

function Game({ modeId, year }: { modeId: string; year?: number }) {
  const mode = getMode(modeId)!;
  // Semilla generada en cliente tras montar (no en render SSR), para evitar
  // un mismatch de hidratación: las preguntas dependen del RNG sembrado, así
  // que la semilla debe fijarse solo en el cliente. Es el patrón recomendado
  // por React para leer valores solo-de-navegador (Date.now) dentro de un effect.
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semilla solo-cliente intencional
    setSeed(Date.now() >>> 0);
  }, []);

  if (seed === null) {
    return <LoaderScreen label="Cargando" />;
  }
  return <GameInner mode={mode} seed={seed} year={year} />;
}

function GameInner({
  mode,
  seed,
  year,
}: {
  mode: GameMode;
  seed: number;
  year?: number;
}) {
  const { state, feedback, answer, next, cashOut, totalQuestions, isLast, allowCashOut } = useGameSession(
    mode,
    seed,
    year,
  );
  const [confirmExit, setConfirmExit] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const { announce, fire } = useAnnounce();
  const announcedRef = useRef(false);

  useEffect(() => {
    if (state.status === "gameover" && !announcedRef.current) {
      announcedRef.current = true;
      const correct = state.history.filter((h) => h.correct).length;
      const won = correct > 0;
      const t = setTimeout(
        () => fire(won ? "¡Bien jugado!" : "Fin", { variant: won ? "win" : "lose", sub: `${state.score} pts`, ms: 2600 }),
        0,
      );
      return () => clearTimeout(t);
    }
  }, [state.status, state.history, state.score, fire]);

  if (state.status === "gameover") {
    const answered = state.history.length;
    const correct = state.history.filter((h) => h.correct).length;
    const won = correct > 0;
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <Announce data={announce} />
        {won && <Confetti pieces={48} />}
        <motion.h1
          initial={{ opacity: 0, y: -24, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="flex items-center justify-center gap-2 text-3xl font-black"
        >
          {state.cashedOut && <Coins className="h-7 w-7 text-[var(--color-green)]" aria-hidden />}
          {state.cashedOut ? "¡Te retiraste a tiempo!" : "¡Fin del juego!"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.15 }}
          className="text-6xl font-black text-[var(--color-green)]"
        >
          <AnimatedNumber value={state.score} />
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[var(--color-gray-light)]/80"
        >
          {correct} / {answered} aciertos
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 18 }}
          className="mt-4 flex gap-3"
        >
          <Link href={`/play/${mode.id}${year ? `?year=${year}` : ""}`}>
            <Button variant="primary">Jugar de nuevo</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
        </motion.div>
      </main>
    );
  }

  if (!state.currentQuestion) {
    return <LoaderScreen label="Cargando pregunta" />;
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />

      <div className="flex w-full max-w-xl items-center">
        <button
          onClick={() => setConfirmExit(true)}
          className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden /> Salir
        </button>
      </div>

      <Hud
        score={state.score}
        streak={state.streak}
        lives={state.lives}
        timeRemaining={state.timeRemaining}
        questionNumber={state.questionNumber}
        totalQuestions={totalQuestions}
      />

      <QuestionCard
        question={state.currentQuestion}
        feedback={feedback}
        onAnswer={(i) => answer(i, usedHint)}
        onNext={() => {
          setUsedHint(false);
          next();
        }}
        isLast={isLast}
        hint={questionHint(state.currentQuestion)}
        onHint={() => setUsedHint(true)}
      />

      {allowCashOut && state.status === "question" && state.score > 0 && (
        <Button variant="accent" onClick={cashOut} className="flex items-center gap-2">
          <Coins className="h-5 w-5" aria-hidden /> Retirarme con {state.score} pts
        </Button>
      )}

      {/* Modal de confirmación para salir */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmExit(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[var(--color-navy)] p-6 text-center shadow-2xl ring-1 ring-white/10"
            >
              <p className="text-xl font-black">¿Salir del quiz?</p>
              <p className="mt-1 text-sm text-[var(--color-gray-light)]/80">
                Perderás el progreso de esta partida.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button variant="ghost" onClick={() => setConfirmExit(false)}>
                  Seguir jugando
                </Button>
                <Link href="/quiz">
                  <Button variant="accent">Salir</Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
