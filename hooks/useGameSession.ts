"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TOURNAMENTS } from "@/lib/data";
import { createRng, type Rng } from "@/lib/engine/rng";
import { generateQuestion, type TournamentFilter } from "@/lib/engine/generateQuestion";
import { sessionReducer, initialSessionState } from "@/lib/engine/gameSession";
import { scoreAnswer, numericCloseness } from "@/lib/engine/scoring";
import { nextDifficulty } from "@/lib/engine/difficulty";
import { loadData, recordGame, addSeenIds } from "@/lib/storage/localStore";
import { sfx } from "@/lib/sound";
import type { GameMode } from "@/lib/modes/modes";
import type { Question } from "@/lib/data/types";
import type { FeedbackInfo } from "@/components/QuestionCard";

// Semilla por carga: el caller la pasa para mantener pureza/SSR (ver página de juego).
export function useGameSession(mode: GameMode, seed: number, tournamentOverride?: number) {
  const rngRef = useRef<Rng>(createRng(seed));
  const seenRef = useRef<string[]>(loadData().seenIds);
  const newSeenRef = useRef<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackInfo | null>(null);
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const savedRef = useRef(false);

  const filter: TournamentFilter = useMemo(() => {
    if (tournamentOverride) return tournamentOverride;
    return mode.tournamentFilter;
  }, [mode.tournamentFilter, tournamentOverride]);

  const totalQuestions = mode.questionCount === "until-fail" ? null : mode.questionCount;

  const startDifficulty = mode.difficultyRange ? mode.difficultyRange[0] : mode.difficultyCurve === "ascending" ? 1 : 2;

  // En modo "sequential" (maratón) repartimos las preguntas equitativamente
  // entre los 7 torneos: 3 preguntas por torneo si questionCount = 21.
  const perTournament = totalQuestions ? Math.max(1, Math.floor(totalQuestions / TOURNAMENTS.length)) : 1;

  const pickQuestion = useCallback(
    (difficulty: number, ordinal: number): Question => {
      const clamped = mode.difficultyRange
        ? Math.min(mode.difficultyRange[1], Math.max(mode.difficultyRange[0], difficulty))
        : difficulty;
      const sequenceIndex =
        filter === "sequential" ? Math.floor(ordinal / perTournament) : 0;
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: clamped,
        tournamentFilter: filter,
        sequenceIndex,
        seenIds: [...seenRef.current, ...newSeenRef.current],
        rng: rngRef.current,
      });
      newSeenRef.current.push(q.id);
      return q;
    },
    [filter, mode.difficultyRange, perTournament],
  );

  // Arranque: una sola vez.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const q = pickQuestion(startDifficulty, 0);
    dispatch({
      type: "START",
      question: q,
      difficulty: startDifficulty,
      lives: mode.lives ?? null,
      timeRemaining: mode.timer ? mode.timer.totalSeconds : null,
    });
  }, [mode.lives, mode.timer, pickQuestion, startDifficulty]);

  // Timer (modos con reloj).
  useEffect(() => {
    if (!mode.timer || state.status === "gameover" || state.status === "idle") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [mode.timer, state.status]);

  // Calcula la siguiente dificultad según la curva del modo.
  const computeNextDifficulty = useCallback(
    (current: number, recent: boolean[]): number => {
      switch (mode.difficultyCurve) {
        case "adaptive":
          return nextDifficulty(current, recent);
        case "ascending":
          return Math.min(5, current + 1);
        case "fixed":
        default:
          return current;
      }
    },
    [mode.difficultyCurve],
  );

  const answer = useCallback(
    (raw: number) => {
      if (state.status !== "question" || !state.currentQuestion) return;
      const q = state.currentQuestion;

      let correct: boolean;
      let closeness: number | undefined;
      if (q.format === "number") {
        closeness = numericCloseness(raw, q.numericAnswer!, q.tolerance!);
        correct = closeness > 0;
      } else {
        correct = raw === q.answerIndex;
      }
      // exacto: respuesta numérica idéntica (o acierto directo en no-numéricas).
      const exact = q.format === "number" ? raw === q.numericAnswer : correct;

      const timeRemainingRatio =
        mode.timer && state.timeRemaining != null ? state.timeRemaining / mode.timer.totalSeconds : undefined;

      const points = scoreAnswer({
        correct,
        difficulty: q.difficulty,
        streak: state.streak,
        base: mode.scoring.base,
        speedBonusMax: mode.scoring.speedBonusMax,
        streakMultiplierStep: mode.scoring.streakMultiplierStep,
        timeRemainingRatio,
        closeness,
      });

      setFeedback({ correct, pointsEarned: points, exact });
      if (correct) sfx.correct();
      else sfx.wrong();
      dispatch({ type: "ANSWER", correct, points });
    },
    [mode.scoring, mode.timer, state.currentQuestion, state.status, state.streak, state.timeRemaining],
  );

  const next = useCallback(() => {
    setFeedback(null);
    const answeredCount = state.questionNumber; // preguntas ya mostradas
    const reachedLimit = totalQuestions != null && answeredCount >= totalQuestions;
    if (reachedLimit) {
      dispatch({ type: "END" });
      return;
    }
    const nd = computeNextDifficulty(state.difficulty, state.recentResults);
    const q = pickQuestion(nd, answeredCount); // sequenceIndex = nº de preguntas ya hechas
    dispatch({ type: "NEXT", question: q, difficulty: nd });
  }, [computeNextDifficulty, pickQuestion, state.difficulty, state.questionNumber, state.recentResults, totalQuestions]);

  const cashOut = useCallback(() => dispatch({ type: "CASH_OUT" }), []);

  // Persistencia al terminar.
  useEffect(() => {
    if (state.status !== "gameover" || savedRef.current) return;
    savedRef.current = true;
    const answered = state.history.length;
    const correct = state.history.filter((h) => h.correct).length;
    const bestStreak = state.history.reduce(
      (acc, h) => {
        const cur = h.correct ? acc.cur + 1 : 0;
        return { cur, max: Math.max(acc.max, cur) };
      },
      { cur: 0, max: 0 },
    ).max;
    recordGame({ modeId: mode.id, score: state.score, bestStreak, correct, answered });
    addSeenIds(newSeenRef.current);
  }, [mode.id, state.history, state.score, state.status]);

  const isLast = totalQuestions != null && state.questionNumber >= totalQuestions;

  return { state, feedback, answer, next, cashOut, totalQuestions, isLast, allowCashOut: !!mode.allowCashOut };
}
