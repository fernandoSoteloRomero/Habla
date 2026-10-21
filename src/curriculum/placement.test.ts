import { describe, expect, it } from "vitest";
import { placementQuestions } from "./placement.ts";

describe("banco de la evaluación", () => {
  it("tiene 12 preguntas, 3 por nivel, de Nivel 0 a B1", () => {
    expect(placementQuestions).toHaveLength(12);
    expect(placementQuestions.map((q) => q.level)).toEqual([
      "L0",
      "L0",
      "L0",
      "A1",
      "A1",
      "A1",
      "A2",
      "A2",
      "A2",
      "B1",
      "B1",
      "B1",
    ]);
  });
  it("cada nivel va escuchar, completar y responder", () => {
    placementQuestions.forEach((q, i) => {
      expect(q.kind).toBe(["escuchar", "completar", "responder"][i % 3]);
    });
  });
  it("las de opción múltiple tienen 4 opciones y una correcta válida", () => {
    placementQuestions
      .filter((q) => q.kind !== "responder")
      .forEach((q) => {
        expect(q.options).toHaveLength(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThanOrEqual(3);
      });
  });
  it("las abiertas no tienen opciones", () => {
    placementQuestions
      .filter((q) => q.kind === "responder")
      .forEach((q) => expect(q.options).toBeUndefined());
  });
  it("la respuesta correcta de cada pregunta es la esperada", () => {
    const correct = (id: string): string | undefined => {
      const q = placementQuestions.find((x) => x.id === id);
      return q?.options?.[q.correct ?? -1];
    };
    expect(correct("l0-escuchar")).toBe("Buenos días.");
    expect(correct("a1-completar")).toBe("drink");
    expect(correct("a2-escuchar")).toBe(
      "¿Me podría decir cómo llegar a la estación?",
    );
    expect(correct("b1-completar")).toBe("since");
  });
});
