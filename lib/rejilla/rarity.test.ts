import { describe, it, expect } from "vitest";
import { puntosCelda, puntosRespuesta, esPocoObvio } from "@/lib/rejilla/rarity";
import type { Player } from "@/lib/db/types";

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

describe("puntosCelda", () => {
  it("respeta los tramos en los bordes", () => {
    expect(puntosCelda(3)).toBe(95);
    expect(puntosCelda(4)).toBe(80);
    expect(puntosCelda(6)).toBe(80);
    expect(puntosCelda(7)).toBe(60);
    expect(puntosCelda(12)).toBe(60);
    expect(puntosCelda(13)).toBe(40);
    expect(puntosCelda(25)).toBe(40);
    expect(puntosCelda(26)).toBe(25);
    expect(puntosCelda(50)).toBe(25);
    expect(puntosCelda(51)).toBe(15);
  });

  it("es monótona no creciente", () => {
    let prev = Infinity;
    for (let n = 1; n <= 80; n++) {
      const p = puntosCelda(n);
      expect(p).toBeLessThanOrEqual(prev);
      prev = p;
    }
  });
});

describe("esPocoObvio / puntosRespuesta", () => {
  it("un crack (campeón) no es poco obvio", () => {
    expect(esPocoObvio(jugador({ campeon: true, mundiales: [2018, 2022] }))).toBe(false);
  });

  it("un jugador de 1 Mundial no campeón sí lo es", () => {
    expect(esPocoObvio(jugador({ campeon: false, mundiales: [2026] }))).toBe(true);
  });

  it("la elección poco obvia suma un extra", () => {
    const obvio = puntosRespuesta(3, jugador({ campeon: true }));
    const raro = puntosRespuesta(3, jugador({ campeon: false, mundiales: [2026] }));
    expect(raro).toBeGreaterThan(obvio);
  });
});
