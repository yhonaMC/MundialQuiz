import { describe, it, expect } from "vitest";
import { generarRonda } from "@/lib/conexion/generate";

describe("generarRonda", () => {
  it("devuelve 6 jugadores únicos con 3 correctos", () => {
    for (let i = 0; i < 30; i++) {
      const r = generarRonda();
      expect(r.players).toHaveLength(6);
      const ids = new Set(r.players.map((p) => p.id));
      expect(ids.size).toBe(6); // sin repetidos
      expect(r.matchIds).toHaveLength(3);
      // todos los correctos están entre las cartas mostradas
      for (const id of r.matchIds) expect(ids.has(id)).toBe(true);
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.tipo.length).toBeGreaterThan(0);
    }
  });

  it("solo usa jugadores con foto disponible", () => {
    for (let i = 0; i < 30; i++) {
      const r = generarRonda();
      for (const p of r.players) expect(p.foto?.archivo).toBeTruthy();
    }
  });
});
