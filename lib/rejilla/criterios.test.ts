import { describe, it, expect } from "vitest";
import { CRITERIOS, CRITERIOS_POR_FAMILIA } from "@/lib/rejilla/criterios";
import { PLAYERS } from "@/lib/db";
import type { Player } from "@/lib/db/types";

const find = (id: string) => CRITERIOS.find((c) => c.id === id)!;
const conteo = (test: (p: Player) => boolean) => PLAYERS.filter(test).length;

describe("criterios", () => {
  it("hay criterios en las cuatro familias", () => {
    expect(CRITERIOS_POR_FAMILIA.geografia.length).toBeGreaterThan(0);
    expect(CRITERIOS_POR_FAMILIA.temporal.length).toBeGreaterThan(0);
    expect(CRITERIOS_POR_FAMILIA.rol.length).toBe(4);
    expect(CRITERIOS_POR_FAMILIA.logro.length).toBe(3);
  });

  it("cada test clasifica casos conocidos", () => {
    const messi = PLAYERS.find((p) => p.nombre === "Lionel Messi")!;
    expect(find("pais:Argentina").test(messi)).toBe(true);
    expect(find("conf:CONMEBOL").test(messi)).toBe(true);
    expect(find("campeon").test(messi)).toBe(true);
    expect(find("veterano").test(messi)).toBe(true);
    expect(find("pos:Delantero").test(messi)).toBe(true);
    expect(find("pos:Portero").test(messi)).toBe(false);
  });

  it("solo incluye valores con población suficiente", () => {
    for (const c of CRITERIOS) {
      expect(conteo(c.test)).toBeGreaterThanOrEqual(3);
    }
  });

  it("los ids son únicos y estables", () => {
    const ids = CRITERIOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
