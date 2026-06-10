import { conFoto, shuffle } from "@/lib/db/queries";
import type { Player } from "@/lib/db/types";

export interface RondaQ {
  player: Player; // el de la foto (siempre tiene foto)
  opciones: string[]; // 4 nombres, uno correcto
  correcta: number; // índice de la opción correcta
}

// ¿Comparten época? (mismo Mundial o nacimiento cercano). Sirve para que los
// distractores sean de la misma generación y no se descarten por edad evidente.
function mismaEpoca(a: Player, b: Player): boolean {
  if (a.mundiales.some((y) => b.mundiales.includes(y))) return true;
  return a.nacimiento != null && b.nacimiento != null && Math.abs(a.nacimiento - b.nacimiento) <= 6;
}

// Cuanto menor el rango, más confundible es el distractor con el jugador de la
// foto. Mismo país (misma camiseta) pesa más: obliga a reconocer la cara y no
// adivinar por la selección. Luego misma posición y misma época.
function rangoDistractor(player: Player, p: Player): number {
  const pais = p.paisEs === player.paisEs;
  const pos = p.posicion === player.posicion;
  const epoca = mismaEpoca(player, p);
  if (pais && pos) return 0;
  if (pais && epoca) return 1;
  if (pais) return 2;
  if (pos && epoca) return 3;
  if (pos) return 4;
  return 5;
}

// Construye 4 opciones: el nombre correcto + 3 distractores lo más parecidos
// posible (mismo país + posición + época) para que la pregunta sea difícil.
// Recibe el pool de donde sacar distractores.
export function construirOpciones(
  player: Player,
  pool: readonly Player[],
): { opciones: string[]; correcta: number } {
  const used = new Set([player.nombre]);
  const distract: string[] = [];
  // shuffle primero (orden aleatorio entre empates) y sort estable por rango:
  // se eligen los candidatos más confundibles, pero variando entre partidas.
  const candidatos = shuffle(pool.filter((p) => p.nombre !== player.nombre)).sort(
    (a, b) => rangoDistractor(player, a) - rangoDistractor(player, b),
  );
  for (const p of candidatos) {
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
// `desde` (opcional): solo jugadores que participaron en un Mundial >= ese año.
export function generarRondaQ(desde = 0): RondaQ | null {
  let conF = conFoto();
  if (desde) {
    const filtrados = conF.filter((p) => p.mundiales.some((y) => y >= desde));
    if (filtrados.length) conF = filtrados; // si el filtro deja vacío, ignóralo
  }
  if (!conF.length) return null;
  const player = conF[Math.floor(Math.random() * conF.length)];
  // Distractores solo de jugadores con foto: nombres coherentes con lo que se ve en el juego.
  const { opciones, correcta } = construirOpciones(player, conF);
  return { player, opciones, correcta };
}
