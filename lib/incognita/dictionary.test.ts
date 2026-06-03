import { describe, it, expect } from "vitest";
import { isValidGuess } from "@/lib/incognita/dictionary";
import { ANSWERS } from "@/lib/incognita/data/answers";

describe("isValidGuess", () => {
  it("acepta apellidos reales de mundialistas", () => {
    expect(isValidGuess("MESSI")).toBe(true);
    expect(isValidGuess("RONALDO")).toBe(true);
  });

  it("acepta ignorando acentos y mayúsculas", () => {
    expect(isValidGuess("suárez")).toBe(true);
  });

  it("acepta todas las respuestas curadas (incluidas selecciones)", () => {
    for (const a of ANSWERS) {
      expect(isValidGuess(a.word), `${a.word} debería ser válida`).toBe(true);
    }
  });

  it("rechaza palabras inventadas", () => {
    expect(isValidGuess("ZZZZZ")).toBe(false);
    expect(isValidGuess("XQWPL")).toBe(false);
  });
});
