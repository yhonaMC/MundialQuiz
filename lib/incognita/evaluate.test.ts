import { describe, it, expect } from "vitest";
import { evaluate } from "@/lib/incognita/evaluate";

describe("evaluate", () => {
  it("marca todo correcto cuando el intento es igual a la respuesta", () => {
    expect(evaluate("MESSI", "MESSI")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marca ausente lo que no está", () => {
    expect(evaluate("PERU", "GOLF")).toEqual(["absent", "absent", "absent", "absent"]);
  });

  it("marca presente una letra en posición incorrecta (con una sola E)", () => {
    // respuesta CHILE (una sola E). intento LECHE:
    // idx4 E acierta exacto y consume la única E -> idx1 E queda 'absent'.
    expect(evaluate("LECHE", "CHILE")).toEqual([
      "present", // L presente
      "absent", // E ya consumida por el acierto exacto
      "present", // C presente
      "present", // H presente
      "correct", // E exacta
    ]);
  });

  it("no sobre-cuenta letras repetidas (una sola E disponible)", () => {
    // respuesta PELE (P,E,L,E) tiene 2 E. intento EEEE -> dos primeras E ... posiciones:
    // answer P E L E ; guess E E E E
    // pasada1: idx1 (E==E) correct, idx3 (E==E) correct -> quedan 0 E
    // pasada2: idx0 y idx2 no hay E restantes -> absent
    expect(evaluate("EEEE", "PELE")).toEqual(["absent", "correct", "absent", "correct"]);
  });

  it("prioriza el acierto exacto sobre el presente con duplicados", () => {
    // answer KROOS (K,R,O,O,S) 2 O ; intento OOXXX
    // pasada1: ninguna O en posición correcta (answer[0]=K, answer[1]=R)
    // pasada2: idx0 O presente (queda 1), idx1 O presente (queda 0)
    expect(evaluate("OOXXX", "KROOS")).toEqual([
      "present",
      "present",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("ignora acentos y mayúsculas/minúsculas", () => {
    expect(evaluate("josé", "JOSE")).toEqual(["correct", "correct", "correct", "correct"]);
  });

  it("trata la Ñ como letra propia", () => {
    // answer ESPAÑA, intento ESPANA: la Ñ del intento (N) no coincide con Ñ
    const r = evaluate("ESPANA", "ESPAÑA");
    expect(r[4]).toBe("absent"); // N != Ñ
    expect(r[0]).toBe("correct");
  });
});
