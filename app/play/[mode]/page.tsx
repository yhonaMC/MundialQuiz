"use client";
import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMode, type GameMode } from "@/lib/modes/modes";
import { getTournament, TOURNAMENT_YEARS } from "@/lib/data";
import { useGameSession } from "@/hooks/useGameSession";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { QuestionCard } from "@/components/QuestionCard";
import { Hud } from "@/components/Hud";
import { Button } from "@/components/ui/Button";

function LoadingScreen() {
  return (
    <main className="relative flex flex-1 items-center justify-center p-6">
      <MemphisBackground />
      <p className="font-black">Cargando…</p>
    </main>
  );
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

  if (!mode) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <MemphisBackground />
        <p className="text-xl font-black">Modo no encontrado.</p>
        <Link href="/" className="underline">Volver al inicio</Link>
      </main>
    );
  }

  // "Por Mundial" sin año → mostrar selector de torneo.
  if (mode.id === "por-mundial" && !year) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <MemphisBackground />
        <h1 className="text-2xl font-black">Elige un Mundial</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOURNAMENT_YEARS.map((y) => {
            const t = getTournament(y)!;
            return (
              <Link
                key={y}
                href={`/play/por-mundial?year=${y}`}
                className="rounded-2xl bg-[var(--color-indigo-base)] px-5 py-4 text-center font-black shadow-lg ring-1 ring-white/10 hover:scale-105"
              >
                <div className="text-2xl text-[var(--color-gold)]">{y}</div>
                <div className="text-xs text-white/60">{t.hosts.join(", ")}</div>
              </Link>
            );
          })}
        </div>
        <Link href="/" className="text-sm underline text-white/60">Volver</Link>
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
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
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

  if (state.status === "gameover") {
    const answered = state.history.length;
    const correct = state.history.filter((h) => h.correct).length;
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <h1 className="text-3xl font-black">{state.cashedOut ? "¡Te retiraste a tiempo! 🪙" : "¡Fin del juego!"}</h1>
        <p className="text-6xl font-black text-[var(--color-gold)]">{state.score}</p>
        <p className="text-white/70">
          {correct} / {answered} aciertos
        </p>
        <div className="mt-4 flex gap-3">
          <Link href={`/play/${mode.id}${year ? `?year=${year}` : ""}`}>
            <Button variant="primary">Jugar de nuevo</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!state.currentQuestion) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando pregunta…</p>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
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
        onAnswer={answer}
        onNext={next}
        isLast={isLast}
      />

      {allowCashOut && state.status === "question" && state.score > 0 && (
        <Button variant="gold" onClick={cashOut}>
          Retirarme con {state.score} pts 🪙
        </Button>
      )}
    </main>
  );
}
