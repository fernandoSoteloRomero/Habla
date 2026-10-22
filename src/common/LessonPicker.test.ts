import { describe, expect, it } from "vitest";
import { getUnit } from "@/curriculum/units";
import { allLearned, pickNewPhrases } from "./LessonPicker";

const unit = getUnit("a2-junta");
const en = unit.frases_clave.map((f) => f.en);

describe("lección del día", () => {
  it("sin nada aprendido da las 4 primeras, en orden", () => {
    expect(pickNewPhrases(unit, []).map((f) => f.en)).toEqual(en.slice(0, 4));
    expect(allLearned(unit, [])).toBe(false);
  });
  it("con las 4 primeras aprendidas da las 2 que faltan", () => {
    expect(pickNewPhrases(unit, en.slice(0, 4)).map((f) => f.en)).toEqual(
      en.slice(4),
    );
  });
  it("con las 6 aprendidas ya no hay nuevas", () => {
    expect(pickNewPhrases(unit, en)).toEqual([]);
    expect(allLearned(unit, en)).toBe(true);
  });
  it("no le importan mayúsculas ni espacios", () => {
    const learned = en.map((e) => `  ${e.toUpperCase()} `);
    expect(pickNewPhrases(unit, learned)).toEqual([]);
    expect(allLearned(unit, learned)).toBe(true);
  });
  it("respeta un máximo distinto", () => {
    expect(pickNewPhrases(unit, [], 3)).toHaveLength(3);
  });
});
