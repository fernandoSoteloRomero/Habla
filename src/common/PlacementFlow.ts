import { placementQuestions } from "@/curriculum/placement";
import type { PlacementQuestion } from "@/curriculum/placement";
import type { PlacementAnswer } from "@shared/placementTypes";

// Avance de la evaluación inicial. En cada nivel: dos de opción múltiple y una abierta.
// - Si no acertó ninguna de las dos, termina ahí (sin la abierta).
// - Si acertó al menos una, hace la abierta.
// - Después de la abierta, si acertó las dos y no es B1, sube al siguiente nivel; si no, termina.
// Las funciones son puras: regresan un estado nuevo.

export interface PlacementState {
  index: number;
  answers: PlacementAnswer[];
  done: boolean;
}

export function startPlacement(): PlacementState {
  return { index: 0, answers: [], done: false };
}

export function currentQuestion(state: PlacementState): PlacementQuestion {
  return placementQuestions[state.index];
}

// value: número = opción elegida; texto = respuesta abierta; null = "No sé"
export function answerQuestion(
  state: PlacementState,
  value: number | string | null,
): PlacementState {
  const question = currentQuestion(state);
  const answer = toAnswer(question, value);
  const answers = [...state.answers, answer];

  if (question.kind === "escuchar") {
    return { index: state.index + 1, answers, done: false };
  }

  const correctInLevel = answers.filter(
    (a) => a.level === question.level && a.correct === true,
  ).length;

  if (question.kind === "completar") {
    // Ninguna de las dos: se puso difícil, termina sin la abierta
    if (correctInLevel === 0)
      return { index: state.index, answers, done: true };
    return { index: state.index + 1, answers, done: false };
  }

  // Abierta: sube de nivel solo si acertó las dos de opción múltiple
  const isLast = state.index === placementQuestions.length - 1;
  if (correctInLevel === 2 && !isLast) {
    return { index: state.index + 1, answers, done: false };
  }
  return { index: state.index, answers, done: true };
}

function toAnswer(
  question: PlacementQuestion,
  value: number | string | null,
): PlacementAnswer {
  if (question.kind === "responder") {
    const text = typeof value === "string" ? value.trim() : "";
    return {
      level: question.level,
      kind: question.kind,
      prompt: question.text,
      answer: text === "" ? null : text,
      correct: null,
    };
  }
  const chosen = typeof value === "number" ? value : null;
  return {
    level: question.level,
    kind: question.kind,
    prompt: question.text,
    answer: chosen === null ? null : (question.options?.[chosen] ?? null),
    correct: chosen !== null && chosen === question.correct,
  };
}
