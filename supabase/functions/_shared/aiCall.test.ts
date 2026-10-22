import { describe, expect, it, vi } from "vitest";
import type { AiCallDeps, AiMessage, MessageParams } from "./aiCall.ts";
import { callAi, MODEL } from "./aiCall.ts";

const params: MessageParams = {
  model: MODEL,
  max_tokens: 100,
  thinking: { type: "disabled" },
  output_config: {
    effort: "low",
    format: { type: "json_schema", schema: { type: "object" } },
  },
  system: "x",
  messages: [{ role: "user", content: "hola" }],
};

const ok = (text: string): AiMessage => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text }],
  usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 50 },
});
const parse = (text: string): string | null =>
  text.startsWith("{") ? text : null;

// Los mocks se crean sin tipo; aquí se les da la forma de AiCallDeps
function deps(
  createMessage: ReturnType<typeof vi.fn>,
  now: ReturnType<typeof vi.fn> = vi.fn(() => 0),
): AiCallDeps & { createMessage: ReturnType<typeof vi.fn> } {
  return {
    createMessage: createMessage as AiCallDeps["createMessage"] &
      ReturnType<typeof vi.fn>,
    now: now as () => number,
  };
}

describe("callAi", () => {
  it("responde bien a la primera", async () => {
    const d = deps(vi.fn().mockResolvedValue(ok("{}")));
    expect(await callAi(d, params, parse)).toEqual({
      ok: true,
      output: "{}",
      usage: {
        input_tokens: 100,
        output_tokens: 10,
        cache_read_input_tokens: 50,
        cache_creation_input_tokens: 0,
      },
    });
  });
  it("reintenta una falla pasajera y suma el uso de los intentos", async () => {
    const d = deps(
      vi
        .fn()
        .mockResolvedValueOnce(ok("no"))
        .mockRejectedValueOnce({ status: 529 })
        .mockResolvedValueOnce(ok("{}")),
    );
    const result = await callAi(d, params, parse);
    expect(result).toMatchObject({ ok: true, usage: { input_tokens: 200 } });
    expect(d.createMessage).toHaveBeenCalledTimes(3);
  });
  it("con el presupuesto agotado no reintenta y avisa si no se gastó nada", async () => {
    const d = deps(
      vi.fn().mockRejectedValue({
        status: 400,
        message: "You have reached your specified API usage limits.",
      }),
    );
    expect(await callAi(d, params, parse)).toMatchObject({
      ok: false,
      error: "presupuesto",
      spent: false,
    });
    expect(d.createMessage).toHaveBeenCalledTimes(1);
  });
  it("si la IA se niega no insiste", async () => {
    const d = deps(
      vi.fn().mockResolvedValue({ ...ok("{}"), stop_reason: "refusal" }),
    );
    expect(await callAi(d, params, parse)).toMatchObject({
      ok: false,
      error: "ia",
      spent: true,
    });
    expect(d.createMessage).toHaveBeenCalledTimes(1);
  });
  it("con 3 respuestas que no se pueden leer se rinde", async () => {
    const d = deps(vi.fn().mockResolvedValue(ok("no es json")));
    expect(await callAi(d, params, parse)).toMatchObject({
      ok: false,
      error: "ia",
    });
    expect(d.createMessage).toHaveBeenCalledTimes(3);
  });
  it("no lee una respuesta cortada por max_tokens", async () => {
    const d = deps(
      vi.fn().mockResolvedValue({ ...ok("{}"), stop_reason: "max_tokens" }),
    );
    expect((await callAi(d, params, parse)).ok).toBe(false);
  });
  it("no empieza otro intento después de 60 segundos", async () => {
    const d = deps(
      vi.fn().mockRejectedValue({ status: 529 }),
      vi.fn().mockReturnValueOnce(0).mockReturnValue(61_000),
    );
    expect((await callAi(d, params, parse)).ok).toBe(false);
    expect(d.createMessage).toHaveBeenCalledTimes(1);
  });
});
