// Avatares "futboleros" deterministas: a partir del nombre se deriva una camiseta
// (colores + patrón + dorsal). Mismo nombre → siempre la misma camiseta, sin red ni
// archivos. Se usa en la sala, el marcador en vivo y los resultados.

// Hash estable (FNV-1a de 32 bits) sobre el nombre normalizado.
function hashName(nombre: string): number {
  const s = (nombre || "Jugador").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Pares de color (cuerpo, detalle) inspirados en kits clásicos de selecciones.
const KITS: ReadonlyArray<readonly [string, string]> = [
  ["#75AADB", "#ffffff"], // Argentina
  ["#F7C600", "#1E8A4C"], // Brasil
  ["#1E3A8A", "#E11D2A"], // Francia
  ["#E11D2A", "#F7C600"], // España
  ["#111827", "#ffffff"], // Alemania (visitante)
  ["#1565C0", "#ffffff"], // Italia (azzurri)
  ["#2E7D32", "#ffffff"], // México
  ["#E11D2A", "#1E3A8A"], // Inglaterra detalle
  ["#7E22CE", "#F7C600"], // fantasía
  ["#0E7490", "#ffffff"], // Uruguay celeste
  ["#EA580C", "#111827"], // Países Bajos
  ["#B91C1C", "#000000"], // Croacia (cuadros)
  ["#15803D", "#F7C600"], // fantasía verde
  ["#DB2777", "#ffffff"], // fantasía rosa
];

export type JerseyPattern = "solid" | "stripes" | "sash" | "halves" | "hoops";
const PATTERNS: JerseyPattern[] = ["solid", "stripes", "sash", "halves", "hoops"];

export interface Jersey {
  primary: string;
  secondary: string;
  pattern: JerseyPattern;
  number: number; // dorsal 1..30
}

export function jerseyFor(nombre: string): Jersey {
  const h = hashName(nombre);
  const [primary, secondary] = KITS[h % KITS.length];
  const pattern = PATTERNS[(h >>> 4) % PATTERNS.length];
  const number = ((h >>> 9) % 30) + 1;
  return { primary, secondary, pattern, number };
}
