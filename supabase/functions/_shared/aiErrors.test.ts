import { describe, expect, it } from "vitest";
import { classifyAnthropicError } from "./aiErrors.ts";

describe("classifyAnthropicError", () => {
  it("el tope mensual propio (400 usage limits) es presupuesto", () => {
    expect(
      classifyAnthropicError({
        status: 400,
        message:
          "400 You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.",
      }),
    ).toBe("presupuesto");
    expect(
      classifyAnthropicError({
        status: 400,
        message: "You have reached your specified workspace API usage limits.",
      }),
    ).toBe("presupuesto");
  });
  it("el tope del tier (429 enforced_spend_limit_reached) es presupuesto", () => {
    expect(
      classifyAnthropicError({
        status: 429,
        error: {
          error: {
            type: "rate_limit_error",
            details: { error_code: "enforced_spend_limit_reached" },
          },
        },
      }),
    ).toBe("presupuesto");
  });
  it("lo demás es ia", () => {
    expect(
      classifyAnthropicError({ status: 429, message: "rate limited" }),
    ).toBe("ia");
    expect(classifyAnthropicError({ status: 529 })).toBe("ia");
    expect(classifyAnthropicError({ status: 500 })).toBe("ia");
    expect(classifyAnthropicError({ message: "Request timed out." })).toBe(
      "ia",
    );
    expect(
      classifyAnthropicError({
        status: 400,
        message: "messages: field required",
      }),
    ).toBe("ia");
  });
});
