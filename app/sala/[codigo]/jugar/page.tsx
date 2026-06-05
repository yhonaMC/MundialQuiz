"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Crown, Hand, Lightbulb, Trophy, X, Zap } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { JerseyAvatar } from "@/components/ui/JerseyAvatar";
import { EventToasts, useEventToasts } from "@/components/ui/EventToasts";
import { PlayerCard, type Reveal } from "@/components/conexion/PlayerCard";
import { Board, MAX_ATTEMPTS } from "@/components/incognita/Board";
import { Keyboard } from "@/components/incognita/Keyboard";
import { GAMES } from "@/lib/games";
import { AVATAR_COLORS, loadPerfil } from "@/lib/perfil";
import { sfx } from "@/lib/sound";
import { useRoom, type Jugador } from "@/lib/multiplayer/useRoom";
import { buildRound, penalesContinua, scoreFor, TOTAL_ROUNDS, type Round } from "@/lib/multiplayer/rounds";
import { normalize } from "@/lib/incognita/normalize";
import { isValidGuess } from "@/lib/incognita/dictionary";
import { keyboardState } from "@/lib/incognita/keyboardState";
import type { Player } from "@/lib/db/types";

const REVEAL_MS = 4500;
const msFor = (r: Round) => (r.kind === "incognita" ? 60000 : r.kind === "conexion" ? 25000 : r.kind === "penales" ? 20000 : 15000);

type Phase = "play" | "reveal" | "end";
type Result = (correct: boolean, hinted?: boolean) => void;

export default function MatchPage() {
  const params = useParams<{ codigo: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const codigo = (params.codigo || "").toUpperCase();
  const game = search.get("game") ?? "quiz";
  const isHost = search.get("host") === "1";
  const desde = Number(search.get("desde")) || 0;

  const [perfil, setPerfil] = useState({ nombre: "Tú", color: AVATAR_COLORS[0] });
  useEffect(() => {
    const p = loadPerfil();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPerfil({ nombre: p.nombre || "Tú", color: p.color });
  }, []);

  const { players, myId, ready, send, onEvent } = useRoom(codigo, perfil, { host: isHost });
  const { toasts, push } = useEventToasts();

  const [round, setRound] = useState<Round | null>(null);
  const [roundIdx, setRoundIdx] = useState(-1);
  const [phase, setPhase] = useState<Phase>("play");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<string[]>([]);
  const [myDone, setMyDone] = useState(false);
  const [shots, setShots] = useState<Record<string, boolean[]>>({});
  const [results, setResults] = useState<Record<string, boolean>>({}); // acierto por jugador (ronda actual)
  const [prog, setProg] = useState<Record<string, number>>({}); // progreso (p.ej. intentos en Incógnita)
  const [roundMs, setRoundMs] = useState(15000);
  const [remaining, setRemaining] = useState(0);

  // Refs para acceder a estado actual dentro de callbacks/handlers.
  const roundIdxRef = useRef(-1);
  const startTsRef = useRef(0);
  const msRef = useRef(15000);
  const answeredRef = useRef<Set<string>>(new Set());
  const hostScoresRef = useRef<Record<string, number>>({});
  const lastRevealRef = useRef(-1);
  const playersRef = useRef<Jugador[]>([]);
  const namesRef = useRef<Record<string, string>>({});
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const shotsRef = useRef<Record<string, boolean[]>>({});
  const resultsRef = useRef<Record<string, boolean>>({});
  const progRef = useRef<Record<string, number>>({});
  const endPlayedRef = useRef(false);

  useEffect(() => {
    playersRef.current = players;
    for (const p of players) namesRef.current[p.id] = p.nombre;
  }, [players]);

  const nameOf = useCallback((id: string) => namesRef.current[id] ?? "Alguien", []);

  const startRound = useCallback(
    (i: number) => {
      const r = buildRound(game, desde);
      send("round", { idx: i, round: r, ms: msFor(r) });
    },
    [game, desde, send],
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
        resultsRef.current = {};
        progRef.current = {};
        setRoundMs(msRef.current);
        setRoundIdx(idx);
        setRound(p.round as Round);
        setPhase("play");
        setAnswered([]);
        setResults({});
        setProg({});
        setMyDone(false);
        if (idx === 0) sfx.whistle();
        else sfx.tap();
        if (isHost) {
          if (roundTimer.current) clearTimeout(roundTimer.current);
          roundTimer.current = setTimeout(() => hostReveal(idx), msRef.current);
        }
      } else if (type === "ans") {
        if (Number(p.idx) !== roundIdxRef.current) return;
        const who = String(p.id);
        answeredRef.current.add(who);
        setAnswered([...answeredRef.current]);
        resultsRef.current[who] = Boolean(p.correct);
        setResults({ ...resultsRef.current });
        const arr = [...(shotsRef.current[who] ?? [])];
        arr[Number(p.idx)] = Boolean(p.correct);
        shotsRef.current = { ...shotsRef.current, [who]: arr };
        setShots(shotsRef.current);
        if (who !== myId) push(`${nameOf(who)} respondió`, { icon: "✋", silent: true });
        if (isHost) {
          hostScoresRef.current[who] = (hostScoresRef.current[who] || 0) + Number(p.pts);
          if (answeredRef.current.size >= playersRef.current.length) hostReveal(roundIdxRef.current);
        }
      } else if (type === "prog") {
        if (Number(p.idx) !== roundIdxRef.current) return;
        progRef.current[String(p.id)] = Number(p.n);
        setProg({ ...progRef.current });
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
  }, [onEvent, isHost, hostReveal, myId, nameOf, push]);

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

  // Cuenta atrás visible de la ronda. El intervalo setea estado en su callback
  // (no en el cuerpo del efecto); arranca casi inmediato con un primer tick diferido.
  useEffect(() => {
    if (phase !== "play" || !round) return;
    const tick = () => setRemaining(Math.max(0, msRef.current - (Date.now() - startTsRef.current)));
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 200);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [phase, round, roundIdx]);

  // Sonido de fin: ganas si quedas en lo más alto con puntos.
  useEffect(() => {
    if (phase === "end" && !endPlayedRef.current) {
      endPlayedRef.current = true;
      const vals = Object.values(scores);
      const my = scores[myId] ?? 0;
      const max = vals.length ? Math.max(...vals) : 0;
      if (my > 0 && my >= max) sfx.win();
      else sfx.lose();
    }
  }, [phase, scores, myId]);

  // Avisos de entrada/salida y detección de que el anfitrión se fue.
  const firstPresenceRef = useRef(true);
  const prevIdsRef = useRef<string[]>([]);
  const hostWasPresentRef = useRef(false);
  const leavingRef = useRef(false);
  useEffect(() => {
    const curIds = players.map((p) => p.id);
    const hostPresent = players.some((p) => p.host);
    if (firstPresenceRef.current) {
      firstPresenceRef.current = false;
      prevIdsRef.current = curIds;
      hostWasPresentRef.current = hostPresent;
      return;
    }
    // Nuevos jugadores
    for (const p of players) {
      if (p.id !== myId && !prevIdsRef.current.includes(p.id)) {
        sfx.join();
        push(`${p.nombre} se unió`, { icon: "👋", silent: true });
      }
    }
    // El anfitrión se fue → llevar a los demás de vuelta a la sala.
    if (!isHost && hostWasPresentRef.current && !hostPresent && curIds.length > 0 && !leavingRef.current) {
      leavingRef.current = true;
      push("El anfitrión salió de la sala", { icon: "⚠️" });
      sfx.lose();
      setTimeout(() => router.push(`/sala/${codigo}`), 1600);
    } else {
      // Salidas normales (no anfitrión)
      for (const id of prevIdsRef.current) {
        if (!curIds.includes(id) && id !== myId) push(`${nameOf(id)} salió`, { icon: "🚪", silent: true });
      }
    }
    prevIdsRef.current = curIds;
    if (hostPresent) hostWasPresentRef.current = true;
  }, [players, myId, isHost, push, router, codigo, nameOf]);

  // Registrar respuesta del jugador.
  const responder = useCallback<Result>(
    (correct, hinted = false) => {
      if (myDone) return;
      let pts = game === "penales" ? (correct ? 1 : 0) : scoreFor(correct, Date.now() - startTsRef.current, msRef.current);
      if (hinted && game !== "penales") pts = Math.round(pts * 0.5); // la pista resta puntos
      setMyDone(true);
      if (correct) sfx.correct();
      else sfx.wrong();
      send("ans", { idx: roundIdxRef.current, id: myId, correct, pts });
    },
    [game, myDone, myId, send],
  );

  const sendProg = useCallback(
    (n: number) => send("prog", { idx: roundIdxRef.current, id: myId, n }),
    [send, myId],
  );

  const ranking = [...players]
    .map((pl) => ({ ...pl, pts: scores[pl.id] ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  const secs = Math.ceil(remaining / 1000);
  const pct = roundMs ? (remaining / roundMs) * 100 : 0;
  const barColor = pct > 50 ? "var(--color-green)" : pct > 20 ? "var(--color-amber)" : "var(--color-red)";
  const desdeLabel = desde ? (desde >= 2022 ? "Solo 2022" : `desde ${desde}`) : "";

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
              <JerseyAvatar nombre={p.nombre} size={34} ring={p.color} />
              <span className="font-extrabold">{p.nombre}</span>
              {i === 0 && <Crown className="h-4 w-4 text-[var(--color-amber)]" />}
              <span className="ml-auto font-black tabular-nums text-[var(--color-green)]">
                {p.pts}
                {game === "penales" && <Check className="ml-1 inline h-3.5 w-3.5" />}
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
    <main className="relative flex flex-1 flex-col items-center gap-3 px-4 py-6">
      <MemphisBackground />
      <EventToasts toasts={toasts} />

      {/* Cabecera */}
      <div className="flex w-full max-w-xl items-center justify-between gap-2">
        <Link href={`/sala/${codigo}${isHost ? "?host=1" : ""}`} className="text-xs font-bold text-[var(--color-gray-light)]/70 hover:text-white">
          Salir
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {game === "penales"
            ? `${GAMES[game]?.nombre} · Penal ${Math.max(0, roundIdx) + 1}${roundIdx >= TOTAL_ROUNDS ? " · ⚡ Muerte súbita" : ""}`
            : `${GAMES[game]?.nombre} · Ronda ${Math.max(0, roundIdx) + 1}/${TOTAL_ROUNDS}`}
          {desdeLabel && <span className="ml-1 text-[var(--color-amber)]">· {desdeLabel}</span>}
        </span>
      </div>

      {/* Temporizador */}
      {round && phase === "play" && (
        <div className="w-full max-w-xl">
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
            <span>Tiempo</span>
            <span className="tabular-nums" style={{ color: barColor }}>{secs}s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} transition={{ ease: "linear" }} />
          </div>
        </div>
      )}

      {/* Marcador en vivo con estado de cada jugador */}
      <div className="flex w-full max-w-xl flex-wrap justify-center gap-2">
        {ranking.map((p) => {
          const yaRespondio = answered.includes(p.id);
          let estado = "";
          let estadoColor = "var(--color-gray-light)";
          if (phase === "reveal") {
            if (results[p.id] === true) { estado = "✓ acertó"; estadoColor = "var(--color-green)"; }
            else if (results[p.id] === false) { estado = "✗ falló"; estadoColor = "var(--color-red)"; }
            else { estado = "sin responder"; }
          } else if (yaRespondio) {
            estado = "listo ✅"; estadoColor = "var(--color-green)";
          } else if (prog[p.id]) {
            estado = `✏️ intento ${prog[p.id]}`; estadoColor = "var(--color-amber)";
          } else {
            estado = "pensando…";
          }
          return (
            <span key={p.id} className="flex items-center gap-2 rounded-2xl bg-white/5 py-1 pl-1 pr-3 ring-1 ring-white/10">
              <JerseyAvatar nombre={p.nombre} size={30} ring={p.color} dim={phase === "play" && !yaRespondio} />
              <span className="flex flex-col leading-tight">
                <span className="flex items-center gap-1 text-[11px] font-black">
                  {p.id === myId ? "Tú" : p.nombre.length > 8 ? p.nombre.slice(0, 8) + "…" : p.nombre}
                  <span className="tabular-nums text-[var(--color-green)]">{p.pts}</span>
                </span>
                <span className="text-[10px] font-bold" style={{ color: estadoColor }}>{estado}</span>
              </span>
            </span>
          );
        })}
      </div>

      {!round ? (
        <p className="mt-10 font-black">Conectando…</p>
      ) : (
        <RoundView key={roundIdx} round={round} phase={phase} myDone={myDone} onResult={responder} onProgress={sendProg} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />
      )}

      {phase === "reveal" && (
        <p className="text-sm font-bold text-[var(--color-gray-light)]/70">Siguiente ronda en unos segundos…</p>
      )}
    </main>
  );
}

// Botón de pista reutilizable (texto que no revela la respuesta; resta puntos).
function PistaBtn({ hint, shown, onShow }: { hint?: string; shown: boolean; onShow: () => void }) {
  if (!hint) return null;
  return shown ? (
    <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-amber)]/15 px-3 py-1 text-xs font-bold text-[var(--color-amber)]">
      <Lightbulb className="h-3.5 w-3.5" /> {hint}
    </span>
  ) : (
    <button onClick={onShow} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold ring-1 ring-white/15 hover:bg-white/15">
      <Lightbulb className="h-3.5 w-3.5" /> Pista (−50% pts)
    </button>
  );
}

// ---- Render de cada tipo de ronda ----
function RoundView({ round, phase, myDone, onResult, onProgress, players, shots, roundIdx, myId }: { round: Round; phase: Phase; myDone: boolean; onResult: Result; onProgress: (n: number) => void; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  if (round.kind === "penales") return <PenalesView round={round} phase={phase} myDone={myDone} onResult={onResult} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />;
  if (round.kind === "options") return <OptionsView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  if (round.kind === "conexion") return <ConexionView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  return <IncognitaView round={round} phase={phase} myDone={myDone} onResult={onResult} onProgress={onProgress} />;
}

function PenalesView({ round, phase, myDone, onResult, players, shots, roundIdx, myId }: { round: Extract<Round, { kind: "penales" }>; phase: Phase; myDone: boolean; onResult: Result; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const reveal = phase === "reveal";
  const totalDots = Math.max(TOTAL_ROUNDS, roundIdx + 1);
  const click = (i: number) => {
    if (myDone || reveal) return;
    setPick(i);
    onResult(i === round.answer, hint);
  };
  const myGoal = pick !== null && pick === round.answer;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {/* Marcador de la tanda */}
      <div className="flex w-full flex-col gap-2 rounded-2xl bg-[var(--color-navy)] p-3 ring-1 ring-white/10">
        {roundIdx >= TOTAL_ROUNDS && (
          <p className="flex items-center justify-center gap-1 text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-red)]"><Zap className="h-3 w-3" /> Muerte súbita</p>
        )}
        {players.map((pl) => (
          <div key={pl.id} className="flex items-center gap-2">
            <JerseyAvatar nombre={pl.nombre} size={24} ring={pl.color} />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: totalDots }).map((_, i) => {
                const shot = shots[pl.id]?.[i];
                return (
                  <span
                    key={i}
                    className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: shot === undefined ? "rgba(255,255,255,0.12)" : shot ? "var(--color-green)" : "var(--color-red)" }}
                  >
                    {shot === undefined ? "" : shot ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
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
      {!reveal && !myDone && <PistaBtn hint={round.hint} shown={hint} onShow={() => setHint(true)} />}
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
        <p className="flex items-center justify-center gap-2 text-2xl font-black uppercase italic" style={{ color: myGoal ? "var(--color-green)" : "var(--color-red)" }}>
          {myGoal ? <><Check className="h-6 w-6" /> ¡GOOOL!</> : <><Hand className="h-6 w-6" /> ¡Atajado!</>}
        </p>
      )}
      {myDone && phase === "play" && <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Penal tirado! esperando…</p>}
    </div>
  );
}

function OptionsView({ round, phase, myDone, onResult }: { round: Extract<Round, { kind: "options" }>; phase: Phase; myDone: boolean; onResult: Result }) {
  const [pick, setPick] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const reveal = phase === "reveal";
  const click = (i: number) => {
    if (myDone || reveal) return;
    setPick(i);
    onResult(i === round.answer, hint);
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
      {!reveal && !myDone && <PistaBtn hint={round.hint} shown={hint} onShow={() => setHint(true)} />}
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

function ConexionView({ round, phase, myDone, onResult }: { round: Extract<Round, { kind: "conexion" }>; phase: Phase; myDone: boolean; onResult: Result }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState(false);
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
    onResult(ok, hint);
  };
  const revealOf = (id: string): Reveal => {
    if (!reveal) return "none";
    if (round.correct.includes(id)) return "match";
    return sel.has(id) ? "wrong" : "none";
  };
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <p className="text-center text-sm text-[var(--color-gray-light)]/80">Elige los <b className="text-white">3</b> que comparten algo</p>
      {!reveal && !myDone && <PistaBtn hint={round.hint} shown={hint} onShow={() => setHint(true)} />}
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

function IncognitaView({ round, phase, myDone, onResult, onProgress }: { round: Extract<Round, { kind: "incognita" }>; phase: Phase; myDone: boolean; onResult: Result; onProgress: (n: number) => void }) {
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
      sfx.wrong();
      return;
    }
    if (!isValidGuess(current)) {
      flash("No está en la lista");
      sfx.wrong();
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    setAviso(null);
    onProgress(next.length);
    const won = normalize(current) === word;
    if (won || next.length >= MAX_ATTEMPTS) {
      setDone(true);
      if (won) sfx.win();
      else sfx.lose();
      onResult(won);
    } else {
      sfx.tap();
    }
  }, [done, current, word, guesses, onResult, onProgress]);

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
          onChar={(c) => { sfx.key(); setCurrent((p) => (p.length < word.length ? p + c : p)); }}
          onEnter={submit}
          onBackspace={() => setCurrent((p) => p.slice(0, -1))}
          disabled={blocked}
        />
      )}
    </div>
  );
}
