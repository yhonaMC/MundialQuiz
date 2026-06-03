import { describe, it, expect } from "vitest";
import { getDailyAnswer, dailyIndex, dateKey } from "@/lib/incognita/daily";
import { ANSWERS } from "@/lib/incognita/data/answers";

describe("daily", () => {
  it("devuelve la misma respuesta para la misma fecha", () => {
    const a = getDailyAnswer(new Date(2026, 5, 3));
    const b = getDailyAnswer(new Date(2026, 5, 3));
    expect(a.word).toBe(b.word);
  });

  it("varía entre días consecutivos", () => {
    const dias = Array.from({ length: 10 }, (_, i) => getDailyAnswer(new Date(2026, 5, 3 + i)).word);
    const unicos = new Set(dias);
    // No exigimos 10 distintos, pero no deben ser todos iguales.
    expect(unicos.size).toBeGreaterThan(1);
  });

  it("siempre cae dentro del banco", () => {
    for (let i = 0; i < 50; i++) {
      const idx = dailyIndex(new Date(2026, 0, 1 + i));
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(ANSWERS.length);
    }
  });

  it("dateKey formatea YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 5, 3))).toBe("2026-06-03");
  });
});
