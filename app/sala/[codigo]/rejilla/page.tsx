"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Crown, Flag, Timer, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { JerseyAvatar } from "@/components/ui/JerseyAvatar";
import { Loader } from "@/components/ui/Loader";
import { Grid } from "@/components/rejilla/Grid";
import { Buscador } from "@/components/rejilla/Buscador";
import { AVATAR_COLORS, ensurePerfil, type Perfil } from "@/lib/perfil";
import type { Player } from "@/lib/db/types";
import { useRoom } from "@/lib/multiplayer/useRoom";
import { claimHost, isClaimedHost } from "@/lib/multiplayer/hostClaim";
import { createRng } from "@/lib/engine/rng";
import { generarRejilla, K_POR_DIFICULTAD, type Rejilla } from "@/lib/rejilla/generate";
import {
  aciertos as contarAciertos,
  celdasResueltas,
  colDe,
  cumple,
  filaDe,
  jugadoresUsados,
  nuevoTablero,
  perfecta,
  puntosTotales,
  terminado,
  type Tablero,
} from "@/lib/rejilla/game";
import { sfx } from "@/lib/sound";

const DUR_MS = 180_000; // 3 minutos por partida

interface EstadoJugador {
  puntos: number;
  aciertos: number;
  resueltas: number;
  fin: boolean;
}

export default function RejillaMatchPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = (params.codigo || "").toUpperCase();
  // Anfitrión por reclamo en sessionStorage (ver hostClaim.ts), nunca por URL.
  const [isHost, setIsHost] = useState(false);

  const [perfil, setPerfil] = useState<Perfil>({ nombre: "Tú", color: AVATAR_COLORS[0] });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPerfil(ensurePerfil());
     
    setIsHost(isClaimedHost(codigo));
  }, [codigo]);

  const { players, myId, ready, send, onEvent } = useRoom(codigo, perfil, { host: isHost });

  const [grilla, setGrilla] = useState<Rejilla | null>(null);
  const [tablero, setTablero] = useState<Tablero>(nuevoTablero);
  const [celda, setCelda] = useState<number | null>(null);
  const [estados, setEstados] = useState<Record<string, EstadoJugador>>({});
  const [fin, setFin] = useState(false);
  const [remaining, setRemaining] = useState(DUR_MS);

  const grillaRef = useRef<Rejilla | null>(null);
  const tableroRef = useRef<Tablero>(tablero);
  const finRef = useRef(false);
  const startTsRef = useRef(0);
  const startedRef = useRef(false);
  useEffect(() => {
    tableroRef.current = tablero;
  }, [tablero]);

  // Difunde mi estado actual (puntos / aciertos / progreso / si terminé).
  const emitir = useCallback(
    (t: Tablero, finFlag: boolean) => {
      const g = grillaRef.current;
      if (!g) return;
      send("prog", {
        id: myId,
        puntos: puntosTotales(g, t),
        aciertos: contarAciertos(t),
        resueltas: celdasResueltas(t),
        fin: finFlag,
      });
    },
    [send, myId],
  );

  const finalizar = useCallback(
    (t: Tablero) => {
      if (finRef.current) return;
      finRef.current = true;
      setFin(true);
      setCelda(null);
      emitir(t, true);
      window.setTimeout(() => (perfecta(t) ? sfx.win() : sfx.lose()), 200);
    },
    [emitir],
  );

  // Eventos de la sala: grilla compartida (semilla del host) + progreso de cada jugador.
  useEffect(() => {
    onEvent((type, p) => {
      if (type === "start") {
        const seed = Number(p.seed) >>> 0;
        const g = generarRejilla(createRng(seed), `mp:${codigo}:${seed}`, K_POR_DIFICULTAD.normal);
        grillaRef.current = g;
        startTsRef.current = Date.now();
        finRef.current = false;
        setGrilla(g);
        setTablero(nuevoTablero());
        setFin(false);
        sfx.whistle();
        emitir(nuevoTablero(), false); // siembra mi entrada en el ranking
      } else if (type === "prog") {
        const id = String(p.id);
        setEstados((prev) => ({
          ...prev,
          [id]: {
            puntos: Number(p.puntos) || 0,
            aciertos: Number(p.aciertos) || 0,
            resueltas: Number(p.resueltas) || 0,
            fin: Boolean(p.fin),
          },
        }));
      }
    });
  }, [onEvent, codigo, emitir]);

  // El anfitrión arranca: elige semilla y la difunde (con margen para que todos se suscriban).
  useEffect(() => {
    if (isHost && ready && !startedRef.current) {
      startedRef.current = true;
      const seed = Math.floor(Math.random() * 2 ** 32);
      const t = setTimeout(() => send("start", { seed }), 1000);
      return () => clearTimeout(t);
    }
  }, [isHost, ready, send]);

  // Si el anfitrión se va antes de arrancar, asciende el jugador más antiguo y arranca él.
  const hostSeenRef = useRef(false);
  useEffect(() => {
    const hostPresent = players.some((p) => p.host);
    if (hostPresent) {
      hostSeenRef.current = true;
      return;
    }
    if (hostSeenRef.current && players.length > 0 && players[0].id === myId && !isHost && !grilla) {
      hostSeenRef.current = false;
       
      setIsHost(true);
      claimHost(codigo);
    }
  }, [players, myId, isHost, grilla, codigo]);

  // Cuenta atrás de la partida; al agotarse, se cierra automáticamente mi grilla.
  useEffect(() => {
    if (!grilla) return;
    const tick = () => setRemaining(Math.max(0, DUR_MS - (Date.now() - startTsRef.current)));
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [grilla]);

  useEffect(() => {
    if (grilla && remaining <= 0 && !finRef.current) finalizar(tableroRef.current);
  }, [remaining, grilla, finalizar]);

  const responder = useCallback(
    (player: Player) => {
      const g = grillaRef.current;
      if (!g || celda == null || finRef.current) return;
      if (jugadoresUsados(tableroRef.current).has(player.id)) return;
      const ok = cumple(g, celda, player);
      const next: Tablero = [...tableroRef.current];
      next[celda] = { player, ok };
      setTablero(next);
      setCelda(null);
      if (ok) sfx.correct();
      else sfx.wrong();
      emitir(next, false);
      if (terminado(next)) finalizar(next);
    },
    [celda, emitir, finalizar],
  );

  const abrir = useCallback((i: number) => {
    if (finRef.current || tableroRef.current[i] !== null) return;
    sfx.tap();
    setCelda(i);
  }, []);

  const usados = useMemo(() => jugadoresUsados(tablero), [tablero]);
  const miPuntos = grilla ? puntosTotales(grilla, tablero) : 0;
  const miAciertos = contarAciertos(tablero);

  const ranking = [...players]
    .map((pl) => ({ ...pl, e: estados[pl.id] }))
    .sort((a, b) => (b.e?.puntos ?? 0) - (a.e?.puntos ?? 0));
  const todosFin = players.length > 0 && players.every((pl) => estados[pl.id]?.fin);
  const acabo = Boolean(grilla) && (todosFin || remaining <= 0);

  const secs = Math.ceil(remaining / 1000);
  const pct = (remaining / DUR_MS) * 100;
  const barColor = pct > 50 ? "var(--color-green)" : pct > 20 ? "var(--color-amber)" : "var(--color-red)";

  // ---- Render ----
  if (!grilla) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <Loader label="Esperando al anfitrión" />
      </main>
    );
  }

  if (acabo) {
    return (
      <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-8 text-center">
        <MemphisBackground />
        <Confetti pieces={64} />
        <Trophy className="h-12 w-12 text-[var(--color-cyan)]" />
        <h1 className="text-3xl font-black uppercase italic">Resultados</h1>
        <div className="flex w-full max-w-sm flex-col gap-2">
          {ranking.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 ring-white/10"
              style={{ backgroundColor: i === 0 ? "color-mix(in srgb, var(--color-cyan) 25%, transparent)" : "rgba(255,255,255,0.05)" }}
            >
              <span className="w-5 text-center font-black">{i + 1}</span>
              <JerseyAvatar nombre={p.nombre} jersey={p.jersey} size={34} ring={p.color} />
              <span className="font-extrabold">{p.id === myId ? "Tú" : p.nombre}</span>
              {i === 0 && <Crown className="h-4 w-4 text-[var(--color-amber)]" />}
              <span className="ml-auto flex items-center gap-2 font-black tabular-nums">
                <span className="text-[var(--color-gray-light)]/70">{p.e?.aciertos ?? 0}/9</span>
                <span className="text-[var(--color-cyan)]">{p.e?.puntos ?? 0}</span>
              </span>
            </div>
          ))}
        </div>
        <Link
          href={`/sala/${codigo}`}
          className="mt-2 rounded-2xl bg-[var(--color-cyan)] px-7 py-3 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_6px_0_0_#1a8a98]"
        >
          Volver a la sala
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-3 px-4 py-6">
      <MemphisBackground />

      <div className="flex w-full max-w-md items-center justify-between gap-2">
        <Link href={`/sala/${codigo}`} className="text-xs font-bold text-[var(--color-gray-light)]/70 hover:text-white">
          Salir
        </Link>
        <span className="flex items-center gap-1 text-sm font-extrabold tabular-nums" style={{ color: barColor }}>
          <Timer className="h-4 w-4" /> {secs}s
        </span>
      </div>

      {/* Barra de tiempo (transición CSS para que el avance se vea fluido) */}
      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: barColor, transition: "width 270ms linear, background-color 400ms ease" }}
        />
      </div>

      {/* Marcador en vivo */}
      <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
        {ranking.map((p) => (
          <span key={p.id} className="flex items-center gap-2 rounded-2xl bg-white/5 py-1 pl-1 pr-3 ring-1 ring-white/10">
            <JerseyAvatar nombre={p.nombre} jersey={p.jersey} size={28} ring={p.color} dim={!p.e || (p.e.resueltas === 0 && !p.e.fin)} />
            <span className="flex flex-col leading-tight">
              <span className="flex items-center gap-1 text-[11px] font-black">
                {p.id === myId ? "Tú" : p.nombre.length > 8 ? p.nombre.slice(0, 8) + "…" : p.nombre}
                <span className="tabular-nums text-[var(--color-cyan)]">{p.e?.puntos ?? 0}</span>
              </span>
              <span className="text-[10px] font-bold text-[var(--color-gray-light)]/70">
                {p.e?.fin ? "terminó ✓" : `${p.e?.resueltas ?? 0}/9`}
              </span>
            </span>
          </span>
        ))}
      </div>

      {fin ? (
        <p className="mt-2 rounded-2xl bg-white/5 px-5 py-3 text-center text-sm font-bold text-[var(--color-gray-light)] ring-1 ring-white/10">
          ¡Terminaste! {miAciertos}/9 · {miPuntos} pts — esperando a los demás…
        </p>
      ) : (
        <>
          <p className="-mb-1 text-center text-xs text-[var(--color-gray-light)]/70">
            Toca una casilla · <b className="text-white">{miAciertos}/9</b> · {miPuntos} pts
          </p>
          <Grid grilla={grilla} tablero={tablero} jugable onCelda={abrir} />
          <button
            onClick={() => finalizar(tableroRef.current)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-[var(--color-gray-light)] hover:bg-white/20"
          >
            <Flag className="h-4 w-4" /> Terminar
          </button>
        </>
      )}

      <AnimatePresence>
        {celda !== null && (
          <Buscador
            fila={grilla.filas[filaDe(celda)]}
            columna={grilla.columnas[colDe(celda)]}
            excluir={usados}
            onElegir={responder}
            onCerrar={() => setCelda(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
