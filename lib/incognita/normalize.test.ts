import { describe, it, expect } from "vitest";
import { normalize } from "@/lib/incognita/normalize";

describe("normalize", () => {
  it("pasa a mayúsculas", () => {
    expect(normalize("messi")).toBe("MESSI");
  });

  it("quita acentos", () => {
    expect(normalize("Suárez")).toBe("SUAREZ");
    expect(normalize("José")).toBe("JOSE");
  });

  it("conserva la Ñ", () => {
    expect(normalize("España")).toBe("ESPAÑA");
    expect(normalize("núñez")).toBe("NUÑEZ");
  });

  it("string vacío devuelve vacío", () => {
    expect(normalize("")).toBe("");
  });
});
