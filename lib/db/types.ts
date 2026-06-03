// Modelo de la BD de juego unificada (generada por scripts/build-db.mjs).

export type Confederacion = "CONMEBOL" | "UEFA" | "CONCACAF" | "CAF" | "AFC" | "OFC";

export interface Foto {
  archivo: string; // ruta en /public o URL
  autor: string;
  licencia: string;
  fuente: string;
}

export interface Player {
  id: string;
  nombre: string;
  apellido: string; // normalizado (MAYÚS, sin acentos, con Ñ)
  paisEs: string;
  confederacion: Confederacion;
  posicion: "Portero" | "Defensa" | "Mediocampista" | "Delantero" | "Jugador";
  mundiales: number[]; // años en que participó
  campeon: boolean; // fue campeón del mundo en alguno de sus Mundiales
  nacimiento: number | null; // año
  foto?: Foto; // se completa en el paso de imágenes
}

export interface Team {
  code: string;
  nombreEs: string;
  confederacion: Confederacion;
  bandera?: string; // se completa en el paso de imágenes
}

export interface Tournament {
  year: number;
  sedeEs: string;
  campeonEs: string | null; // null = aún no jugado (2026)
  equipos: number;
}
