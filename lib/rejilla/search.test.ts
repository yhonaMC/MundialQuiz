import { describe, it, expect } from "vitest";
import { buscar, getPlayer, validosCelda, pistaCelda } from "@/lib/rejilla/search";
import { PLAYERS } from "@/lib/db";
import { createRng } from "@/lib/engine/rng";
import { generarRejilla } from "@/lib/rejilla/generate";
import { filaDe, colDe } from "@/lib/rejilla/game";

describe("buscar", () => {
  it("encuentra por apellido", () => {
    const r = buscar("messi");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((p) => p.nombre === "Lionel Messi")).toBe(true);
  });

  it("ignora acentos (normaliza la consulta)", () => {
    const conAcento = buscar("modrić");
    const sinAcento = buscar("modric");
    expect(sinAcento.map((p) => p.id)).toEqual(conAcento.map((p) => p.id));
    expect(sinAcento.some((p) => p.apellido === "MODRIC")).toBe(true);
  });

  it("excluye los ids ya usados", () => {
    const messi = PLAYERS.find((p) => p.nombre === "Lionel Messi")!;
    const r = buscar("messi", { excluir: new Set([messi.id]) });
    expect(r.some((p) => p.id === messi.id)).toBe(false);
  });

  it("respeta el límite", () => {
    expect(buscar("a", { limite: 5 }).length).toBeLessThanOrEqual(5);
  });

  it("no busca con menos de 2 caracteres", () => {
    expect(buscar("a")).toEqual([]);
    expect(buscar("")).toEqual([]);
  });

  it("getPlayer resuelve por id", () => {
    const messi = PLAYERS.find((p) => p.nombre === "Lionel Messi")!;
    expect(getPlayer(messi.id)?.id).toBe(messi.id);
    expect(getPlayer("no-existe")).toBeUndefined();
  });
});

describe("validosCelda / pistaCelda", () => {
  it("todo jugador devuelto cumple ambos criterios de la celda", () => {
    for (let s = 0; s < 20; s++) {
      const g = generarRejilla(createRng(s), "x");
      for (let idx = 0; idx < 9; idx++) {
        const f = filaDe(idx), c = colDe(idx);
        const sols = validosCelda(g, idx, 3);
        expect(sols.length).toBeGreaterThan(0); // celda resoluble (≥K)
        for (const p of sols) {
          expect(g.filas[f].test(p)).toBe(true);
          expect(g.columnas[c].test(p)).toBe(true);
        }
      }
    }
  });

  it("excluye jugadores ya usados", () => {
    const g = generarRejilla(createRng(1), "x");
    const todos = validosCelda(g, 0, 5);
    const sinPrimero = validosCelda(g, 0, 5, new Set([todos[0].id]));
    expect(sinPrimero.some((p) => p.id === todos[0].id)).toBe(false);
  });

  it("la pista revela una inicial de apellido válida", () => {
    const g = generarRejilla(createRng(2), "x");
    const pista = pistaCelda(g, 0);
    const sol = validosCelda(g, 0, 1)[0];
    expect(pista).toContain(sol.apellido[0]);
  });
});
