import { describe, expect, it } from "vitest";
import { isOverDailyLimit, PLACEMENT_DAILY_MAX } from "./limits.ts";

describe("límite diario", () => {
  it("la evaluación permite 5 llamadas en 24 horas", () => {
    expect(PLACEMENT_DAILY_MAX).toBe(5);
    expect(isOverDailyLimit(4, PLACEMENT_DAILY_MAX)).toBe(false);
    expect(isOverDailyLimit(5, PLACEMENT_DAILY_MAX)).toBe(true);
  });
});
