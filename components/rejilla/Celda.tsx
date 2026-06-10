"use client";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { getFoto } from "@/lib/db";
import type { Player } from "@/lib/db/types";
import type { Respuesta } from "@/lib/rejilla/game";

// Una celda de la grilla: vacía (jugable o bloqueada), acierto (foto del jugador,
// verde) o fallo (✕, rojo). Al revelar respuestas, las celdas no acertadas muestran
// atenuado un jugador que SÍ cumplía ("pudo ser").
export function Celda({
  respuesta,
  solucion,
  rareza,
  jugable,
  onClick,
}: {
  respuesta: Respuesta | null;
  solucion?: Player | null;
  rareza?: number; // % social (Fase 2): cuántos eligieron a este jugador
  jugable: boolean;
  onClick: () => void;
}) {
  const ok = respuesta?.ok ?? false;

  // Modo revelar: celda no acertada con una solución sugerida.
  if (!ok && solucion) {
    const foto = getFoto(solucion.id);
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-navy)] ring-1 ring-[var(--color-amber)]/40">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public
          <img src={foto.archivo} alt={solucion.nombre} className="h-full w-full object-cover opacity-50" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center text-base font-black text-white/40">
            {solucion.apellido.slice(0, 3)}
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-[var(--color-amber)]/90 px-1 text-[8px] font-black uppercase text-[var(--color-navy-deep)]">
          pudo ser
        </span>
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-center text-[10px] font-bold text-white/90">
          {solucion.apellido}
        </span>
      </div>
    );
  }

  if (!respuesta) {
    return (
      <motion.button
        onClick={jugable ? onClick : undefined}
        disabled={!jugable}
        whileHover={jugable ? { scale: 1.04 } : undefined}
        whileTap={jugable ? { scale: 0.95 } : undefined}
        className="grid aspect-square w-full place-items-center rounded-xl bg-[var(--color-navy)] ring-1 ring-white/10 transition-colors hover:ring-[var(--color-cyan)] disabled:opacity-50"
        aria-label={jugable ? "Rellenar celda" : "Celda sin resolver"}
      >
        {jugable ? (
          <Plus className="h-6 w-6 text-white/30" />
        ) : (
          <span className="text-xl font-black text-white/20">—</span>
        )}
      </motion.button>
    );
  }

  const color = ok ? "var(--color-green)" : "var(--color-red)";
  const foto = getFoto(respuesta.player.id);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={ok ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, x: [0, -7, 7, -4, 4, 0] }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-navy)]"
      style={{ border: `3px solid ${color}` }}
    >
      {ok && foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public
        <img src={foto.archivo} alt={respuesta.player.nombre} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div
          className="grid h-full w-full place-items-center"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {ok ? (
            <span className="text-base font-black sm:text-lg">{respuesta.player.apellido.slice(0, 3)}</span>
          ) : (
            <X className="h-7 w-7 text-[var(--color-red)]" strokeWidth={3} />
          )}
        </div>
      )}
      {ok && rareza != null && (
        <span className="absolute right-1 top-1 rounded bg-[var(--color-cyan)] px-1 text-[9px] font-black text-[var(--color-navy-deep)]">
          {rareza}%
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-center text-[10px] font-bold">
        {respuesta.player.apellido}
      </span>
    </motion.div>
  );
}
