import { describe, expect, it } from "vitest";
import { normalizeWords, soundsSame } from "./SameWords";

describe("comparar lo que se oyó", () => {
  it("normaliza mayúsculas, puntuación y contracciones", () => {
    expect(normalizeWords("I'm fine, thank you!")).toEqual([
      "i",
      "am",
      "fine",
      "thank",
      "you",
    ]);
    expect(normalizeWords("Let’s go. I can't.")).toEqual([
      "let",
      "us",
      "go",
      "i",
      "can",
      "not",
    ]);
  });
  it("se entiende igual aunque cambien las contracciones o falte una palabra corta", () => {
    expect(soundsSame("I'm fine, thank you.", "i am fine thank you")).toBe(
      true,
    );
    expect(
      soundsSame("Can I see the menu, please?", "can I see the menu"),
    ).toBe(true);
  });
  it("no se entiende igual si falta casi toda la frase", () => {
    expect(soundsSame("Can I see the menu, please?", "the menu")).toBe(false);
    expect(soundsSame("Hello.", "")).toBe(false);
  });
});
