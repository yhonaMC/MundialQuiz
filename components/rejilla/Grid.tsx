"use client";
import { Fragment } from "react";
import type { Player } from "@/lib/db/types";
import type { Criterio } from "@/lib/rejilla/criterios";
import type { Rejilla } from "@/lib/rejilla/generate";
import type { Tablero } from "@/lib/rejilla/game";
import { banderaUrl } from "@/lib/rejilla/flags";
import { Celda } from "./Celda";

function Cabecera({ criterio }: { criterio: Criterio }) {
  const bandera = criterio.id.startsWith("pais:") ? banderaUrl(criterio.label) : null;
  return (
    <div
      title={criterio.label}
      className="flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg bg-[var(--color-cyan)]/15 px-1 py-1 text-center ring-1 ring-[var(--color-cyan)]/30"
    >
      {criterio.prefijo && (
        <span className="text-[7px] font-bold uppercase leading-none tracking-wide text-[var(--color-cyan)]/60 sm:text-[8px]">
          {criterio.prefijo}
        </span>
      )}
      {bandera && (
        // eslint-disable-next-line @next/next/no-img-element -- bandera externa (flagcdn), tamaño fijo
        <img src={bandera} alt="" className="h-3 w-auto rounded-[2px] ring-1 ring-white/20" loading="lazy" />
      )}
      <span className="w-full text-[10px] font-black uppercase leading-[1.05] text-[var(--color-cyan)] [overflow-wrap:anywhere] sm:text-[11px]">
        {criterio.short}
      </span>
    </div>
  );
}

// Grilla 3×3 con cabeceras: esquina vacía + 3 criterios de columna arriba, y 3 de
// fila a la izquierda. Cada celda cruza su criterio de fila con el de columna.
export function Grid({
  grilla,
  tablero,
  jugable,
  soluciones,
  rarezas,
  onCelda,
}: {
  grilla: Rejilla;
  tablero: Tablero;
  jugable: boolean;
  soluciones?: (Player | undefined)[]; // por celda; revela quién pudo ir (no acertadas)
  rarezas?: Record<number, number>; // % social por celda (Fase 2)
  onCelda: (i: number) => void;
}) {
  return (
    <div className="grid w-full max-w-md gap-1.5" style={{ gridTemplateColumns: "minmax(52px, 0.75fr) 1fr 1fr 1fr" }}>
      <div aria-hidden />
      {grilla.columnas.map((c) => (
        <Cabecera key={c.id} criterio={c} />
      ))}

      {grilla.filas.map((f, fi) => (
        <Fragment key={f.id}>
          <Cabecera criterio={f} />
          {grilla.columnas.map((_, ci) => {
            const idx = fi * 3 + ci;
            return (
              <Celda
                key={idx}
                respuesta={tablero[idx]}
                solucion={soluciones?.[idx]}
                rareza={rarezas?.[idx]}
                jugable={jugable}
                onClick={() => onCelda(idx)}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
