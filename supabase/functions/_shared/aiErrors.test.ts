import { describe, expect, it } from "vitest";
import { classifyAnthropicError, isRetryable } from "./aiErrors.ts";

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
  it("reconoce el mensaje real del SDK (estado + JSON del error)", () => {
    expect(
      classifyAnthropicError({
        status: 400,
        message:
          '400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."}}',
      }),
    ).toBe("presupuesto");
  });
  it("el 429 del tier también se reconoce sin anidar", () => {
    expect(
      classifyAnthropicError({
        status: 429,
        error: { details: { error_code: "enforced_spend_limit_reached" } },
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

describe("isRetryable", () => {
  it("reintenta fallas de red, timeouts, 408, 409, 429 y 5xx", () => {
    expect(isRetryable({ message: "Connection error." })).toBe(true);
    expect(isRetryable({ status: 408 })).toBe(true);
    expect(isRetryable({ status: 409 })).toBe(true);
    expect(isRetryable({ status: 429, message: "rate limited" })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 529 })).toBe(true);
  });
  it("no reintenta 400 ni el presupuesto agotado", () => {
    expect(isRetryable({ status: 400, message: "bad request" })).toBe(false);
    expect(isRetryable({ status: 401 })).toBe(false);
    expect(
      isRetryable({
        status: 429,
        error: {
          error: { details: { error_code: "enforced_spend_limit_reached" } },
        },
      }),
    ).toBe(false);
  });
});
