// Registro de juegos: usado por el selector Solo/Multi, crear/unirse y el lobby.
export interface GameInfo {
  nombre: string;
  solo: string; // ruta del modo individual
  accent: string;
}

export const GAMES: Record<string, GameInfo> = {
  quiz: { nombre: "Quiz", solo: "/quiz", accent: "var(--color-green)" },
  incognita: { nombre: "La Incógnita Mundialera", solo: "/incognita", accent: "var(--color-amber)" },
  conexion: { nombre: "La Conexión Mundialera", solo: "/conexion", accent: "var(--color-red)" },
  "quien-es": { nombre: "¿Quién es?", solo: "/quien-es", accent: "var(--color-green)" },
  penales: { nombre: "Penales Quiz", solo: "/penales", accent: "var(--color-red)" },
};

export function getGame(key: string | undefined): GameInfo | undefined {
  return key ? GAMES[key] : undefined;
}
