import { describe, it, expect } from "vitest";
import type { Player } from "@/lib/db/types";
import type { Criterio } from "@/lib/rejilla/criterios";
import type { Rejilla } from "@/lib/rejilla/generate";
import {
  cumple,
  nuevoTablero,
  jugadoresUsados,
  terminado,
  perfecta,
  aciertos,
  puntosTotales,
  type Tablero,
} from "@/lib/rejilla/game";

const jugador = (over: Partial<Player>): Player => ({
  id: "x",
  nombre: "Test",
  apellido: "TEST",
  paisEs: "Argentina",
  confederacion: "CONMEBOL",
  posicion: "Delantero",
  mundiales: [2026],
  campeon: false,
  nacimiento: 2000,
  altura: null,
  ...over,
});

const crit = (id: string, test: (p: Player) => boolean): Criterio => ({
  id,
  familia: "geografia",
  label: id,
  short: id,
  test,
});

// Grilla de prueba: filas = país (ARG/BRA/ESP), columnas = posición (DEL/DEF/POR).
const grilla: Rejilla = {
  filas: [
    crit("pais:Argentina", (p) => p.paisEs === "Argentina"),
    crit("pais:Brasil", (p) => p.paisEs === "Brasil"),
    crit("pais:España", (p) => p.paisEs === "España"),
  ],
  columnas: [
    crit("pos:Delantero", (p) => p.posicion === "Delantero"),
    crit("pos:Defensa", (p) => p.posicion === "Defensa"),
    crit("pos:Portero", (p) => p.posicion === "Portero"),
  ],
  elegibles: [
    [4, 30, 8],
    [60, 12, 100],
    [3, 25, 40],
  ],
  id: "test",
};

describe("cumple", () => {
  it("valida ambos criterios de la celda (fila×col)", () => {
    // celda 0 = fila 0 (Argentina) × col 0 (Delantero)
    expect(cumple(grilla, 0, jugador({ paisEs: "Argentina", posicion: "Delantero" }))).toBe(true);
    expect(cumple(grilla, 0, jugador({ paisEs: "Argentina", posicion: "Defensa" }))).toBe(false);
    expect(cumple(grilla, 0, jugador({ paisEs: "Brasil", posicion: "Delantero" }))).toBe(false);
    // celda 8 = fila 2 (España) × col 2 (Portero)
    expect(cumple(grilla, 8, jugador({ paisEs: "España", posicion: "Portero" }))).toBe(true);
  });
});

describe("estado del tablero", () => {
  it("nuevo tablero está vacío y no terminado", () => {
    const t = nuevoTablero();
    expect(t).toHaveLength(9);
    expect(terminado(t)).toBe(false);
    expect(aciertos(t)).toBe(0);
  });

  it("rastrea jugadores usados (aciertos y fallos)", () => {
    const t = nuevoTablero();
    t[0] = { player: jugador({ id: "a" }), ok: true };
    t[1] = { player: jugador({ id: "b" }), ok: false };
    expect(jugadoresUsados(t)).toEqual(new Set(["a", "b"]));
  });

  it("terminado cuando las 9 celdas están resueltas", () => {
    const t: Tablero = Array.from({ length: 9 }, (_, i) => ({ player: jugador({ id: String(i) }), ok: i % 2 === 0 }));
    expect(terminado(t)).toBe(true);
    expect(perfecta(t)).toBe(false);
  });
});

describe("puntosTotales", () => {
  it("suma solo las celdas acertadas según su escasez", () => {
    const t = nuevoTablero();
    // celda 0 → elegibles 4 → tramo 80; campeón (no extra)
    t[0] = { player: jugador({ campeon: true }), ok: true };
    // celda 4 → elegibles 12 → tramo 60; fallo no puntúa
    t[4] = { player: jugador({ id: "z" }), ok: false };
    expect(puntosTotales(grilla, t)).toBe(80);
  });

  it("9/9 añade el bonus de Rejilla Perfecta", () => {
    const t: Tablero = Array.from({ length: 9 }, () => ({ player: jugador({ campeon: true }), ok: true }));
    const sinBonus = grilla.elegibles.flat().reduce((s, n) => s + (n <= 3 ? 95 : n <= 6 ? 80 : n <= 12 ? 60 : n <= 25 ? 40 : n <= 50 ? 25 : 15), 0);
    expect(puntosTotales(grilla, t)).toBe(sinBonus + 100);
  });
});
