"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Crown, Play, Wifi, WifiOff } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { JerseyAvatar } from "@/components/ui/JerseyAvatar";
import { EventToasts, useEventToasts } from "@/components/ui/EventToasts";
import { GameTile } from "@/components/GameTile";
import { GAMES } from "@/lib/games";
import { AVATAR_COLORS, ensurePerfil } from "@/lib/perfil";
import { realtimeDisponible } from "@/lib/supabase";
import { sfx } from "@/lib/sound";
import { useRoom } from "@/lib/multiplayer/useRoom";
import { MUNDIAL_DESDE } from "@/lib/multiplayer/rounds";

const GAME_ENTRIES = Object.entries(GAMES);
// El filtro de año solo afecta a juegos basados en datos por año.
const FILTRABLES = new Set(["quiz", "quien-es", "penales"]);

export default function SalaPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = (params.codigo || "").toUpperCase();
  const router = useRouter();
  const search = useSearchParams();
  // El anfitrión es quien creó la sala (?host=1), señal estable que sobrevive a
  // volver del partido al lobby. No se deduce del orden de presencia, que cambia
  // en cada reconexión y reasignaría el anfitrión al azar.
  const isHost = search.get("host") === "1";

  const [perfil, setPerfil] = useState({ nombre: "Tú", color: AVATAR_COLORS[0] });
  const [seleccion, setSeleccion] = useState(GAME_ENTRIES[0][0]);
  const [desde, setDesde] = useState(0);
  const { toasts, push } = useEventToasts();

  useEffect(() => {
    const p = ensurePerfil();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPerfil({ nombre: p.nombre, color: p.color });
  }, []);

  const { players, myId, ready, send, onEvent } = useRoom(codigo, perfil, { host: isHost });

  // Eventos de la sala: selección de juego, filtro de año y empezar (sincronizados).
  const startingRef = useRef(false);
  useEffect(() => {
    onEvent((type, payload) => {
      if (type === "select" && typeof payload.game === "string") setSeleccion(payload.game);
      if (type === "filter") setDesde(Number(payload.desde) || 0);
      if (type === "start" && typeof payload.game === "string") {
        startingRef.current = true; // evita cerrar la sala por la salida de presencia al navegar
        sfx.whistle();
        // La Rejilla no usa el motor por rondas: tiene su propia pantalla multijugador.
        const ruta = payload.game === "rejilla" ? "rejilla" : "jugar";
        router.push(`/sala/${codigo}/${ruta}?game=${payload.game}&desde=${Number(payload.desde) || 0}${isHost ? "&host=1" : ""}`);
      }
    });
  }, [onEvent, router, codigo, isHost]);

  // Avisos de entrada y cierre de sala si el creador (anfitrión) se va.
  const firstRef = useRef(true);
  const prevIdsRef = useRef<string[]>([]);
  const prevHostRef = useRef<string | null>(null);
  const namesRef = useRef<Record<string, string>>({});
  const closingRef = useRef(false);
  useEffect(() => {
    if (closingRef.current) return;
    for (const p of players) namesRef.current[p.id] = p.nombre;
    const curIds = players.map((p) => p.id);
    // El anfitrión real viene marcado en presencia (host=true). players[0] no
    // sirve: al volver del partido el joinedAt se renueva y reordena la lista.
    const hostId = players.find((p) => p.host)?.id ?? null;
    if (firstRef.current) {
      firstRef.current = false;
      prevIdsRef.current = curIds;
      prevHostRef.current = hostId;
      return;
    }
    for (const p of players) {
      if (p.id !== myId && !prevIdsRef.current.includes(p.id)) {
        sfx.join();
        push(`${p.nombre} se unió a la sala`, { icon: "👋", silent: true });
      }
    }
    // El creador de la sala se fue → la sala se acaba para todos (salvo al arrancar partida).
    if (!startingRef.current && prevHostRef.current && hostId !== prevHostRef.current) {
      closingRef.current = true;
      push("La sala se cerró: el anfitrión salió", { icon: "⚠️" });
      sfx.lose();
      setTimeout(() => router.push("/multijugador"), 1800);
      return;
    }
    for (const id of prevIdsRef.current) {
      if (!curIds.includes(id) && id !== myId) push(`${namesRef.current[id] ?? "Alguien"} salió`, { icon: "🚪", silent: true });
    }
    prevIdsRef.current = curIds;
    prevHostRef.current = hostId;
  }, [players, myId, push, router]);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sala/${codigo}`);
      push("¡Link copiado!", { icon: "🔗" });
    } catch {
      push("No se pudo copiar", { icon: "⚠️" });
    }
  };

  const elegir = (game: string) => {
    if (!isHost) return;
    setSeleccion(game);
    send("select", { game });
  };
  const elegirDesde = useCallback(
    (v: number) => {
      if (!isHost) return;
      setDesde(v);
      send("filter", { desde: v });
    },
    [isHost, send],
  );
  const puedeEmpezar = players.length >= 2;
  const empezar = () => {
    if (!isHost || !puedeEmpezar) return;
    send("start", { game: seleccion, desde });
  };

  // Jugadores a mostrar (si aún no conecta, muéstrate a ti mismo).
  const lista = players.length
    ? players
    : [{ id: "me", nombre: perfil.nombre, color: perfil.color, joinedAt: 0, host: isHost }];

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
      <EventToasts toasts={toasts} />

      <div className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Salir
        </Link>
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {realtimeDisponible && ready ? (
            <><Wifi className="h-3.5 w-3.5 text-[var(--color-green)]" /> en vivo</>
          ) : (
            <><WifiOff className="h-3.5 w-3.5 text-[var(--color-amber)]" /> conectando…</>
          )}
        </span>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] p-6 ring-1 ring-white/10">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Código de sala</span>
        <span className="text-5xl font-black tracking-[0.3em] text-[var(--color-green)]">{codigo}</span>
        <motion.button onClick={copiarLink} whileTap={{ scale: 0.95 }} className="mt-1 flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-extrabold ring-1 ring-white/15">
          <Copy className="h-4 w-4" /> Copiar link de invitación
        </motion.button>
      </div>

      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Jugadores ({lista.length})</p>
        <div className="flex flex-wrap gap-2">
          {lista.map((j, i) => (
            <motion.div key={j.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-1.5 pr-3 ring-1 ring-white/10">
              <JerseyAvatar nombre={j.nombre} size={34} ring={j.color} />
              <span className="text-sm font-extrabold">{j.nombre}</span>
              {j.host && <Crown className="h-3.5 w-3.5 text-[var(--color-amber)]" />}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {isHost ? "Elige el juego" : "El anfitrión elige el juego"}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {GAME_ENTRIES.map(([key, info]) => (
            <GameTile key={key} game={key} nombre={info.nombre} accent={info.accent} selected={seleccion === key} disabled={!isHost} onClick={() => elegir(key)} />
          ))}
        </div>
      </div>

      {/* Filtro de Mundial (desde año). Aplica a Quiz, ¿Quién es? y Penales. */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          Mundiales {!FILTRABLES.has(seleccion) && <span className="text-[var(--color-gray-light)]/40">· (no aplica a {GAMES[seleccion]?.nombre})</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {MUNDIAL_DESDE.map((o) => {
            const activo = desde === o.value;
            return (
              <button
                key={o.value}
                onClick={() => elegirDesde(o.value)}
                disabled={!isHost}
                className="rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition disabled:opacity-60"
                style={{
                  backgroundColor: activo ? "var(--color-green)" : "rgba(255,255,255,0.06)",
                  color: activo ? "var(--color-navy-deep)" : "#fff",
                  borderColor: activo ? "var(--color-green)" : "rgba(255,255,255,0.12)",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto w-full max-w-md">
        {isHost ? (
          <>
            <motion.button
              onClick={empezar}
              disabled={!puedeEmpezar}
              whileHover={puedeEmpezar ? { scale: 1.03, y: -2 } : undefined}
              whileTap={puedeEmpezar ? { scale: 0.96 } : undefined}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-green)] px-6 py-4 text-lg font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_8px_0_0_#2c8a2b] disabled:opacity-40 disabled:shadow-none"
            >
              <Play className="h-6 w-6" /> Empezar
            </motion.button>
            {!puedeEmpezar && (
              <p className="mt-2 text-center text-xs font-bold text-[var(--color-amber)]">
                Necesitas al menos 2 jugadores para empezar
              </p>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-white/5 px-6 py-4 text-center font-extrabold text-[var(--color-gray-light)] ring-1 ring-white/10">
            Esperando a que el anfitrión empiece…
          </p>
        )}
      </div>
    </main>
  );
}
