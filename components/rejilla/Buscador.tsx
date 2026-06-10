"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Search, User, X } from "lucide-react";
import { getFoto } from "@/lib/db";
import type { Player } from "@/lib/db/types";
import type { Criterio } from "@/lib/rejilla/criterios";
import { buscar } from "@/lib/rejilla/search";
import { PENAL_PISTA } from "@/lib/rejilla/rarity";

// Hoja de búsqueda: se abre al tocar una celda. Muestra los dos criterios que se
// cruzan, un input y sugerencias de jugadores (excluyendo los ya usados). Elegir un
// jugador lo coloca en la celda — si no cumple ambos criterios, esa celda falla.
export function Buscador({
  fila,
  columna,
  excluir,
  pista,
  onPista,
  onElegir,
  onCerrar,
}: {
  fila: Criterio;
  columna: Criterio;
  excluir: Set<string>;
  pista?: string | null; // ausente → sin opción de pista (multijugador)
  onPista?: () => void;
  onElegir: (p: Player) => void;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0); // resultado resaltado (navegación por teclado)
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resultados = useMemo(() => buscar(q, { excluir, limite: 8 }), [q, excluir]);

  // Teclado: ↑/↓ mueven el resaltado, Enter elige, Esc cierra.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onCerrar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = resultados[activo];
      if (p) onElegir(p);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-[var(--color-navy)] p-4 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black uppercase italic">
            <span className="text-[var(--color-cyan)]">{fila.label}</span>
            <span className="text-white/40"> × </span>
            <span className="text-[var(--color-cyan)]">{columna.label}</span>
          </p>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
          <Search className="h-4 w-4 text-white/50" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActivo(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Escribe un jugador…"
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-white/40"
          />
        </div>

        {/* Pista: revela una inicial de apellido a cambio de puntos (solo si está habilitada) */}
        {onPista &&
          (pista ? (
            <span className="flex items-center gap-1.5 self-start rounded-full bg-[var(--color-amber)]/15 px-3 py-1 text-xs font-bold text-[var(--color-amber)]">
              <Lightbulb className="h-3.5 w-3.5" /> {pista}
            </span>
          ) : (
            <button
              onClick={onPista}
              className="flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-[var(--color-gray-light)] ring-1 ring-white/15 hover:bg-white/15"
            >
              <Lightbulb className="h-3.5 w-3.5 text-[var(--color-amber)]" /> Pista (−{PENAL_PISTA} pts)
            </button>
          ))}

        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {resultados.map((p, i) => {
            const foto = getFoto(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onElegir(p)}
                onMouseEnter={() => setActivo(i)}
                className={`flex items-center gap-3 rounded-xl p-1.5 text-left ${i === activo ? "bg-white/10" : "hover:bg-white/10"}`}
              >
                <span className="grid h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- thumbnails locales en /public
                    <img src={foto.archivo} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <User className="m-auto h-4 w-4 text-white/40" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{p.nombre}</span>
                  <span className="block truncate text-[11px] text-[var(--color-gray-light)]/70">
                    {p.paisEs} · {p.posicion}
                  </span>
                </span>
              </button>
            );
          })}
          {q.trim().length >= 2 && resultados.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[var(--color-gray-light)]/60">Sin resultados</p>
          )}
          {q.trim().length < 2 && (
            <p className="px-2 py-6 text-center text-sm text-[var(--color-gray-light)]/60">
              Escribe al menos 2 letras
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
