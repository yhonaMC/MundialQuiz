// Perfil local del jugador para multijugador: apodo + color de avatar.
export interface Perfil {
  nombre: string;
  color: string;
}

export const AVATAR_COLORS = [
  "#3CAC3B", // verde
  "#E61D25", // rojo
  "#E3A008", // ámbar
  "#2A398D", // azul
  "#25C4D6", // cian
  "#6F2DBD", // morado
  "#EC1E9C", // magenta
  "#D1D4D1", // gris
];

const KEY = "juegamundial:perfil";

export function loadPerfil(): Perfil {
  if (typeof window === "undefined") return { nombre: "", color: AVATAR_COLORS[0] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Perfil;
      if (p && typeof p.nombre === "string" && typeof p.color === "string") return p;
    }
  } catch {
    /* ignore */
  }
  return { nombre: "", color: AVATAR_COLORS[0] };
}

export function savePerfil(p: Perfil): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export const iniciales = (nombre: string) => (nombre.trim() || "Tú").slice(0, 2).toUpperCase();
