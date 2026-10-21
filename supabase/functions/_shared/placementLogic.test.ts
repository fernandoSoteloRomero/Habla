import { describe, expect, it } from "vitest";
import type { PlacementAnswer } from "./placementTypes.ts";
import {
  buildPlacementPrompt,
  clampLevel,
  firstUnitOf,
  highestLevel,
  parsePlacementOutput,
  validatePlacementRequest,
} from "./placementLogic.ts";

const answer = (over: Partial<PlacementAnswer> = {}): PlacementAnswer => ({
  level: "L0",
  kind: "escuchar",
  prompt: "Good morning.",
  answer: "Buenos días.",
  correct: true,
  ...over,
});

describe("validatePlacementRequest", () => {
  it("acepta respuestas válidas", () => {
    const body = {
      answers: [
        answer(),
        answer({ kind: "completar", prompt: "My ___ is Ana.", answer: "name" }),
        answer({
          kind: "responder",
          prompt: "What is your name?",
          answer: "My name is Ana",
          correct: null,
        }),
      ],
    };
    expect(validatePlacementRequest(body)?.answers).toHaveLength(3);
  });
  it("acepta 'No sé' (answer null)", () => {
    expect(
      validatePlacementRequest({
        answers: [answer({ answer: null, correct: false })],
      }),
    ).not.toBeNull();
  });
  it("rechaza cuerpos vacíos, enormes o con valores inventados", () => {
    const long = "x".repeat(301);
    expect(validatePlacementRequest({})).toBeNull();
    expect(validatePlacementRequest(null)).toBeNull();
    expect(validatePlacementRequest({ answers: [] })).toBeNull();
    expect(
      validatePlacementRequest({
        answers: Array.from({ length: 13 }, () => answer()),
      }),
    ).toBeNull();
    expect(
      validatePlacementRequest({ answers: [answer({ prompt: long })] }),
    ).toBeNull();
    expect(
      validatePlacementRequest({ answers: [answer({ answer: long })] }),
    ).toBeNull();
    expect(
      validatePlacementRequest({ answers: [{ ...answer(), level: "C2" }] }),
    ).toBeNull();
    expect(
      validatePlacementRequest({ answers: [{ ...answer(), kind: "otro" }] }),
    ).toBeNull();
    expect(
      validatePlacementRequest({ answers: [{ ...answer(), correct: "sí" }] }),
    ).toBeNull();
  });
});

describe("nivel", () => {
  it("highestLevel regresa el nivel más alto al que llegó", () => {
    expect(highestLevel([answer(), answer(), answer({ level: "A1" })])).toBe(
      "A1",
    );
  });
  it("clampLevel no deja pasar del nivel alcanzado", () => {
    expect(clampLevel("B1", "A1")).toBe("A1");
    expect(clampLevel("L0", "A2")).toBe("L0");
    expect(clampLevel("A2", "A2")).toBe("A2");
  });
  it("firstUnitOf da la primera estación de cada línea", () => {
    expect(firstUnitOf("L0")).toBe("l0-saludar");
    expect(firstUnitOf("A1")).toBe("a1-quien-eres");
    expect(firstUnitOf("A2")).toBe("a2-junta");
    expect(firstUnitOf("B1")).toBe("b1-opinion");
  });
});

describe("parsePlacementOutput", () => {
  it("lee el JSON de la IA", () => {
    expect(
      parsePlacementOutput(
        '{"level":"A2","resumen":"Ya entiendes frases de trabajo."}',
      ),
    ).toEqual({ level: "A2", resumen: "Ya entiendes frases de trabajo." });
  });
  it("rechaza lo que no cumple el esquema", () => {
    expect(parsePlacementOutput("no es json")).toBeNull();
    expect(parsePlacementOutput('{"level":"C1","resumen":"x"}')).toBeNull();
    expect(parsePlacementOutput('{"level":"A1","resumen":"   "}')).toBeNull();
    expect(parsePlacementOutput('{"level":"A1"}')).toBeNull();
  });
  it("si el resumen es largo, lo corta en una frase completa", () => {
    const first =
      "Ya puedes presentarte y hablar de tu fin de semana con frases simples.";
    const out = parsePlacementOutput(
      JSON.stringify({
        level: "A1",
        resumen: `${first} ${"Luego ".repeat(60)}más.`,
      }),
    );
    expect(out?.resumen).toBe(first);
  });
  it("recorta un resumen demasiado largo", () => {
    const out = parsePlacementOutput(
      JSON.stringify({ level: "A1", resumen: "a".repeat(400) }),
    );
    expect(out?.resumen).toHaveLength(300);
  });
});

describe("buildPlacementPrompt", () => {
  it("incluye cada pregunta, la respuesta y si fue correcta", () => {
    const prompt = buildPlacementPrompt([
      answer(),
      answer({
        kind: "completar",
        prompt: "My ___ is Ana.",
        answer: "years",
        correct: false,
      }),
      answer({
        kind: "responder",
        prompt: "What is your name?",
        answer: null,
        correct: null,
      }),
    ]);
    expect(prompt).toContain("Good morning.");
    expect(prompt).toContain("Buenos días.");
    expect(prompt).toContain("correcta");
    expect(prompt).toContain("incorrecta");
    expect(prompt).toContain("What is your name?");
    expect(prompt).toContain("No sé");
    expect(prompt).toContain("abierta");
    expect(prompt).toContain("Nivel más alto que alcanzó: L0");
  });
});
