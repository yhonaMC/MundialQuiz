"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Crown, Pencil, Play, Users, Wifi, WifiOff, X } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { JerseyAvatar } from "@/components/ui/JerseyAvatar";
import { EventToasts, useEventToasts } from "@/components/ui/EventToasts";
import { PerfilEditor } from "@/components/PerfilEditor";
import { GameTile } from "@/components/GameTile";
import { GAMES } from "@/lib/games";
import { AVATAR_COLORS, ensurePerfil, savePerfil, type Perfil } from "@/lib/perfil";
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
  // El anfitrión inicial es quien creó la sala (?host=1), señal estable que sobrevive a
  // volver del partido al lobby. Si el anfitrión se va, el liderazgo pasa al jugador
  // más antiguo de la sala (elección determinista: todos ven la misma lista ordenada).
  const [isHost, setIsHost] = useState(() => search.get("host") === "1");

  const [perfil, setPerfil] = useState<Perfil>({ nombre: "Tú", color: AVATAR_COLORS[0] });
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState(GAME_ENTRIES[0][0]);
  const [desde, setDesde] = useState(0);
  const { toasts, push } = useEventToasts();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setPerfil(ensurePerfil());
  }, []);

  const actualizarPerfil = (p: Perfil) => {
    setPerfil(p);
    savePerfil(p); // la presencia se re-publica sola (useRoom) y todos lo ven al instante
  };

  const { players, myId, ready, send, onEvent } = useRoom(codigo, perfil, { host: isHost });

  // Eventos de la sala: selección de juego, filtro de año y empezar (sincronizados).
  const startingRef = useRef(false);
  useEffect(() => {
    onEvent((type, payload) => {
      if (type === "select" && typeof payload.game === "string") setSeleccion(payload.game);
      if (type === "filter") setDesde(Number(payload.desde) || 0);
      if (type === "start" && typeof payload.game === "string") {
        startingRef.current = true; // evita reelección de anfitrión por la salida de presencia al navegar
        sfx.whistle();
        // La Rejilla no usa el motor por rondas: tiene su propia pantalla multijugador.
        const ruta = payload.game === "rejilla" ? "rejilla" : "jugar";
        router.push(`/sala/${codigo}/${ruta}?game=${payload.game}&desde=${Number(payload.desde) || 0}${isHost ? "&host=1" : ""}`);
      }
    });
  }, [onEvent, router, codigo, isHost]);

  // Avisos de entrada/salida y traspaso de anfitrión si el actual se va.
  const firstRef = useRef(true);
  const prevIdsRef = useRef<string[]>([]);
  const prevHostRef = useRef<string | null>(null);
  const namesRef = useRef<Record<string, string>>({});
  useEffect(() => {
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
    for (const id of prevIdsRef.current) {
      if (!curIds.includes(id) && id !== myId) push(`${namesRef.current[id] ?? "Alguien"} salió`, { icon: "🚪", silent: true });
    }
    // El anfitrión se fue → asciende el jugador más antiguo (mismo resultado en todos
    // los clientes; solo el elegido se marca host y la presencia avisa al resto).
    if (!startingRef.current && prevHostRef.current && !hostId && players.length > 0) {
      const candidato = players[0];
      prevHostRef.current = candidato.id; // optimista: evita reelegir en syncs intermedios
      if (candidato.id === myId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- promoción por evento externo (presencia)
        setIsHost(true);
        sfx.join();
        push("👑 Ahora eres el anfitrión", { icon: "👑" });
      } else {
        push(`${candidato.nombre} es el nuevo anfitrión`, { icon: "👑", silent: true });
      }
    } else if (hostId) {
      prevHostRef.current = hostId;
    }
    prevIdsRef.current = curIds;
  }, [players, myId, push]);

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
    : [{ id: "me", nombre: perfil.nombre, color: perfil.color, jersey: perfil.jersey ?? null, joinedAt: 0, host: isHost }];

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
      <EventToasts toasts={toasts} />

      <div className="flex w-full max-w-5xl items-center justify-between">
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

      {/* Dos columnas en desktop: jugadores (protagonistas) | configuración del partido */}
      <div className="grid w-full max-w-5xl flex-1 gap-5 lg:grid-cols-[2fr_3fr] lg:items-start">
        {/* Columna izquierda: código + jugadores + perfil */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col items-center gap-2 rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Código de sala</span>
            <span className="text-5xl font-black tracking-[0.3em] text-[var(--color-green)]">{codigo}</span>
            <motion.button onClick={copiarLink} whileTap={{ scale: 0.95 }} className="mt-1 flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-extrabold ring-1 ring-white/15 hover:bg-white/15">
              <Copy className="h-4 w-4" /> Copiar link de invitación
            </motion.button>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
              <Users className="h-3.5 w-3.5" /> Jugadores ({lista.length})
            </p>
            <div className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {lista.map((j, i) => {
                  const soyYo = j.id === myId || j.id === "me";
                  return (
                    <motion.div
                      key={j.id}
                      layout
                      initial={{ opacity: 0, x: -16, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 16, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2 ring-1 ring-white/10"
                      style={{ backgroundColor: soyYo ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)" }}
                    >
                      <JerseyAvatar nombre={j.nombre} jersey={j.jersey} size={46} ring={j.color} />
                      <span className="min-w-0 truncate text-lg font-black">{j.nombre}</span>
                      {j.host && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-amber)]/15 px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-amber)]">
                          <Crown className="h-3 w-3" /> Anfitrión
                        </span>
                      )}
                      {soyYo && (
                        <button
                          onClick={() => setEditando((v) => !v)}
                          aria-label="Editar mi perfil"
                          className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-white/15 hover:bg-white/20"
                        >
                          {editando ? <X className="h-3 w-3" /> : <Pencil className="h-3 w-3" />} {editando ? "Cerrar" : "Editar"}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {lista.length < 2 && (
              <p className="mt-1 text-center text-xs font-bold text-[var(--color-gray-light)]/60">
                Comparte el código para que se unan tus amigos
              </p>
            )}
          </div>

          <AnimatePresence>
            {editando && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
                    Tu perfil · los cambios se ven al instante
                  </p>
                  <PerfilEditor value={perfil} onChange={actualizarPerfil} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Columna derecha: juego, filtro y empezar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
              {isHost ? "Elige el juego" : "El anfitrión elige el juego"}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {GAME_ENTRIES.map(([key, info]) => (
                <GameTile key={key} game={key} nombre={info.nombre} accent={info.accent} selected={seleccion === key} disabled={!isHost} onClick={() => elegir(key)} />
              ))}
            </div>

            {/* Filtro de Mundial (desde año). Aplica a Quiz, ¿Quién es? y Penales. */}
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
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

          <div className="w-full">
            {isHost ? (
              <>
                <motion.button
                  onClick={empezar}
                  disabled={!puedeEmpezar}
                  whileHover={puedeEmpezar ? { scale: 1.02, y: -2 } : undefined}
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
        </div>
      </div>
    </main>
  );
}
