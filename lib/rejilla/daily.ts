// Grilla diaria determinista: todos ven la misma Rejilla un día dado (compartible),
// y el modo Práctica genera una aleatoria cada vez. Mismo enfoque que la Incógnita.
import { createRng, hashSeed } from "@/lib/engine/rng";
import { generarRejilla, K_POR_DIFICULTAD, type Dificultad, type Rejilla } from "./generate";

// Clave de día local (YYYY-MM-DD). El día cambia a la medianoche local.
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Grilla del día: sembrada con la clave del día → estable y reproducible. El reto de
// hoy es uno solo para todos, con dificultad "normal" (equilibrada y compartible).
export function rejillaDelDia(date: Date): Rejilla {
  const key = dateKey(date);
  return generarRejilla(createRng(hashSeed(`rejilla:${key}`)), key, K_POR_DIFICULTAD.normal);
}

// Grilla de práctica: distinta cada vez y con dificultad elegible. Solo en cliente
// (usa Math.random para la semilla) para evitar mismatch de hidratación.
export function rejillaAleatoria(dificultad: Dificultad = "normal"): Rejilla {
  return generarRejilla(createRng((Math.random() * 2 ** 32) >>> 0), "practica", K_POR_DIFICULTAD[dificultad]);
}
