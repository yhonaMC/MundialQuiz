// Índice de búsqueda de jugadores para el buscador de la Rejilla. Indexa nombre y
// apellido normalizados (MAYÚS, sin acentos) reutilizando la normalización de la
// Incógnita. Cada sugerencia es un Player concreto → la validación de celda es exacta
// (sin la ambigüedad de apellidos repetidos que tendría el texto libre).
import { PLAYERS } from "@/lib/db";
import type { Player } from "@/lib/db/types";
import { normalize } from "@/lib/incognita/normalize";
import type { Rejilla } from "./generate";

interface Entrada {
  player: Player;
  nombre: string; // normalizado
  apellido: string; // normalizado
  fama: number; // proxy para ordenar (Mundiales jugados + campeón)
}

const INDICE: Entrada[] = PLAYERS.map((p) => ({
  player: p,
  nombre: normalize(p.nombre),
  apellido: normalize(p.apellido),
  fama: p.mundiales.length + (p.campeon ? 1 : 0),
}));

const PLAYER_POR_ID = new Map(PLAYERS.map((p) => [p.id, p] as const));
export function getPlayer(id: string): Player | undefined {
  return PLAYER_POR_ID.get(id);
}

export interface OpcionesBusqueda {
  excluir?: Set<string>; // ids ya usados en la grilla
  limite?: number;
}

// Busca por substring de nombre o apellido normalizado. Ordena por relevancia:
// los que empiezan por la consulta primero, luego por fama, luego alfabético.
export function buscar(query: string, opts: OpcionesBusqueda = {}): Player[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const excluir = opts.excluir ?? new Set<string>();
  const limite = opts.limite ?? 8;

  const matches = INDICE.filter(
    (e) => !excluir.has(e.player.id) && (e.apellido.includes(q) || e.nombre.includes(q)),
  );

  const rango = (e: Entrada): number => {
    if (e.apellido.startsWith(q)) return 0;
    if (e.nombre.startsWith(q)) return 1;
    return 2;
  };

  matches.sort((a, b) => rango(a) - rango(b) || b.fama - a.fama || a.apellido.localeCompare(b.apellido));
  return matches.slice(0, limite).map((e) => e.player);
}

// Jugadores que cumplen ambos criterios de una celda, los más conocidos primero.
// Sirve para pistas (durante el juego) y para revelar respuestas (al terminar).
export function validosCelda(grilla: Rejilla, idx: number, n = 2, excluir: Set<string> = new Set()): Player[] {
  const f = Math.floor(idx / 3);
  const c = idx % 3;
  return INDICE.filter(
    (e) => !excluir.has(e.player.id) && grilla.filas[f].test(e.player) && grilla.columnas[c].test(e.player),
  )
    .sort((a, b) => b.fama - a.fama || a.apellido.localeCompare(b.apellido))
    .slice(0, n)
    .map((e) => e.player);
}

// Pista de una celda: la inicial del apellido de un jugador válido (no spoilea el
// nombre completo). null si no hay candidatos disponibles.
export function pistaCelda(grilla: Rejilla, idx: number, excluir: Set<string> = new Set()): string | null {
  const [p] = validosCelda(grilla, idx, 1, excluir);
  return p ? `Su apellido empieza por «${p.apellido[0]}»` : null;
}
