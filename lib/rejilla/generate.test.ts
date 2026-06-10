import { describe, it, expect } from "vitest";
import { createRng, hashSeed } from "@/lib/engine/rng";
import { generarRejilla, K, K_POR_DIFICULTAD, type Rejilla } from "@/lib/rejilla/generate";

const gen = (seed: number, id?: string) => generarRejilla(createRng(seed), id);

function celdas(g: Rejilla) {
  const out: { f: number; c: number; n: number }[] = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) out.push({ f, c, n: g.elegibles[f][c] });
  return out;
}

describe("generarRejilla", () => {
  it("produce 3 filas y 3 columnas distintas", () => {
    for (let s = 0; s < 40; s++) {
      const g = gen(s);
      expect(g.filas).toHaveLength(3);
      expect(g.columnas).toHaveLength(3);
      const ids = new Set([...g.filas, ...g.columnas].map((c) => c.id));
      expect(ids.size).toBe(6); // los 6 criterios son distintos
    }
  });

  it("toda celda tiene al menos K jugadores elegibles", () => {
    for (let s = 0; s < 60; s++) {
      const g = gen(s);
      for (const { n } of celdas(g)) expect(n).toBeGreaterThanOrEqual(K);
    }
  });

  it("ninguna celda cruza dos criterios de la misma familia", () => {
    for (let s = 0; s < 40; s++) {
      const g = gen(s);
      for (let f = 0; f < 3; f++)
        for (let c = 0; c < 3; c++) expect(g.filas[f].familia).not.toBe(g.columnas[c].familia);
    }
  });

  it("es determinista para la misma semilla", () => {
    const a = gen(hashSeed("rejilla:2026-06-09"));
    const b = gen(hashSeed("rejilla:2026-06-09"));
    expect(a.filas.map((c) => c.id)).toEqual(b.filas.map((c) => c.id));
    expect(a.columnas.map((c) => c.id)).toEqual(b.columnas.map((c) => c.id));
  });

  it("conserva el id provisto", () => {
    expect(gen(5, "2026-06-09").id).toBe("2026-06-09");
  });

  it("cualquier dificultad respeta el mínimo absoluto K en toda celda", () => {
    for (const kMin of Object.values(K_POR_DIFICULTAD)) {
      for (let s = 0; s < 30; s++) {
        const g = generarRejilla(createRng(s + 1), "x", kMin);
        for (const fila of g.elegibles) for (const n of fila) expect(n).toBeGreaterThanOrEqual(K);
      }
    }
  });

  it("celdas más pobladas a menor dificultad (Fácil > Normal > Difícil en promedio)", () => {
    const prom = (kMin: number) => {
      let suma = 0, n = 0;
      for (let s = 0; s < 40; s++) {
        const g = generarRejilla(createRng(s + 1), "x", kMin);
        for (const fila of g.elegibles) for (const v of fila) { suma += v; n++; }
      }
      return suma / n;
    };
    const facil = prom(K_POR_DIFICULTAD.facil);
    const normal = prom(K_POR_DIFICULTAD.normal);
    const dificil = prom(K_POR_DIFICULTAD.dificil);
    expect(facil).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(dificil);
  });
});
