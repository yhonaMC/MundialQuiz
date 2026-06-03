"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { PlayerCard, type Reveal } from "@/components/conexion/PlayerCard";
import { Board, MAX_ATTEMPTS } from "@/components/incognita/Board";
import { Keyboard } from "@/components/incognita/Keyboard";
import { GAMES } from "@/lib/games";
import { AVATAR_COLORS, iniciales, loadPerfil } from "@/lib/perfil";
import { useRoom, type Jugador } from "@/lib/multiplayer/useRoom";
import { buildRound, penalesContinua, scoreFor, TOTAL_ROUNDS, type Round } from "@/lib/multiplayer/rounds";
import { normalize } from "@/lib/incognita/normalize";
import { isValidGuess } from "@/lib/incognita/dictionary";
import { keyboardState } from "@/lib/incognita/keyboardState";
import type { Player } from "@/lib/db/types";

const REVEAL_MS = 4500;
const msFor = (r: Round) => (r.kind === "incognita" ? 60000 : r.kind === "conexion" ? 25000 : r.kind === "penales" ? 20000 : 15000);

type Phase = "play" | "reveal" | "end";

export default function MatchPage() {
  const params = useParams<{ codigo: string }>();
  const search = useSearchParams();
  const codigo = (params.codigo || "").toUpperCase();
  const game = search.get("game") ?? "quiz";
  const isHost = search.get("host") === "1";

  const [perfil, setPerfil] = useState({ nombre: "Tú", color: AVATAR_COLORS[0] });
  useEffect(() => {
    const p = loadPerfil();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPerfil({ nombre: p.nombre || "Tú", color: p.color });
  }, []);

  const { players, myId, ready, send, onEvent } = useRoom(codigo, perfil);

  const [round, setRound] = useState<Round | null>(null);
  const [roundIdx, setRoundIdx] = useState(-1);
  const [phase, setPhase] = useState<Phase>("play");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<string[]>([]);
  const [myDone, setMyDone] = useState(false);
  const [shots, setShots] = useState<Record<string, boolean[]>>({});

  // Refs para acceder a estado actual dentro de callbacks/handlers.
  const roundIdxRef = useRef(-1);
  const startTsRef = useRef(0);
  const msRef = useRef(15000);
  const answeredRef = useRef<Set<string>>(new Set());
  const hostScoresRef = useRef<Record<string, number>>({});
  const lastRevealRef = useRef(-1);
  const playersRef = useRef<Player[] | { id: string }[]>([]);
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const shotsRef = useRef<Record<string, boolean[]>>({});

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const startRound = useCallback(
    (i: number) => {
      const r = buildRound(game);
      send("round", { idx: i, round: r, ms: msFor(r) });
    },
    [game, send],
  );

  const hostReveal = useCallback(
    (idx: number) => {
      if (lastRevealRef.current === idx) return;
      lastRevealRef.current = idx;
      if (roundTimer.current) clearTimeout(roundTimer.current);
      send("reveal", { idx, scores: { ...hostScoresRef.current } });
      revealTimer.current = setTimeout(() => {
        const continua =
          game === "penales"
            ? penalesContinua(
                playersRef.current.map((pl) => hostScoresRef.current[String(pl.id)] ?? 0),
                idx + 1,
              )
            : idx + 1 < TOTAL_ROUNDS;
        if (continua) startRound(idx + 1);
        else send("end", { scores: { ...hostScoresRef.current } });
      }, REVEAL_MS);
    },
    [game, send, startRound],
  );

  // Manejo de eventos de la sala.
  useEffect(() => {
    onEvent((type, p) => {
      if (type === "round") {
        const idx = Number(p.idx);
        roundIdxRef.current = idx;
        startTsRef.current = Date.now();
        msRef.current = Number(p.ms) || 15000;
        answeredRef.current = new Set();
        setRoundIdx(idx);
        setRound(p.round as Round);
        setPhase("play");
        setAnswered([]);
        setMyDone(false);
        if (isHost) {
          if (roundTimer.current) clearTimeout(roundTimer.current);
          roundTimer.current = setTimeout(() => hostReveal(idx), msRef.current);
        }
      } else if (type === "ans") {
        if (Number(p.idx) !== roundIdxRef.current) return;
        answeredRef.current.add(String(p.id));
        setAnswered([...answeredRef.current]);
        const shooterId = String(p.id);
        const arr = [...(shotsRef.current[shooterId] ?? [])];
        arr[Number(p.idx)] = Boolean(p.correct);
        shotsRef.current = { ...shotsRef.current, [shooterId]: arr };
        setShots(shotsRef.current);
        if (isHost) {
          hostScoresRef.current[String(p.id)] = (hostScoresRef.current[String(p.id)] || 0) + Number(p.pts);
          if (answeredRef.current.size >= playersRef.current.length) hostReveal(roundIdxRef.current);
        }
      } else if (type === "reveal") {
        if (Number(p.idx) !== roundIdxRef.current) return;
        setPhase("reveal");
        setScores((p.scores as Record<string, number>) || {});
        const rIdx = Number(p.idx);
        for (const pl of playersRef.current) {
          const id = String(pl.id);
          const arr = [...(shotsRef.current[id] ?? [])];
          if (arr[rIdx] === undefined) {
            arr[rIdx] = false;
            shotsRef.current = { ...shotsRef.current, [id]: arr };
          }
        }
        setShots(shotsRef.current);
      } else if (type === "end") {
        setPhase("end");
        setScores((p.scores as Record<string, number>) || {});
      }
    });
  }, [onEvent, isHost, hostReveal]);

  // El anfitrión arranca la primera ronda cuando el canal está listo
  // (con un margen para que el resto se suscriba y no se pierda la ronda 1).
  useEffect(() => {
    if (isHost && ready && !startedRef.current) {
      startedRef.current = true;
      const t = setTimeout(() => startRound(0), 1000);
      return () => clearTimeout(t);
    }
  }, [isHost, ready, startRound]);

  useEffect(() => {
    return () => {
      if (roundTimer.current) clearTimeout(roundTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  // Registrar respuesta del jugador.
  const responder = useCallback(
    (correct: boolean) => {
      if (myDone) return;
      const pts = game === "penales" ? (correct ? 1 : 0) : scoreFor(correct, Date.now() - startTsRef.current, msRef.current);
      setMyDone(true);
      send("ans", { idx: roundIdxRef.current, id: myId, correct, pts });
    },
    [game, myDone, myId, send],
  );

  const ranking = [...players]
    .map((pl) => ({ ...pl, pts: scores[pl.id] ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  // ---- Render ----
  if (phase === "end") {
    return (
      <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-8 text-center">
        <MemphisBackground />
        <Confetti pieces={64} />
        <Trophy className="h-12 w-12 text-[var(--color-green)]" />
        <h1 className="text-3xl font-black uppercase italic">Resultados</h1>
        <div className="flex w-full max-w-sm flex-col gap-2">
          {ranking.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 ring-white/10"
              style={{ backgroundColor: i === 0 ? "color-mix(in srgb, var(--color-green) 25%, transparent)" : "rgba(255,255,255,0.05)" }}
            >
              <span className="w-5 text-center font-black">{i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full text-xs font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: p.color }}>
                {iniciales(p.nombre)}
              </span>
              <span className="font-extrabold">{p.nombre}</span>
              {i === 0 && <Crown className="h-4 w-4 text-[var(--color-amber)]" />}
              <span className="ml-auto font-black tabular-nums text-[var(--color-green)]">
                {p.pts}
                {game === "penales" ? " ⚽" : ""}
              </span>
            </div>
          ))}
        </div>
        <Link href={`/sala/${codigo}${isHost ? "?host=1" : ""}`} className="mt-2 rounded-2xl bg-[var(--color-green)] px-7 py-3 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_6px_0_0_#2c8a2b]">
          Volver a la sala
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <MemphisBackground />

      {/* Marcador en vivo */}
      <div className="flex w-full max-w-xl items-center justify-between gap-2">
        <Link href={`/sala/${codigo}${isHost ? "?host=1" : ""}`} className="text-xs font-bold text-[var(--color-gray-light)]/70 hover:text-white">
          Salir
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {game === "penales"
            ? `${GAMES[game]?.nombre} · Penal ${Math.max(0, roundIdx) + 1}${roundIdx >= TOTAL_ROUNDS ? " · ⚡ Muerte súbita" : ""}`
            : `${GAMES[game]?.nombre} · Ronda ${Math.max(0, roundIdx) + 1}/${TOTAL_ROUNDS}`}
        </span>
      </div>
      <div className="flex w-full max-w-xl flex-wrap justify-center gap-2">
        {ranking.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/5 py-1 pl-1 pr-3 ring-1 ring-white/10">
            <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: p.color, opacity: answered.includes(p.id) ? 1 : 0.55 }}>
              {iniciales(p.nombre)}
            </span>
            <span className="text-xs font-black tabular-nums">{p.pts}</span>
          </span>
        ))}
      </div>

      {!round ? (
        <p className="mt-10 font-black">Conectando…</p>
      ) : (
        <RoundView round={round} phase={phase} myDone={myDone} onResult={responder} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />
      )}

      {phase === "reveal" && (
        <p className="text-sm font-bold text-[var(--color-gray-light)]/70">Siguiente ronda…</p>
      )}
    </main>
  );
}

// ---- Render de cada tipo de ronda ----
function RoundView({ round, phase, myDone, onResult, players, shots, roundIdx, myId }: { round: Round; phase: Phase; myDone: boolean; onResult: (c: boolean) => void; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  if (round.kind === "penales") return <PenalesView round={round} phase={phase} myDone={myDone} onResult={onResult} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />;
  if (round.kind === "options") return <OptionsView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  if (round.kind === "conexion") return <ConexionView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  return <IncognitaView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
}

function PenalesView({ round, phase, myDone, onResult, players, shots, roundIdx, myId }: { round: Extract<Round, { kind: "penales" }>; phase: Phase; myDone: boolean; onResult: (c: boolean) => void; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const reveal = phase === "reveal";
  const totalDots = Math.max(TOTAL_ROUNDS, roundIdx + 1);
  const click = (i: number) => {
    if (myDone || reveal) return;
    setPick(i);
    onResult(i === round.answer);
  };
  const myGoal = pick !== null && pick === round.answer;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {/* Marcador de la tanda */}
      <div className="flex w-full flex-col gap-2 rounded-2xl bg-[var(--color-navy)] p-3 ring-1 ring-white/10">
        {roundIdx >= TOTAL_ROUNDS && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-red)]">⚡ Muerte súbita</p>
        )}
        {players.map((pl) => (
          <div key={pl.id} className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: pl.color }}>
              {iniciales(pl.nombre)}
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: totalDots }).map((_, i) => {
                const shot = shots[pl.id]?.[i];
                return (
                  <span
                    key={i}
                    className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: shot === undefined ? "rgba(255,255,255,0.12)" : shot ? "var(--color-green)" : "var(--color-red)" }}
                  >
                    {shot === undefined ? "" : shot ? "⚽" : "✕"}
                  </span>
                );
              })}
            </div>
            {pl.id === myId && <span className="ml-auto text-[9px] font-bold uppercase text-[var(--color-gray-light)]/60">Tú</span>}
          </div>
        ))}
      </div>

      {round.sub && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{round.sub}</span>}
      <h2 className="text-center text-xl font-black leading-tight">{round.prompt}</h2>
      <div className="grid w-full gap-2.5">
        {round.options.map((op, i) => {
          let bg = "rgba(255,255,255,0.1)";
          let fg = "#fff";
          if (reveal && i === round.answer) { bg = "var(--color-green)"; fg = "var(--color-navy-deep)"; }
          else if (reveal && i === pick) { bg = "var(--color-red)"; }
          return (
            <motion.button key={i} onClick={() => click(i)} disabled={myDone || reveal} whileTap={!myDone && !reveal ? { scale: 0.97 } : undefined} style={{ backgroundColor: bg, color: fg }} className="rounded-2xl px-5 py-3 text-left font-extrabold ring-1 ring-white/10 disabled:opacity-90">
              {op}
            </motion.button>
          );
        })}
      </div>
      {reveal && pick !== null && (
        <p className="text-2xl font-black uppercase italic" style={{ color: myGoal ? "var(--color-green)" : "var(--color-red)" }}>
          {myGoal ? "⚽ ¡GOOOL!" : "🧤 ¡Atajado!"}
        </p>
      )}
      {myDone && phase === "play" && <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Penal tirado! esperando…</p>}
    </div>
  );
}

function OptionsView({ round, phase, myDone, onResult }: { round: Extract<Round, { kind: "options" }>; phase: Phase; myDone: boolean; onResult: (c: boolean) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const reveal = phase === "reveal";
  const click = (i: number) => {
    if (myDone || reveal) return;
    setPick(i);
    onResult(i === round.answer);
  };
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {round.sub && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{round.sub}</span>}
      {round.foto && (
        <div className="h-40 w-40 overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail local */}
          <img src={round.foto} alt="¿Quién es?" className="h-full w-full object-contain" />
        </div>
      )}
      {round.prompt && <h2 className="text-center text-xl font-black leading-tight">{round.prompt}</h2>}
      <div className="grid w-full gap-2.5">
        {round.options.map((op, i) => {
          let bg = "rgba(255,255,255,0.1)";
          let fg = "#fff";
          if (reveal && i === round.answer) { bg = "var(--color-green)"; fg = "var(--color-navy-deep)"; }
          else if (reveal && i === pick) { bg = "var(--color-red)"; }
          return (
            <motion.button key={i} onClick={() => click(i)} disabled={myDone || reveal} whileTap={!myDone && !reveal ? { scale: 0.97 } : undefined} style={{ backgroundColor: bg, color: fg }} className="rounded-2xl px-5 py-3 text-left font-extrabold ring-1 ring-white/10 disabled:opacity-90">
              {op}
            </motion.button>
          );
        })}
      </div>
      {myDone && phase === "play" && <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Respondido! esperando…</p>}
    </div>
  );
}

function ConexionView({ round, phase, myDone, onResult }: { round: Extract<Round, { kind: "conexion" }>; phase: Phase; myDone: boolean; onResult: (c: boolean) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const reveal = phase === "reveal";
  const toggle = (id: string) => {
    if (myDone || reveal) return;
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else if (n.size < 3) n.add(id);
      return n;
    });
  };
  const comprobar = () => {
    if (myDone || sel.size !== 3) return;
    const ok = round.correct.every((id) => sel.has(id)) && sel.size === round.correct.length;
    onResult(ok);
  };
  const revealOf = (id: string): Reveal => {
    if (!reveal) return "none";
    if (round.correct.includes(id)) return "match";
    return sel.has(id) ? "wrong" : "none";
  };
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <p className="text-center text-sm text-[var(--color-gray-light)]/80">Elige los <b className="text-white">3</b> que comparten algo</p>
      <div className="grid w-full grid-cols-3 gap-2.5">
        {round.cards.map((c) => (
          <PlayerCard key={c.id} player={{ id: c.id, nombre: c.nombre, paisEs: c.paisEs, posicion: c.posicion as Player["posicion"], foto: c.foto ? { archivo: c.foto, autor: "", licencia: "", fuente: "" } : undefined } as Player} selected={sel.has(c.id)} reveal={revealOf(c.id)} disabled={myDone || reveal} onToggle={() => toggle(c.id)} />
        ))}
      </div>
      {reveal && <p className="text-sm font-bold text-[var(--color-green)]">{round.label}</p>}
      {!reveal && !myDone && (
        <button onClick={comprobar} disabled={sel.size !== 3} className="rounded-2xl bg-[var(--color-green)] px-6 py-3 font-black uppercase italic text-[var(--color-navy-deep)] disabled:opacity-40">
          Comprobar ({sel.size}/3)
        </button>
      )}
      {myDone && !reveal && <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Listo! esperando…</p>}
    </div>
  );
}

function IncognitaView({ round, phase, myDone, onResult }: { round: Extract<Round, { kind: "incognita" }>; phase: Phase; myDone: boolean; onResult: (c: boolean) => void }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const word = round.word;

  const flash = (m: string) => {
    setAviso(m);
    window.setTimeout(() => setAviso(null), 1500);
  };

  const submit = useCallback(() => {
    if (done) return;
    if (current.length < word.length) {
      flash("Faltan letras");
      return;
    }
    if (!isValidGuess(current)) {
      flash("No está en la lista");
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    setAviso(null);
    const won = normalize(current) === word;
    if (won || next.length >= MAX_ATTEMPTS) {
      setDone(true);
      onResult(won);
    }
  }, [done, current, word, guesses, onResult]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || phase === "reveal") return;
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") setCurrent((p) => p.slice(0, -1));
      else if (e.key.length === 1) {
        const n = normalize(e.key);
        if (/^[A-ZÑ]$/.test(n)) setCurrent((p) => (p.length < word.length ? p + n : p));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, done, phase, word.length]);

  const blocked = done || myDone || phase === "reveal";
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-bold text-[var(--color-gray-light)]">{round.hint}</span>
      {aviso && <span className="rounded-xl bg-white px-3 py-1 text-sm font-extrabold text-[var(--color-navy-deep)]">{aviso}</span>}
      <Board answer={word} guesses={guesses} current={current} />
      {phase === "reveal" ? (
        <p className="text-sm font-bold">La palabra era <b className="text-[var(--color-green)]">{word}</b></p>
      ) : done ? (
        <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Listo! esperando…</p>
      ) : (
        <Keyboard
          states={keyboardState(guesses, word)}
          onChar={(c) => setCurrent((p) => (p.length < word.length ? p + c : p))}
          onEnter={submit}
          onBackspace={() => setCurrent((p) => p.slice(0, -1))}
          disabled={blocked}
        />
      )}
    </div>
  );
}
