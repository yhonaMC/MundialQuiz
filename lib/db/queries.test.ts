import { describe, it, expect } from "vitest";
import { PLAYERS, TEAMS, TOURNAMENTS } from "@/lib/db";
import { porPais, campeones, getTournament, getTeam, porMundial, sample } from "@/lib/db/queries";

describe("db", () => {
  it("tiene jugadores, selecciones y torneos", () => {
    expect(PLAYERS.length).toBeGreaterThan(500);
    expect(TEAMS.length).toBeGreaterThan(50);
    expect(TOURNAMENTS.length).toBe(23);
  });

  it("conoce al campeón 2022 y deja 2026 sin definir", () => {
    expect(getTournament(2022)?.campeonEs).toBe("Argentina");
    expect(getTournament(2026)?.campeonEs).toBeNull();
  });

  it("porPais y porMundial devuelven jugadores", () => {
    expect(porPais("Brasil").length).toBeGreaterThan(0);
    expect(porMundial(2018).length).toBeGreaterThan(0);
  });

  it("campeones() solo trae jugadores campeones", () => {
    const c = campeones();
    expect(c.length).toBeGreaterThan(0);
    expect(c.every((p) => p.campeon)).toBe(true);
  });

  it("Brasil es CONMEBOL", () => {
    const t = TEAMS.find((x) => x.nombreEs === "Brasil");
    expect(t?.confederacion).toBe("CONMEBOL");
    expect(getTeam(t!.code)?.nombreEs).toBe("Brasil");
  });

  it("sample no excede el tamaño pedido", () => {
    expect(sample(PLAYERS, 6)).toHaveLength(6);
  });
});
