import { describe, expect, it, vi } from "vitest";
import type { AiMessage, PlacementDeps } from "./placementHandler.ts";
import { FALLBACK_RESUMEN, handlePlacement } from "./placementHandler.ts";
import type { PlacementAnswer } from "./placementTypes.ts";

// Llegó hasta A1 (acertó todo en Nivel 0 y una de dos en A1)
const answers: PlacementAnswer[] = [
  {
    level: "L0",
    kind: "escuchar",
    prompt: "Good morning.",
    answer: "Buenos días.",
    correct: true,
  },
  {
    level: "L0",
    kind: "completar",
    prompt: "My ___ is Ana.",
    answer: "name",
    correct: true,
  },
  {
    level: "L0",
    kind: "responder",
    prompt: "What is your name?",
    answer: "My name is Ana",
    correct: null,
  },
  {
    level: "A1",
    kind: "escuchar",
    prompt: "Where do you live?",
    answer: "¿Dónde vives?",
    correct: true,
  },
  {
    level: "A1",
    kind: "completar",
    prompt: "I ___ coffee every morning.",
    answer: "drinks",
    correct: false,
  },
  {
    level: "A1",
    kind: "responder",
    prompt: "What do you do on weekends?",
    answer: null,
    correct: null,
  },
];

const okMessage = (level: string): AiMessage => ({
  stop_reason: "end_turn",
  content: [
    {
      type: "text",
      text: JSON.stringify({
        level,
        resumen:
          "Ya entiendes saludos. Primero vas a practicar cómo hablar de ti.",
      }),
    },
  ],
  usage: { input_tokens: 1000, output_tokens: 80 },
});
const badMessage = (): AiMessage => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: "no es json" }],
  usage: { input_tokens: 1000, output_tokens: 10 },
});

function fakeDeps(over: Partial<PlacementDeps> = {}): PlacementDeps {
  return {
    isPlaced: vi.fn().mockResolvedValue(false),
    reserveCall: vi.fn().mockResolvedValue(7),
    finishCall: vi.fn().mockResolvedValue(undefined),
    releaseCall: vi.fn().mockResolvedValue(undefined),
    createMessage: vi.fn().mockResolvedValue(okMessage("A1")),
    savePlacement: vi.fn().mockResolvedValue("ok"),
    now: vi.fn().mockReturnValue(0),
    ...over,
  };
}

describe("handlePlacement", () => {
  it("con datos inválidos responde 400 sin reservar ni llamar a la IA", async () => {
    const deps = fakeDeps();
    expect(await handlePlacement({ answers: [] }, deps)).toEqual({
      status: 400,
      body: { error: "datos" },
    });
    expect(deps.reserveCall).not.toHaveBeenCalled();
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("si ya hizo la evaluación responde 409 sin gastar", async () => {
    const deps = fakeDeps({ isPlaced: vi.fn().mockResolvedValue(true) });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 409,
      body: { error: "ya-evaluado" },
    });
    expect(deps.reserveCall).not.toHaveBeenCalled();
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("si ya llegó al límite responde 429 sin llamar a la IA", async () => {
    const deps = fakeDeps({ reserveCall: vi.fn().mockResolvedValue(null) });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 429,
      body: { error: "limite" },
    });
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("si falla la base al reservar responde 500 sin llamar a la IA", async () => {
    const deps = fakeDeps({
      reserveCall: vi.fn().mockRejectedValue(new Error("db")),
    });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 500,
      body: { error: "servidor" },
    });
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("si sale bien guarda, registra el gasto y regresa el resultado", async () => {
    const deps = fakeDeps();
    const res = await handlePlacement({ answers }, deps);
    expect(res).toEqual({
      status: 200,
      body: {
        level: "A1",
        unitId: "a1-quien-eres",
        resumen:
          "Ya entiendes saludos. Primero vas a practicar cómo hablar de ti.",
      },
    });
    expect(deps.createMessage).toHaveBeenCalledTimes(1);
    expect(deps.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-5-5",
        max_tokens: 400,
        thinking: { type: "disabled" },
        output_config: expect.objectContaining({ effort: "low" }),
      }),
    );
    expect(deps.finishCall).toHaveBeenCalledWith(7, {
      input_tokens: 1000,
      output_tokens: 80,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    });
    expect(deps.savePlacement).toHaveBeenCalledWith(
      "A1",
      "a1-quien-eres",
      expect.objectContaining({ answers }),
    );
  });
  it("no deja que la IA suba más allá del nivel alcanzado", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue(okMessage("B1")),
    });
    const res = await handlePlacement({ answers }, deps);
    expect(res.body).toMatchObject({ level: "A1", unitId: "a1-quien-eres" });
  });
  it("si la respuesta no cumple el esquema la repite, y suma los tokens en una sola fila", async () => {
    const deps = fakeDeps({
      createMessage: vi
        .fn()
        .mockResolvedValueOnce(badMessage())
        .mockResolvedValueOnce(okMessage("A1")),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(200);
    expect(deps.createMessage).toHaveBeenCalledTimes(2);
    expect(deps.finishCall).toHaveBeenCalledTimes(1);
    expect(deps.finishCall).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ input_tokens: 2000, output_tokens: 90 }),
    );
  });
  it("con 3 respuestas inválidas se rinde: 502 y el gasto queda registrado", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue(badMessage()),
    });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 502,
      body: { error: "ia" },
    });
    expect(deps.createMessage).toHaveBeenCalledTimes(3);
    expect(deps.finishCall).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ input_tokens: 3000 }),
    );
    expect(deps.savePlacement).not.toHaveBeenCalled();
  });
  it("si la IA se niega no insiste", async () => {
    const deps = fakeDeps({
      createMessage: vi
        .fn()
        .mockResolvedValue({ ...okMessage("A1"), stop_reason: "refusal" }),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(502);
    expect(deps.createMessage).toHaveBeenCalledTimes(1);
  });
  it("si se acabó el presupuesto responde 402 y libera la reserva (no cuenta en el límite)", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockRejectedValue({
        status: 400,
        message: "You have reached your specified API usage limits.",
      }),
    });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 402,
      body: { error: "presupuesto" },
    });
    expect(deps.createMessage).toHaveBeenCalledTimes(1);
    expect(deps.releaseCall).toHaveBeenCalledWith(7);
    expect(deps.finishCall).not.toHaveBeenCalled();
  });
  it("si ya había gastado algo antes de acabarse el presupuesto, registra ese gasto", async () => {
    const deps = fakeDeps({
      createMessage: vi
        .fn()
        .mockResolvedValueOnce(badMessage())
        .mockRejectedValueOnce({
          status: 400,
          message: "You have reached your specified API usage limits.",
        }),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(402);
    expect(deps.finishCall).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ input_tokens: 1000 }),
    );
    expect(deps.releaseCall).not.toHaveBeenCalled();
  });
  it("reintenta una falla pasajera (529) y sale bien", async () => {
    const deps = fakeDeps({
      createMessage: vi
        .fn()
        .mockRejectedValueOnce({ status: 529 })
        .mockResolvedValueOnce(okMessage("A1")),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(200);
    expect(deps.createMessage).toHaveBeenCalledTimes(2);
  });
  it("no reintenta un 400 que no es de presupuesto", async () => {
    const deps = fakeDeps({
      createMessage: vi
        .fn()
        .mockRejectedValue({ status: 400, message: "bad request" }),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(502);
    expect(deps.createMessage).toHaveBeenCalledTimes(1);
  });
  it("no empieza otro intento si ya pasaron 60 segundos", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockRejectedValue({ status: 529 }),
      now: vi.fn().mockReturnValueOnce(0).mockReturnValue(61_000),
    });
    expect((await handlePlacement({ answers }, deps)).status).toBe(502);
    expect(deps.createMessage).toHaveBeenCalledTimes(1);
  });
  it("si al guardar resulta que ya estaba evaluado responde 409", async () => {
    const deps = fakeDeps({
      savePlacement: vi.fn().mockResolvedValue("ya-evaluado"),
    });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 409,
      body: { error: "ya-evaluado" },
    });
  });
  it("si no se pudo guardar responde 500, pero el gasto sí queda registrado", async () => {
    const deps = fakeDeps({
      savePlacement: vi.fn().mockRejectedValue(new Error("db")),
    });
    expect(await handlePlacement({ answers }, deps)).toEqual({
      status: 500,
      body: { error: "servidor" },
    });
    expect(deps.finishCall).toHaveBeenCalled();
  });
  it("'Empezar en Nivel 0' guarda sin IA y sin gastar", async () => {
    const deps = fakeDeps();
    expect(await handlePlacement({ fallback: true }, deps)).toEqual({
      status: 200,
      body: { level: "L0", unitId: "l0-saludar", resumen: FALLBACK_RESUMEN },
    });
    expect(deps.savePlacement).toHaveBeenCalledWith("L0", "l0-saludar", {
      fallback: true,
    });
    expect(deps.reserveCall).not.toHaveBeenCalled();
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("'Empezar en Nivel 0' no pisa una evaluación hecha", async () => {
    const deps = fakeDeps({
      savePlacement: vi.fn().mockResolvedValue("ya-evaluado"),
    });
    expect((await handlePlacement({ fallback: true }, deps)).status).toBe(409);
  });
});
