// Puntuación por escasez local (Fase 1): una celda vale más cuantos menos jugadores
// de la BD la cumplen. 100% determinista y offline — no depende de otros usuarios,
// así que no tiene "cold-start". (La rareza social vía Supabase es una capa posterior.)
import type { Player } from "@/lib/db/types";

// Puntos base de una celda según su nº de jugadores elegibles (más restrictiva = más).
export function puntosCelda(n: number): number {
  if (n <= 3) return 95;
  if (n <= 6) return 80;
  if (n <= 12) return 60;
  if (n <= 25) return 40;
  if (n <= 50) return 25;
  return 15;
}

// Proxy de "elección poco obvia": jugadores menos mediáticos (no campeones y con
// pocos Mundiales) premian un pequeño extra. La Fase 2 (Supabase) lo hará exacto.
export function esPocoObvio(p: Player): boolean {
  return !p.campeon && p.mundiales.length < 3;
}

export function puntosRespuesta(n: number, jugador: Player): number {
  return Math.round(puntosCelda(n) * (esPocoObvio(jugador) ? 1.1 : 1));
}

// Bonus por completar las 9 celdas ("Rejilla Perfecta").
export const BONUS_PERFECTA = 100;

// Penalización de puntos por cada pista usada.
export const PENAL_PISTA = 30;
