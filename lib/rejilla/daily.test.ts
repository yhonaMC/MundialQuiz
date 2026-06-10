import { describe, it, expect } from "vitest";
import { dateKey, rejillaDelDia } from "@/lib/rejilla/daily";
import { K } from "@/lib/rejilla/generate";

describe("rejilla diaria", () => {
  it("dateKey formatea YYYY-MM-DD local", () => {
    expect(dateKey(new Date(2026, 5, 9))).toBe("2026-06-09");
  });

  it("la misma fecha produce la misma grilla", () => {
    const a = rejillaDelDia(new Date(2026, 5, 9));
    const b = rejillaDelDia(new Date(2026, 5, 9));
    expect(a.filas.map((c) => c.id)).toEqual(b.filas.map((c) => c.id));
    expect(a.columnas.map((c) => c.id)).toEqual(b.columnas.map((c) => c.id));
    expect(a.id).toBe("2026-06-09");
  });

  it("varía entre días y siempre es resoluble (≥K por celda)", () => {
    const firmas = new Set<string>();
    for (let i = 0; i < 14; i++) {
      const g = rejillaDelDia(new Date(2026, 5, 9 + i));
      firmas.add([...g.filas, ...g.columnas].map((c) => c.id).join("|"));
      for (const fila of g.elegibles) for (const n of fila) expect(n).toBeGreaterThanOrEqual(K);
    }
    expect(firmas.size).toBeGreaterThan(1);
  });
});
