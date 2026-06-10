// Generación de la grilla 3×3 de la Rejilla Mundialera.
//
// Garantía estructural: las familias de criterio usadas en las filas son DISJUNTAS
// de las usadas en las columnas → toda celda cruza familias distintas (no hay celdas
// imposibles ni redundantes). Sobre eso, se exige que cada celda tenga ≥ K jugadores
// elegibles en la BD (resoluble por un humano). Si tras varios intentos no se logra,
// cae a un fallback siempre válido (posición × confederación).
import { PLAYERS } from "@/lib/db";
import type { Rng } from "@/lib/engine/rng";
import { CRITERIOS_POR_FAMILIA, type Criterio, type Familia } from "./criterios";

export interface Rejilla {
  filas: Criterio[]; // 3
  columnas: Criterio[]; // 3
  elegibles: number[][]; // [fila][col] = nº de jugadores de la BD que cumplen ambos
  id: string; // identificador estable (clave de día en modo Diario)
}

export const K = 3; // mínimo absoluto de jugadores elegibles por celda (dificultad máxima)
const MAX_INTENTOS = 120;

// Niveles: el mínimo de jugadores que debe cumplir cada celda. Más alto = más fácil
// (más candidatos conocidos por casilla). El Diario usa "normal".
export type Dificultad = "facil" | "normal" | "dificil";
export const K_POR_DIFICULTAD: Record<Dificultad, number> = { facil: 12, normal: 6, dificil: K };

// Conjuntos de ids precomputados por criterio (memo): acelera el conteo de celdas.
const SETS = new Map<string, Set<string>>();
function idsDe(c: Criterio): Set<string> {
  let s = SETS.get(c.id);
  if (!s) {
    s = new Set(PLAYERS.filter(c.test).map((p) => p.id));
    SETS.set(c.id, s);
  }
  return s;
}

function interseccion(a: Set<string>, b: Set<string>): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let n = 0;
  for (const id of small) if (big.has(id)) n++;
  return n;
}

// Las tres particiones de las 4 familias en dos pares disjuntos (filas | columnas).
const PARTICIONES: [Familia[], Familia[]][] = [
  [["geografia", "temporal"], ["rol", "logro"]],
  [["geografia", "rol"], ["temporal", "logro"]],
  [["geografia", "logro"], ["temporal", "rol"]],
];

function poolDe(familias: Familia[]): Criterio[] {
  return familias.flatMap((f) => CRITERIOS_POR_FAMILIA[f]);
}

function matrizElegibles(filas: Criterio[], columnas: Criterio[]): number[][] {
  return filas.map((f) => columnas.map((c) => interseccion(idsDe(f), idsDe(c))));
}

function todasResolubles(m: number[][], k: number): boolean {
  return m.every((fila) => fila.every((n) => n >= k));
}

// Genera una grilla cuyas 9 celdas tienen al menos `kMin` jugadores elegibles. Si no
// lo logra al nivel pedido, relaja el mínimo de forma escalonada hasta K (siempre
// resuelve); como último recurso usa el fallback amplio.
export function generarRejilla(rng: Rng, id = "practica", kMin: number = K): Rejilla {
  for (let k = Math.max(kMin, K); k >= K; k--) {
    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const part = rng.pick(PARTICIONES);
      // Aleatoriza qué par va a filas y cuál a columnas (varía la orientación).
      const [filaFams, colFams] = rng.next() < 0.5 ? part : [part[1], part[0]];
      const poolF = poolDe(filaFams);
      const poolC = poolDe(colFams);
      if (poolF.length < 3 || poolC.length < 3) continue;

      const filas = rng.sample(poolF, 3);
      const columnas = rng.sample(poolC, 3);
      const elegibles = matrizElegibles(filas, columnas);
      if (todasResolubles(elegibles, k)) return { filas, columnas, elegibles, id };
    }
  }
  return fallback(rng, id);
}

// Fallback garantizado: posiciones (rol) × confederaciones grandes (geografía).
// Todas las intersecciones son amplias, así que siempre cumple K.
function fallback(rng: Rng, id: string): Rejilla {
  const filas = rng.sample(CRITERIOS_POR_FAMILIA.rol, 3);
  const confs = CRITERIOS_POR_FAMILIA.geografia.filter((c) => c.id.startsWith("conf:"));
  const columnas = rng.sample(confs, 3);
  const elegibles = matrizElegibles(filas, columnas);
  return { filas, columnas, elegibles, id };
}
