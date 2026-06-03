"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Frown, RotateCcw, Target, Timer, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { Board, MAX_ATTEMPTS } from "@/components/incognita/Board";
import { Keyboard } from "@/components/incognita/Keyboard";
import { Toast } from "@/components/incognita/Toast";
import { normalize } from "@/lib/incognita/normalize";
import { isValidGuess } from "@/lib/incognita/dictionary";
import { keyboardState } from "@/lib/incognita/keyboardState";
import { getRandomAnswer } from "@/lib/incognita/daily";
import { sfx } from "@/lib/sound";
import type { Categoria } from "@/lib/incognita/data/answers";

type GameStatus = "playing" | "won" | "lost";

interface Puzzle {
  word: string;
  hint: string;
  category: Categoria;
}

function sanitizeChar(k: string): string | null {
  if (k.length !== 1) return null;
  const n = normalize(k);
  return /^[A-ZÑ]$/.test(n) ? n : null;
}

// Segundos → M:SS
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function IncognitaPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<GameStatus>("playing");
  const [toast, setToast] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // segundos transcurridos
  const startRef = useRef<number | null>(null);

  // Una incógnita distinta cada vez que se entra (aleatoria). Se elige solo en
  // cliente (Math.random) para evitar mismatch de hidratación; el juego siempre
  // empieza de cero al entrar. Aquí arranca también el cronómetro.
  useEffect(() => {
    const ans = getRandomAnswer();
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPuzzle({ word: ans.word, hint: ans.hint, category: ans.category });
  }, []);

  // Cronómetro: corre mientras se juega; se detiene al terminar.
  useEffect(() => {
    if (status !== "playing" || !puzzle) return;
    const id = window.setInterval(() => {
      if (startRef.current != null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [status, puzzle]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }, []);

  const submit = useCallback(() => {
    if (!puzzle || status !== "playing") return;
    if (current.length < puzzle.word.length) {
      flash("Faltan letras");
      return;
    }
    if (!isValidGuess(current)) {
      flash("No está en la lista");
      return;
    }
    const nextGuesses = [...guesses, current];
    const won = normalize(current) === puzzle.word;
    const nextStatus: GameStatus = won
      ? "won"
      : nextGuesses.length >= MAX_ATTEMPTS
        ? "lost"
        : "playing";
    setGuesses(nextGuesses);
    setCurrent("");
    setStatus(nextStatus);
    if (nextStatus !== "playing" && startRef.current != null) {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000)); // tiempo final exacto
    }
    if (nextStatus === "won") sfx.win();
    else if (nextStatus === "lost") sfx.lose();
  }, [puzzle, status, current, guesses, flash]);

  const addChar = useCallback(
    (c: string) => {
      if (!puzzle || status !== "playing") return;
      setCurrent((prev) => {
        if (prev.length >= puzzle.word.length) return prev;
        sfx.key();
        return prev + c;
      });
    },
    [puzzle, status],
  );

  const backspace = useCallback(() => {
    if (status !== "playing") return;
    setCurrent((prev) => prev.slice(0, -1));
  }, [status]);

  // Continuar: arranca una incógnita nueva sin salir del juego.
  const restart = useCallback(() => {
    sfx.tap();
    const ans = getRandomAnswer();
    startRef.current = Date.now();
    setGuesses([]);
    setCurrent("");
    setElapsed(0);
    setStatus("playing");
    setPuzzle({ word: ans.word, hint: ans.hint, category: ans.category });
  }, []);

  // Teclado físico.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        submit();
        return;
      }
      if (e.key === "Backspace") {
        backspace();
        return;
      }
      const c = sanitizeChar(e.key);
      if (c) addChar(c);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, backspace, addChar]);

  if (!puzzle) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }

  const kbState = keyboardState(guesses, puzzle.word);
  const finished = status !== "playing";
  const won = status === "won";

  return (
    <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <MemphisBackground />
      {status === "won" && <Confetti pieces={56} />}
      <Toast message={toast} />

      <header className="flex w-full max-w-xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="text-lg font-black sm:text-xl">
          La Incógnita<span className="text-[var(--color-green)]"> Mundialera</span>
        </h1>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold tabular-nums">
          <Timer className="h-4 w-4 text-[var(--color-green)]" aria-hidden />
          {formatTime(elapsed)}
        </span>
      </header>

      {/* Pista */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold"
      >
        <span
          className="rounded-full px-2 py-0.5 text-xs font-black uppercase"
          style={{
            backgroundColor:
              puzzle.category === "jugador" ? "var(--color-green)" : "var(--color-red)",
            color: puzzle.category === "jugador" ? "var(--color-navy-deep)" : "#fff",
          }}
        >
          {puzzle.category}
        </span>
        <span className="text-[var(--color-gray-light)]">{puzzle.hint}</span>
      </motion.div>

      <Board answer={puzzle.word} guesses={guesses} current={current} />

      {finished ? (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--color-navy)] shadow-2xl ring-1 ring-white/10"
        >
          {/* Banda de cancha con el resultado */}
          <div
            className="relative flex h-20 items-center justify-center overflow-hidden"
            style={{
              backgroundColor: won ? "var(--color-green)" : "var(--color-red)",
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 18px, rgba(255,255,255,0) 18px 36px)",
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
              className="relative z-10"
            >
              {won ? (
                <Trophy className="h-9 w-9 text-white drop-shadow" aria-hidden />
              ) : (
                <Frown className="h-9 w-9 text-white drop-shadow" aria-hidden />
              )}
            </motion.span>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <p
              className="text-2xl font-black uppercase italic"
              style={{ color: won ? "var(--color-green)" : "var(--color-red)" }}
            >
              {won ? "¡Lo sacaste!" : "¡Casi!"}
            </p>

            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
              La incógnita era
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {puzzle.word.split("").map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ rotateX: 90 }}
                  animate={{ rotateX: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.25 }}
                  className="grid h-9 w-9 place-items-center rounded-md text-lg font-black"
                  style={{
                    backgroundColor: won ? "var(--color-green)" : "var(--color-red)",
                    color: won ? "var(--color-navy-deep)" : "#ffffff",
                    transformPerspective: 400,
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            <div className="mt-1 flex gap-2">
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold tabular-nums">
                <Target className="h-4 w-4 text-[var(--color-green)]" aria-hidden />
                {guesses.length}/{MAX_ATTEMPTS}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold tabular-nums">
                <Timer className="h-4 w-4 text-[var(--color-green)]" aria-hidden />
                {formatTime(elapsed)}
              </span>
            </div>

            <motion.button
              onClick={restart}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="mt-2 flex items-center gap-2 rounded-2xl bg-[var(--color-green)] px-7 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_6px_0_0_#2c8a2b]"
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
              Continuar
            </motion.button>
            <Link href="/" className="text-xs font-bold text-[var(--color-gray-light)]/60 hover:text-white">
              Volver al inicio
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="mt-auto w-full">
          <Keyboard
            states={kbState}
            onChar={addChar}
            onEnter={submit}
            onBackspace={backspace}
            disabled={finished}
          />
        </div>
      )}
    </main>
  );
}
