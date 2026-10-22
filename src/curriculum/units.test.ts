import { describe, expect, it } from "vitest";
import { firstUnitOf } from "@shared/placementLogic.ts";
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
  it("el mapa de primeras estaciones de la función coincide con el temario", () => {
    levels.forEach((l) => {
      const first = units.find((u) => u.nivel === l.id);
      expect(firstUnitOf(l.id)).toBe(first?.id);
    });
  });
});

describe("frases clave", () => {
  const all = units.flatMap((u) => u.frases_clave);

  it("cada meta tiene exactamente 6", () => {
    units.forEach((u) => expect(u.frases_clave, u.id).toHaveLength(6));
  });
  it("inglés y español de 2 a 120 caracteres; notas de máximo 120", () => {
    all.forEach((f) => {
      expect(f.en.length, f.en).toBeGreaterThanOrEqual(2);
      expect(f.en.length, f.en).toBeLessThanOrEqual(120);
      expect(f.es.length, f.es).toBeGreaterThanOrEqual(2);
      expect(f.es.length, f.es).toBeLessThanOrEqual(120);
      if (f.nota) expect(f.nota.length, f.nota).toBeLessThanOrEqual(120);
    });
  });
  it("ninguna frase en inglés se repite en todo el temario", () => {
    const keys = all.map((f) => f.en.trim().toLowerCase());
    const repeated = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(repeated).toEqual([]);
  });
  it("sin '·', sin '¡' y sin emojis", () => {
    all.forEach((f) => {
      const text = `${f.en} ${f.es} ${f.nota ?? ""}`;
      expect(text, text).not.toMatch(/[·¡]/);
      expect(text, text).not.toMatch(/\p{Extended_Pictographic}/u);
    });
  });
  it("al menos 2 frases de cada meta traen nota", () => {
    units.forEach((u) =>
      expect(
        u.frases_clave.filter((f) => f.nota).length,
        u.id,
      ).toBeGreaterThanOrEqual(2),
    );
  });
});
