// Catálogo de criterios de la Rejilla Mundialera, derivado de la BD de jugadores.
// Un criterio es una condición booleana sobre un Player (selección, posición,
// confederación, "jugó el Mundial X", campeón, década, etc.). Las cabeceras de
// fila y columna de la grilla son criterios; cada celda cruza fila × columna.
import { PLAYERS } from "@/lib/db";
import type { Confederacion, Player } from "@/lib/db/types";

// "geografia" y "logro" agrupan criterios afines: el generador nunca cruza dos
// criterios de la misma familia en una celda (evita celdas imposibles como
// Argentina × Brasil o redundantes como Argentina × CONMEBOL).
export type Familia = "geografia" | "temporal" | "rol" | "logro";

export interface Criterio {
  id: string; // estable, p.ej. "pais:Argentina", "mundial:2018"
  familia: Familia;
  label: string; // texto completo (buscador / accesibilidad)
  short: string; // versión compacta para la cabecera de la grilla
  prefijo?: string; // etiqueta de contexto sobre el short (desambigua los temporales)
  test: (p: Player) => boolean;
}

// Umbrales mínimos de población para que un valor sea criterio elegible. Calibrados
// con la distribución real de la BD (ver scripts de medición): países ≥14 → 50 países,
// años ≥14 → 1994‑2026, décadas ≥30 → 1970‑2000, confederaciones ≥30 → todas menos OFC.
const MIN_PAIS = 14;
const MIN_YEAR = 14;
const MIN_DECADA = 30;
const MIN_CONF = 30;

const POSICIONES: Player["posicion"][] = ["Portero", "Defensa", "Mediocampista", "Delantero"];

function contar<K extends string | number>(key: (p: Player) => K | null | undefined): Map<K, number> {
  const m = new Map<K, number>();
  for (const p of PLAYERS) {
    const k = key(p);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

// Entradas con población suficiente, ordenadas de forma estable (mayor población
// primero, desempate por clave) para que el catálogo sea determinista.
function elegibles<K extends string | number>(counts: Map<K, number>, min: number): K[] {
  return [...counts.entries()]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([k]) => k);
}

function construirCatalogo(): Criterio[] {
  const out: Criterio[] = [];

  // Geografía — selecciones
  for (const pais of elegibles(contar((p) => p.paisEs), MIN_PAIS)) {
    out.push({ id: `pais:${pais}`, familia: "geografia", label: pais, short: pais, test: (p) => p.paisEs === pais });
  }
  // Geografía — confederaciones
  for (const conf of elegibles(contar((p) => p.confederacion), MIN_CONF)) {
    out.push({
      id: `conf:${conf}`,
      familia: "geografia",
      label: conf as Confederacion,
      short: conf as Confederacion,
      test: (p) => p.confederacion === conf,
    });
  }
  // Rol — posiciones (short compacto para la cabecera; label completo en el buscador)
  const POS_SHORT: Partial<Record<Player["posicion"], string>> = { Mediocampista: "Medio" };
  for (const pos of POSICIONES) {
    out.push({ id: `pos:${pos}`, familia: "rol", label: pos, short: POS_SHORT[pos] ?? pos, test: (p) => p.posicion === pos });
  }
  // Temporal — Mundiales
  for (const year of aniosElegibles()) {
    out.push({
      id: `mundial:${year}`,
      familia: "temporal",
      label: `Jugó el Mundial ${year}`,
      short: String(year),
      prefijo: "Mundial",
      test: (p) => p.mundiales.includes(year),
    });
  }
  // Temporal — décadas de nacimiento
  for (const dec of elegibles(contar((p) => (p.nacimiento ? Math.floor(p.nacimiento / 10) * 10 : null)), MIN_DECADA)) {
    const d = Number(dec);
    out.push({
      id: `decada:${d}`,
      familia: "temporal",
      label: `Nacidos en los ${d}`,
      short: `${String(d).slice(2)}s`, // 1990 → "90s" (no se confunde con un año)
      prefijo: "Nacidos",
      test: (p) => p.nacimiento != null && Math.floor(p.nacimiento / 10) * 10 === d,
    });
  }
  // Logro — fijos
  out.push({ id: "campeon", familia: "logro", label: "Campeón del mundo", short: "Campeón", test: (p) => p.campeon });
  out.push({
    id: "veterano",
    familia: "logro",
    label: "Jugó 3+ Mundiales",
    short: "3+ Mundiales",
    test: (p) => p.mundiales.length >= 3,
  });
  out.push({
    id: "alto",
    familia: "logro",
    label: "Mide 1,90 m o más",
    short: "1,90 m+",
    test: (p) => p.altura != null && p.altura >= 190,
  });

  return out;
}

// Años de Mundial con población suficiente (el conteo recorre cada array `mundiales`).
function aniosElegibles(): number[] {
  const counts = new Map<number, number>();
  for (const p of PLAYERS) for (const y of p.mundiales) counts.set(y, (counts.get(y) ?? 0) + 1);
  return elegibles(counts, MIN_YEAR).sort((a, b) => a - b);
}

export const CRITERIOS: Criterio[] = construirCatalogo();

export const CRITERIOS_POR_FAMILIA: Record<Familia, Criterio[]> = {
  geografia: CRITERIOS.filter((c) => c.familia === "geografia"),
  temporal: CRITERIOS.filter((c) => c.familia === "temporal"),
  rol: CRITERIOS.filter((c) => c.familia === "rol"),
  logro: CRITERIOS.filter((c) => c.familia === "logro"),
};
