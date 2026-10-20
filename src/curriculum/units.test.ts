import { describe, expect, it } from "vitest";
import { levels } from "./levels.ts";
import { getUnit, units } from "./units.ts";

describe("temario", () => {
  it("tiene 4, 5, 8 y 6 metas por nivel", () => {
    const count = (id: string): number =>
      units.filter((u) => u.nivel === id).length;
    expect(levels.map((l) => count(l.id))).toEqual([4, 5, 8, 6]);
  });
  it("no repite ids", () => {
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });
  it("va ordenado por nivel y el orden empieza en 1 sin huecos", () => {
    const idx = units.map((u) => levels.findIndex((l) => l.id === u.nivel));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    levels.forEach((l) => {
      const orden = units.filter((u) => u.nivel === l.id).map((u) => u.orden);
      expect(orden).toEqual(orden.map((_, i) => i + 1));
    });
  });
  it("empieza en l0-saludar y cada meta dice 'Ya puedes …'", () => {
    expect(units[0].id).toBe("l0-saludar");
    units.forEach((u) =>
      expect(u.meta_puedes.startsWith("Ya puedes ")).toBe(true),
    );
  });
  it("getUnit regresa la primera meta si el id no existe", () => {
    expect(getUnit("a2-restaurante").titulo_es).toBe(
      "Pedir comida en un restaurante",
    );
    expect(getUnit("ya-no-existe").id).toBe("l0-saludar");
  });
});
