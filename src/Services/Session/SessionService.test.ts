import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import SessionService, { SessionError } from "./SessionService";

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn() },
}));

const SESSION_ID = "6f1c2c3a-1b2d-4e5f-8a9b-0c1d2e3f4a5b";

function httpError(status: number, body: unknown): FunctionsHttpError {
  return new FunctionsHttpError(new Response(JSON.stringify(body), { status }));
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SessionError) return error.code;
    throw error;
  }
  return "sin error";
}

// Consulta falsa de supabase-js: registra cada método encadenado y al final resuelve `result`
type Call = [string, ...unknown[]];
function fakeQuery(result: unknown): Call[] {
  const calls: Call[] = [];
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "maybeSingle"]) {
    query[method] = (...args: unknown[]): unknown => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown,
  ): Promise<unknown> => Promise.resolve(result).then(resolve, reject);
  vi.mocked(supabase.from).mockReturnValueOnce(query as never);
  return calls;
}

describe("SessionService", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("Start, Turn y Close mandan su acción a la función session", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { session: { id: SESSION_ID } },
      error: null,
    } as never);
    expect(await SessionService.Start("2026-10-22", ["Hi."])).toEqual({
      id: SESSION_ID,
    });
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith("session", {
      body: { action: "start", date: "2026-10-22", newEn: ["Hi."] },
    });

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { persona: {}, personaje: {} },
      error: null,
    } as never);
    await SessionService.Turn(SESSION_ID, "Hello");
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith("session", {
      body: { action: "turn", sessionId: SESSION_ID, text: "Hello" },
    });

    const closed = {
      summary: { bien: [], correcciones: [] },
      minutes: 3,
      ayuda: "libre",
      siguiente: "conversar",
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: closed,
      error: null,
    } as never);
    expect(await SessionService.Close(SESSION_ID)).toEqual(closed);
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith("session", {
      body: { action: "close", sessionId: SESSION_ID },
    });
  });
  it("StartPractice pide una conversación extra, sin frases nuevas", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { session: { id: "p1", kind: "practica" } },
      error: null,
    } as never);
    expect(await SessionService.StartPractice("2026-10-22")).toEqual({
      id: "p1",
      kind: "practica",
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith("session", {
      body: { action: "start", date: "2026-10-22", newEn: [], practice: true },
    });
  });
  it.each([
    "datos",
    "limite",
    "presupuesto",
    "ia",
    "servidor",
    "conflicto",
    "terminada",
  ])("el código %s de la función llega tal cual", async (code) => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError(409, { error: code }),
    } as never);
    expect(await codeOf(SessionService.Turn(SESSION_ID, "x"))).toBe(code);
  });
  it("una respuesta sin JSON es ia, un 401 es sesion y sin red es sin-conexion", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response("<html>", { status: 502 })),
    } as never);
    expect(await codeOf(SessionService.Close(SESSION_ID))).toBe("ia");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError(401, { message: "Invalid JWT" }),
    } as never);
    expect(await codeOf(SessionService.Close(SESSION_ID))).toBe("sesion");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Failed to fetch")),
    } as never);
    expect(await codeOf(SessionService.Close(SESSION_ID))).toBe("sin-conexion");
  });
  it("GetTodayStatus lee el estado de la sesión de ese día", async () => {
    const calls = fakeQuery({ data: { status: "terminada" }, error: null });
    expect(await SessionService.GetTodayStatus("2026-10-22")).toBe("terminada");
    expect(calls).toContainEqual(["eq", "date", "2026-10-22"]);
    // Las conversaciones extra no cuentan como la sesión del día
    expect(calls).toContainEqual(["eq", "kind", "diaria"]);
    fakeQuery({ data: null, error: null });
    expect(await SessionService.GetTodayStatus("2026-10-22")).toBe("ninguna");
  });
  it("CountPracticeDays cuenta las sesiones terminadas entre dos fechas", async () => {
    const calls = fakeQuery({ count: 3, error: null });
    expect(
      await SessionService.CountPracticeDays("2026-10-19", "2026-10-22"),
    ).toBe(3);
    expect(calls).toContainEqual(["eq", "status", "terminada"]);
    expect(calls).toContainEqual(["eq", "kind", "diaria"]);
    expect(calls).toContainEqual(["gte", "date", "2026-10-19"]);
    expect(calls).toContainEqual(["lte", "date", "2026-10-22"]);
  });
  it("si la consulta falla, lanza el error", async () => {
    fakeQuery({ data: null, error: new Error("sin red") });
    await expect(SessionService.GetTodayStatus("2026-10-22")).rejects.toThrow(
      "sin red",
    );
  });
});
