import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import PhrasesService from "./PhrasesService";

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

// Consulta falsa de supabase-js: registra cada método encadenado y al final resuelve `result`
type Call = [string, ...unknown[]];
function fakeQuery(result: unknown): { query: unknown; calls: Call[] } {
  const calls: Call[] = [];
  const query: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "lte",
    "gte",
    "gt",
    "order",
    "limit",
    "update",
    "upsert",
  ]) {
    query[method] = (...args: unknown[]): unknown => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown,
  ): Promise<unknown> => Promise.resolve(result).then(resolve, reject);
  return { query, calls };
}

// Cada llamada a supabase.from() regresa la siguiente consulta falsa
function queue(...results: unknown[]): Call[][] {
  const all: Call[][] = [];
  const mock = vi.mocked(supabase.from);
  results.forEach((r) => {
    const { query, calls } = fakeQuery(r);
    all.push(calls);
    mock.mockReturnValueOnce(query as never);
  });
  return all;
}

const phrase = {
  id: 1,
  en: "Hello.",
  es: "Hola.",
  unit_id: "l0-saludar",
  due_on: "2026-10-22",
  interval_days: 1,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  reviewed_on: null,
};

describe("PhrasesService", () => {
  afterEach(() => vi.resetAllMocks());

  it("GetReviewQueue da las vencidas hasta hoy, las más atrasadas primero, sin pasar de 15", async () => {
    const [countCalls, listCalls] = queue(
      { count: 4, error: null },
      { data: [phrase], error: null },
    );
    const result = await PhrasesService.GetReviewQueue("2026-10-22");
    expect(result).toEqual({ phrases: [phrase], reviewedToday: 4 });
    expect(countCalls).toContainEqual(["eq", "reviewed_on", "2026-10-22"]);
    expect(listCalls).toContainEqual(["lte", "due_on", "2026-10-22"]);
    expect(listCalls).toContainEqual(["order", "due_on", { ascending: true }]);
    expect(listCalls).toContainEqual(["order", "lapses", { ascending: false }]);
    expect(listCalls).toContainEqual(["limit", 11]);
  });
  it("con 15 repasos hechos hoy no pide más frases", async () => {
    queue({ count: 15, error: null });
    expect(await PhrasesService.GetReviewQueue("2026-10-22")).toEqual({
      phrases: [],
      reviewedToday: 15,
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
  it("AddLessonPhrases guarda las frases de la lección sin duplicar", async () => {
    const [calls] = queue({ error: null });
    await PhrasesService.AddLessonPhrases(
      "u1",
      "a2-junta",
      [{ en: "Hi.", es: "Hola.", nota: "x" }],
      "2026-10-23",
    );
    expect(calls).toContainEqual([
      "upsert",
      [
        {
          user_id: "u1",
          en: "Hi.",
          es: "Hola.",
          source: "leccion",
          unit_id: "a2-junta",
          due_on: "2026-10-23",
        },
      ],
      { onConflict: "user_id,en", ignoreDuplicates: true },
    ]);
  });
  it("SaveReview guarda solo los campos del repaso", async () => {
    const [calls] = queue({ error: null });
    const update = {
      interval_days: 7,
      ease: 2.5,
      reps: 1,
      lapses: 0,
      due_on: "2026-10-29",
      reviewed_on: "2026-10-22",
    };
    await PhrasesService.SaveReview(1, update);
    expect(calls).toContainEqual(["update", update]);
    expect(calls).toContainEqual(["eq", "id", 1]);
  });
  it("GetStats cuenta mañana, esta semana y en total, y trae las que más cuestan", async () => {
    const [tomorrow, week, , hardest] = queue(
      { count: 5, error: null },
      { count: 23, error: null },
      { count: 86, error: null },
      { data: [phrase], error: null },
    );
    const stats = await PhrasesService.GetStats("2026-10-22");
    expect(stats).toEqual({
      tomorrow: 5,
      week: 23,
      total: 86,
      hardest: [phrase],
    });
    expect(tomorrow).toContainEqual(["eq", "due_on", "2026-10-23"]);
    expect(week).toContainEqual(["gte", "due_on", "2026-10-23"]);
    expect(week).toContainEqual(["lte", "due_on", "2026-10-29"]);
    expect(hardest).toContainEqual(["gt", "lapses", 0]);
    expect(hardest).toContainEqual(["limit", 3]);
  });
  it("si una consulta falla, lanza el error", async () => {
    queue({ count: null, error: new Error("sin red") });
    await expect(PhrasesService.GetReviewQueue("2026-10-22")).rejects.toThrow(
      "sin red",
    );
  });
});
