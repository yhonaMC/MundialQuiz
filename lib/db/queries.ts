import { PLAYERS } from "./players";
import { TEAMS } from "./teams";
import { TOURNAMENTS } from "./tournaments";
import { PHOTOS } from "./photos";
import type { Confederacion, Foto, Player, Team, Tournament } from "./types";

// Consultas compartidas: la base sobre la que se montan todos los juegos.

export function porPais(paisEs: string): Player[] {
  return PLAYERS.filter((p) => p.paisEs === paisEs);
}

export function porPosicion(posicion: Player["posicion"]): Player[] {
  return PLAYERS.filter((p) => p.posicion === posicion);
}

export function porConfederacion(conf: Confederacion): Player[] {
  return PLAYERS.filter((p) => p.confederacion === conf);
}

export function porMundial(year: number): Player[] {
  return PLAYERS.filter((p) => p.mundiales.includes(year));
}

export function campeones(): Player[] {
  return PLAYERS.filter((p) => p.campeon);
}

// Jugadores que tienen foto resuelta (con la atribución adjunta).
export function conFoto(): Player[] {
  return PLAYERS.filter((p) => PHOTOS[p.id]).map((p) => ({ ...p, foto: PHOTOS[p.id] }));
}

export function getFoto(id: string): Foto | undefined {
  return PHOTOS[id];
}

export function getTeam(code: string): Team | undefined {
  return TEAMS.find((t) => t.code === code);
}

export function getTournament(year: number): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.year === year);
}

// Baraja una copia (Math.random; usar solo en cliente para evitar mismatch SSR).
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
