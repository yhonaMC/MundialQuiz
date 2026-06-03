"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, Crown, Play } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { GAMES } from "@/lib/games";

const MOCK_AMIGOS = [
  { nombre: "Carlos", color: "var(--color-red)" },
  { nombre: "Ana", color: "var(--color-amber)" },
];

const GAME_ENTRIES = Object.entries(GAMES);

function Avatar({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full text-xs font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: color }}>
      {nombre.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function SalaPage() {
  const params = useParams<{ codigo: string }>();
  const search = useSearchParams();
  const codigo = (params.codigo || "").toUpperCase();
  const isHost = search.get("host") === "1";
  const [seleccion, setSeleccion] = useState(GAME_ENTRIES[0][0]);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sala/${codigo}`);
      flash("¡Link copiado!");
    } catch {
      flash("No se pudo copiar");
    }
  };

  const jugadores = [
    { nombre: "Tú", color: "var(--color-green)", host: isHost },
    ...MOCK_AMIGOS.map((a) => ({ ...a, host: false })),
  ];

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl bg-white px-5 py-3 font-extrabold text-[var(--color-navy-deep)] shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Salir
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Sala</span>
      </div>

      {/* Código + link */}
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] p-6 ring-1 ring-white/10">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Código de sala</span>
        <span className="text-5xl font-black tracking-[0.3em] text-[var(--color-green)]">{codigo}</span>
        <motion.button onClick={copiarLink} whileTap={{ scale: 0.95 }} className="mt-1 flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-extrabold ring-1 ring-white/15">
          <Copy className="h-4 w-4" /> Copiar link de invitación
        </motion.button>
      </div>

      {/* Jugadores */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Jugadores ({jugadores.length})</p>
        <div className="flex flex-wrap gap-2">
          {jugadores.map((j, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-1.5 pr-3 ring-1 ring-white/10"
            >
              <Avatar nombre={j.nombre} color={j.color} />
              <span className="text-sm font-extrabold">{j.nombre}</span>
              {j.host && <Crown className="h-3.5 w-3.5 text-[var(--color-amber)]" />}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selector de juego dentro de la sala */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {isHost ? "Elige el juego" : "El anfitrión elige el juego"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GAME_ENTRIES.map(([key, info]) => {
            const activo = seleccion === key;
            return (
              <button
                key={key}
                onClick={() => isHost && setSeleccion(key)}
                disabled={!isHost}
                className="rounded-2xl px-4 py-3 text-left text-sm font-black ring-1 transition-colors"
                style={{
                  backgroundColor: activo ? info.accent : "rgba(255,255,255,0.06)",
                  color: activo ? "var(--color-navy-deep)" : "#fff",
                  borderColor: activo ? info.accent : "rgba(255,255,255,0.12)",
                }}
              >
                {info.nombre}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[10px] text-[var(--color-gray-light)]/40">
          (Vista previa — el tiempo real y el cambio de modo sin salir llegan en la siguiente fase)
        </p>
      </div>

      <div className="mt-auto w-full max-w-md">
        {isHost ? (
          <motion.button
            onClick={() => flash(`Empezando ${GAMES[seleccion].nombre} ⚡ (tiempo real: próxima fase)`)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-green)] px-6 py-4 text-lg font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_8px_0_0_#2c8a2b]"
          >
            <Play className="h-6 w-6" /> Empezar
          </motion.button>
        ) : (
          <p className="rounded-2xl bg-white/5 px-6 py-4 text-center font-extrabold text-[var(--color-gray-light)] ring-1 ring-white/10">
            Esperando a que el anfitrión empiece…
          </p>
        )}
      </div>
    </main>
  );
}
