import { describe, it, expect } from "vitest";
import { construirOpciones, generarRondaQ } from "@/lib/quienes/generate";
import { conFoto } from "@/lib/db/queries";
import type { Player } from "@/lib/db/types";

const mk = (nombre: string, posicion: Player["posicion"], paisEs = "Brasil"): Player => ({
  id: nombre,
  nombre,
  apellido: nombre.toUpperCase(),
  paisEs,
  confederacion: "CONMEBOL",
  posicion,
  mundiales: [2018],
  campeon: false,
  nacimiento: 1990,
  altura: null,
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

  it("prefiere distractores del mismo país cuando hay suficientes (más difícil)", () => {
    const argentino = mk("Lionel Messi", "Delantero", "Argentina");
    const poolMixto = [
      argentino,
      mk("Ángel Di María", "Delantero", "Argentina"),
      mk("Sergio Agüero", "Delantero", "Argentina"),
      mk("Gabriel Batistuta", "Delantero", "Argentina"),
      // Distractores fáciles (otra selección): no deberían elegirse si hay del mismo país.
      mk("Cristiano Ronaldo", "Delantero", "Portugal"),
      mk("Kylian Mbappé", "Delantero", "Francia"),
      mk("Harry Kane", "Delantero", "Inglaterra"),
    ];
    for (let i = 0; i < 20; i++) {
      const { opciones } = construirOpciones(argentino, poolMixto);
      const distractores = opciones.filter((n) => n !== argentino.nombre);
      // Los 3 distractores deben ser argentinos (mismo país), no de otra selección.
      const argentinos = new Set(["Ángel Di María", "Sergio Agüero", "Gabriel Batistuta"]);
      for (const d of distractores) expect(argentinos.has(d)).toBe(true);
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
