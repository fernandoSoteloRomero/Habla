import { describe, expect, it } from "vitest";
import { costUsd } from "./pricing.ts";

describe("costUsd (Haiku 5.5)", () => {
  it("cobra $0.10 por millón de entrada y $0.50 por millón de salida (hasta 100k)", () => {
    // 100k de entrada todavía es precio normal: 100_000 × $0.10 / 1M = $0.01
    expect(costUsd({ input_tokens: 100_000, output_tokens: 0 })).toBeCloseTo(
      0.01,
      10,
    );
    expect(costUsd({ input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(
      0.5,
      10,
    );
  });
  it("una evaluación típica cuesta fracciones de centavo", () => {
    expect(
      costUsd({
        input_tokens: 800,
        output_tokens: 120,
        cache_read_input_tokens: 0,
      }),
    ).toBeCloseTo(0.00014, 8);
  });
  it("cobra la caché a su precio", () => {
    expect(
      costUsd({
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 50_000,
        cache_creation_input_tokens: 50_000,
      }),
    ).toBeCloseTo((50_000 * 0.01 + 50_000 * 0.125) / 1_000_000, 10);
  });
  it("arriba de 100k tokens de entrada todo cuesta 5 veces más", () => {
    expect(costUsd({ input_tokens: 150_000, output_tokens: 0 })).toBeCloseTo(
      0.075,
      10,
    );
  });
});
