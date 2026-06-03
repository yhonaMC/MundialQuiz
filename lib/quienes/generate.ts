import { PLAYERS } from "@/lib/db/players";
import { conFoto, shuffle } from "@/lib/db/queries";
import type { Player } from "@/lib/db/types";

export interface RondaQ {
  player: Player; // el de la foto (siempre tiene foto)
  opciones: string[]; // 4 nombres, uno correcto
  correcta: number; // índice de la opción correcta
}

// Construye 4 opciones: el nombre correcto + 3 distractores (preferentemente de la
// misma posición, para que sea reto). Recibe el pool de donde sacar distractores.
export function construirOpciones(
  player: Player,
  pool: readonly Player[],
): { opciones: string[]; correcta: number } {
  const used = new Set([player.nombre]);
  const distract: string[] = [];
  const samePos = shuffle(pool.filter((p) => p.posicion === player.posicion));
  const rest = shuffle(pool);
  for (const p of [...samePos, ...rest]) {
    if (distract.length >= 3) break;
    if (!used.has(p.nombre)) {
      used.add(p.nombre);
      distract.push(p.nombre);
    }
  }
  const opciones = shuffle([player.nombre, ...distract]);
  return { opciones, correcta: opciones.indexOf(player.nombre) };
}

export function hayFotos(): boolean {
  return conFoto().length > 0;
}

// Genera una ronda completa (o null si todavía no hay fotos descargadas).
export function generarRondaQ(): RondaQ | null {
  const conF = conFoto();
  if (!conF.length) return null;
  const player = conF[Math.floor(Math.random() * conF.length)];
  const { opciones, correcta } = construirOpciones(player, PLAYERS);
  return { player, opciones, correcta };
}
