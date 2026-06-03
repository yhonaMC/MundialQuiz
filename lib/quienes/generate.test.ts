import { describe, it, expect } from "vitest";
import { construirOpciones, generarRondaQ } from "@/lib/quienes/generate";
import { conFoto } from "@/lib/db/queries";
import type { Player } from "@/lib/db/types";

const mk = (nombre: string, posicion: Player["posicion"]): Player => ({
  id: nombre,
  nombre,
  apellido: nombre.toUpperCase(),
  paisEs: "Brasil",
  confederacion: "CONMEBOL",
  posicion,
  mundiales: [2018],
  campeon: false,
  nacimiento: 1990,
});

describe("construirOpciones", () => {
  const player = mk("Lionel Messi", "Delantero");
  const pool = [
    player,
    mk("Pelé", "Delantero"),
    mk("Cafú", "Defensa"),
    mk("Dida", "Portero"),
    mk("Kaká", "Mediocampista"),
    mk("Romário", "Delantero"),
  ];

  it("devuelve 4 opciones únicas con el correcto incluido", () => {
    const { opciones, correcta } = construirOpciones(player, pool);
    expect(opciones).toHaveLength(4);
    expect(new Set(opciones).size).toBe(4);
    expect(opciones[correcta]).toBe("Lionel Messi");
  });

  it("el índice correcto siempre apunta al jugador", () => {
    for (let i = 0; i < 20; i++) {
      const { opciones, correcta } = construirOpciones(player, pool);
      expect(opciones[correcta]).toBe(player.nombre);
    }
  });
});

describe("generarRondaQ", () => {
  it("las opciones solo usan jugadores con foto disponible", () => {
    const nombresConFoto = new Set(conFoto().map((p) => p.nombre));
    for (let i = 0; i < 20; i++) {
      const r = generarRondaQ();
      expect(r).not.toBeNull();
      for (const op of r!.opciones) expect(nombresConFoto.has(op)).toBe(true);
    }
  });
});
