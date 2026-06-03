"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Copy, Crown, Play } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { getGame } from "@/lib/games";

// MOCK: jugadores de ejemplo para validar el diseño (sin backend todavía).
const MOCK_AMIGOS = [
  { nombre: "Carlos", color: "var(--color-red)" },
  { nombre: "Ana", color: "var(--color-amber)" },
];

function Avatar({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: color }}>
      {nombre.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function SalaPage() {
  const params = useParams<{ codigo: string }>();
  const search = useSearchParams();
  const codigo = (params.codigo || "").toUpperCase();
  const gameKey = search.get("game") ?? "";
  const isHost = search.get("host") === "1";
  const game = getGame(gameKey);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  };

  const copiarLink = async () => {
    try {
      const url = `${window.location.origin}/sala/${codigo}?game=${gameKey}`;
      await navigator.clipboard.writeText(url);
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
        {game && <span className="text-sm font-extrabold text-[var(--color-gray-light)]">{game.nombre}</span>}
      </div>

      <h1 className="text-2xl font-black uppercase italic sm:text-3xl">Sala de espera</h1>

      {/* Código + link */}
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] p-6 ring-1 ring-white/10">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Código de sala</span>
        <span className="text-5xl font-black tracking-[0.3em] text-[var(--color-green)]">{codigo}</span>
        <motion.button
          onClick={copiarLink}
          whileTap={{ scale: 0.95 }}
          className="mt-1 flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-extrabold ring-1 ring-white/15"
        >
          <Copy className="h-4 w-4" /> Copiar link de invitación
        </motion.button>
      </div>

      {/* Jugadores */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          Jugadores ({jugadores.length})
        </p>
        <div className="flex flex-col gap-2">
          {jugadores.map((j, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10"
            >
              <Avatar nombre={j.nombre} color={j.color} />
              <span className="font-extrabold">{j.nombre}</span>
              {j.host && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-[var(--color-amber)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-navy-deep)]">
                  <Crown className="h-3 w-3" /> Anfitrión
                </span>
              )}
              <Check className="ml-auto h-4 w-4 text-[var(--color-green)]" style={{ marginLeft: j.host ? "0.5rem" : "auto" }} />
            </motion.div>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-[var(--color-gray-light)]/40">
          (Vista previa — los jugadores en tiempo real llegan en la siguiente fase)
        </p>
      </div>

      <div className="mt-auto w-full max-w-md">
        {isHost ? (
          <motion.button
            onClick={() => flash("El tiempo real se conecta en la siguiente fase ⚡")}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-green)] px-6 py-4 text-lg font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_8px_0_0_#2c8a2b]"
          >
            <Play className="h-6 w-6" /> Empezar partida
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
