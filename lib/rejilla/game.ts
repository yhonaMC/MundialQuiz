// Lógica pura del juego Rejilla (sin React ni efectos): validación de celda, fin de
// partida, jugadores usados y puntuación total. El hook de UI se monta sobre esto.
import type { Player } from "@/lib/db/types";
import type { Rejilla } from "./generate";
import { BONUS_PERFECTA, puntosRespuesta } from "./rarity";

// Resultado de una celda: jugador colocado + si cumplía ambos criterios. null = sin intentar.
export interface Respuesta {
  player: Player;
  ok: boolean;
}
export type Tablero = (Respuesta | null)[]; // longitud 9, índice = fila*3 + col

export const CELDAS = 9;

export function nuevoTablero(): Tablero {
  return Array.from({ length: CELDAS }, () => null);
}

export const filaDe = (idx: number): number => Math.floor(idx / 3);
export const colDe = (idx: number): number => idx % 3;

// ¿El jugador cumple los dos criterios que se cruzan en la celda?
export function cumple(grilla: Rejilla, idx: number, jugador: Player): boolean {
  return grilla.filas[filaDe(idx)].test(jugador) && grilla.columnas[colDe(idx)].test(jugador);
}

export function jugadoresUsados(tablero: Tablero): Set<string> {
  const s = new Set<string>();
  for (const r of tablero) if (r) s.add(r.player.id);
  return s;
}

export function celdasResueltas(tablero: Tablero): number {
  return tablero.filter((r) => r !== null).length;
}

export function aciertos(tablero: Tablero): number {
  return tablero.filter((r) => r?.ok).length;
}

export function terminado(tablero: Tablero): boolean {
  return tablero.every((r) => r !== null);
}

export function perfecta(tablero: Tablero): boolean {
  return tablero.every((r) => r?.ok);
}

// Puntuación total: suma de las celdas acertadas (por escasez) + bonus si 9/9.
export function puntosTotales(grilla: Rejilla, tablero: Tablero): number {
  let total = 0;
  for (let i = 0; i < CELDAS; i++) {
    const r = tablero[i];
    if (r?.ok) total += puntosRespuesta(grilla.elegibles[filaDe(i)][colDe(i)], r.player);
  }
  if (perfecta(tablero)) total += BONUS_PERFECTA;
  return total;
}
