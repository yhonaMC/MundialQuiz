"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TOURNAMENTS } from "@/lib/data";
import { createRng, type Rng } from "@/lib/engine/rng";
import { generateQuestion } from "@/lib/engine/generateQuestion";
import { numericCloseness } from "@/lib/engine/scoring";
import { shootoutReducer, initialShootoutState, goals, REGULAR_SHOTS } from "@/lib/penales/shootout";
import { aiShoots, questionDifficulty, type Nivel } from "@/lib/penales/ai";
import { loadData, addSeenIds, recordPenales } from "@/lib/storage/localStore";
import type { Question } from "@/lib/data/types";

// Orquesta la tanda: preguntas del pool completo (dificultad según nivel de IA),
// tiros de la IA probabilísticos y persistencia del récord al terminar.
export function usePenales(nivel: Nivel, seed: number) {
  const rngRef = useRef<Rng>(createRng(seed));
  const seenRef = useRef<string[]>(loadData().seenIds);
  const newSeenRef = useRef<string[]>([]);
  const [state, dispatch] = useReducer(shootoutReducer, initialShootoutState);
  const [question, setQuestion] = useState<Question | null>(null);
  const [lastPlayerGoal, setLastPlayerGoal] = useState<boolean | null>(null);
  const [lastAiGoal, setLastAiGoal] = useState<boolean | null>(null);
  const savedRef = useRef(false);

  const pickQuestion = useCallback(
    (suddenDeath: boolean): Question => {
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: questionDifficulty(nivel, suddenDeath, rngRef.current),
        tournamentFilter: "all",
        seenIds: [...seenRef.current, ...newSeenRef.current],
        rng: rngRef.current,
      });
      newSeenRef.current.push(q.id);
      return q;
    },
    [nivel],
  );

  // Arranque: una sola vez.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dispatch({ type: "START" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- primera pregunta del cliente (RNG sembrado post-mount)
    setQuestion(pickQuestion(false));
  }, [pickQuestion]);

  // Tiro del jugador: responde la pregunta.
  const answer = useCallback(
    (raw: number) => {
      if (state.phase !== "question" || !question) return;
      const goal =
        question.format === "number"
          ? numericCloseness(raw, question.numericAnswer!, question.tolerance!) > 0
          : raw === question.answerIndex;
      setLastPlayerGoal(goal);
      dispatch({ type: "PLAYER_SHOT", goal });
    },
    [question, state.phase],
  );

  // Tiro de la IA (tras el feedback del jugador). Si ya está decidido, cierra.
  const aiShot = useCallback(() => {
    if (state.phase !== "player-feedback") return;
    if (state.winner !== null) {
      dispatch({ type: "NEXT_ROUND" });
      return;
    }
    const goal = aiShoots(nivel, rngRef.current);
    setLastAiGoal(goal);
    dispatch({ type: "AI_SHOT", goal });
  }, [nivel, state.phase, state.winner]);

  // Avanza de ronda (o al resultado si ya hay ganador).
  const nextRound = useCallback(() => {
    if (state.winner !== null) {
      dispatch({ type: "NEXT_ROUND" });
      return;
    }
    setQuestion(pickQuestion(state.round + 1 > REGULAR_SHOTS));
    setLastPlayerGoal(null);
    setLastAiGoal(null);
    dispatch({ type: "NEXT_ROUND" });
  }, [pickQuestion, state.round, state.winner]);

  // Persistencia al terminar.
  useEffect(() => {
    if (state.phase !== "gameover" || savedRef.current || state.winner === null) return;
    savedRef.current = true;
    recordPenales(nivel, state.winner === "player");
    addSeenIds(newSeenRef.current);
  }, [nivel, state.phase, state.winner]);

  return {
    state,
    question,
    lastPlayerGoal,
    lastAiGoal,
    answer,
    aiShot,
    nextRound,
    playerGoals: goals(state.playerShots),
    aiGoals: goals(state.aiShots),
  };
}
