import { describe, expect, it } from "vitest";
import { placementQuestions } from "@/curriculum/placement";
import type { PlacementState } from "./PlacementFlow";
import {
  answerQuestion,
  currentQuestion,
  startPlacement,
} from "./PlacementFlow";

// Contesta la pregunta actual: true = la opción correcta, false = otra, null = "No sé",
// o un texto para las abiertas
function step(
  state: PlacementState,
  value: boolean | string | null,
): PlacementState {
  const q = currentQuestion(state);
  if (typeof value === "boolean") {
    const correct = q.correct ?? 0;
    return answerQuestion(state, value ? correct : (correct + 1) % 4);
  }
  return answerQuestion(state, value);
}

describe("flujo de la evaluación", () => {
  it("empieza en la primera pregunta de Nivel 0", () => {
    const state = startPlacement();
    expect(state.done).toBe(false);
    expect(currentQuestion(state).id).toBe("l0-escuchar");
  });
  it("si falla las dos de opción múltiple, termina sin la abierta", () => {
    let s = startPlacement();
    s = step(s, null);
    s = step(s, false);
    expect(s.done).toBe(true);
    expect(s.answers).toHaveLength(2);
  });
  it("si acierta una de dos, hace la abierta de ese nivel y termina", () => {
    let s = startPlacement();
    s = step(s, true);
    s = step(s, false);
    expect(currentQuestion(s).kind).toBe("responder");
    s = step(s, "My name is Ana");
    expect(s.done).toBe(true);
    expect(s.answers).toHaveLength(3);
  });
  it("si acierta las dos y contesta la abierta, sube al siguiente nivel", () => {
    let s = startPlacement();
    s = step(s, true);
    s = step(s, true);
    s = step(s, "My name is Ana");
    expect(s.done).toBe(false);
    expect(currentQuestion(s).level).toBe("A1");
  });
  it("si acierta todo, llega a B1 y termina con 12 respuestas", () => {
    let s = startPlacement();
    while (!s.done) {
      s = step(
        s,
        currentQuestion(s).kind === "responder" ? "Some answer" : true,
      );
    }
    expect(s.answers).toHaveLength(12);
    expect(s.answers.at(-1)?.level).toBe("B1");
  });
  it("guarda cada respuesta como la espera la función", () => {
    let s = startPlacement();
    s = step(s, true);
    s = step(s, null);
    s = step(s, "  My name is Ana  ");
    expect(s.answers).toEqual([
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
        answer: null,
        correct: false,
      },
      {
        level: "L0",
        kind: "responder",
        prompt: "What is your name?",
        answer: "My name is Ana",
        correct: null,
      },
    ]);
  });
  it("no cambia el estado anterior", () => {
    const first = startPlacement();
    answerQuestion(first, 0);
    expect(first.answers).toHaveLength(0);
    expect(first.index).toBe(0);
  });
  it("el banco y el flujo usan las mismas preguntas", () => {
    expect(currentQuestion(startPlacement())).toBe(placementQuestions[0]);
  });
});
