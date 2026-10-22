import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import PlacementService, { PlacementError } from "./PlacementService";

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const answers = [
  {
    level: "L0" as const,
    kind: "escuchar" as const,
    prompt: "Good morning.",
    answer: null,
    correct: false,
  },
];

function httpError(status: number, body: unknown): FunctionsHttpError {
  return new FunctionsHttpError(new Response(JSON.stringify(body), { status }));
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PlacementError) return error.code;
    throw error;
  }
  return "sin error";
}

describe("PlacementService", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("Run manda las respuestas y regresa el resultado", async () => {
    const result = { level: "A1", unitId: "a1-quien-eres", resumen: "x" };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: result,
      error: null,
    } as never);
    expect(await PlacementService.Run(answers)).toEqual(result);
    expect(supabase.functions.invoke).toHaveBeenCalledWith("placement", {
      body: { answers },
    });
  });
  it("Fallback pide empezar en Nivel 0 sin IA", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { level: "L0", unitId: "l0-saludar", resumen: "x" },
      error: null,
    } as never);
    await PlacementService.Fallback();
    expect(supabase.functions.invoke).toHaveBeenCalledWith("placement", {
      body: { fallback: true },
    });
  });
  it.each(["datos", "ya-evaluado", "limite", "presupuesto", "ia", "servidor"])(
    "el código %s de la función llega tal cual",
    async (code) => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: httpError(400, { error: code }),
      } as never);
      expect(await codeOf(PlacementService.Run(answers))).toBe(code);
    },
  );
  it("un código desconocido o una respuesta sin JSON se tratan como ia", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError(500, { error: "otro" }),
    } as never);
    expect(await codeOf(PlacementService.Run(answers))).toBe("ia");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response("<html>", { status: 502 })),
    } as never);
    expect(await codeOf(PlacementService.Run(answers))).toBe("ia");
  });
  it("un 401 (sesión vencida) es sesion", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError(401, {
        code: "UNAUTHORIZED_INVALID_JWT",
        message: "Invalid JWT",
      }),
    } as never);
    expect(await codeOf(PlacementService.Run(answers))).toBe("sesion");
  });
  it("si no llegó a la función es sin-conexion", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Failed to fetch")),
    } as never);
    expect(await codeOf(PlacementService.Run(answers))).toBe("sin-conexion");
  });
});
