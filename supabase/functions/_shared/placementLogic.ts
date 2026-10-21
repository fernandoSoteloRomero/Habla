// Lógica de la evaluación inicial que usa la Edge Function `placement`.
// TS puro: sin `npm:` ni `Deno`, para que Vitest la pruebe y Deno la importe igual.
import type {
  LevelId,
  PlacementAnswer,
  PlacementRequest,
  QuestionKind,
} from "./placementTypes.ts";

const LEVELS: LevelId[] = ["L0", "A1", "A2", "B1"];
const KINDS: QuestionKind[] = ["escuchar", "completar", "responder"];
const MAX_ANSWERS = 12;
const MAX_TEXT = 300;

// Primera estación de cada línea (debe coincidir con src/curriculum/units.ts; lo revisa una prueba)
const FIRST_UNIT: Record<LevelId, string> = {
  L0: "l0-saludar",
  A1: "a1-quien-eres",
  A2: "a2-junta",
  B1: "b1-opinion",
};

// Revisa lo que llega del navegador antes de gastar en la IA. null = no tiene la forma esperada.
export function validatePlacementRequest(
  body: unknown,
): PlacementRequest | null {
  if (!body || typeof body !== "object") return null;
  const answers = (body as Record<string, unknown>).answers;
  if (
    !Array.isArray(answers) ||
    answers.length === 0 ||
    answers.length > MAX_ANSWERS
  ) {
    return null;
  }
  const valid = answers.every((item) => {
    if (!item || typeof item !== "object") return false;
    const a = item as Record<string, unknown>;
    return (
      LEVELS.includes(a.level as LevelId) &&
      KINDS.includes(a.kind as QuestionKind) &&
      typeof a.prompt === "string" &&
      a.prompt.length > 0 &&
      a.prompt.length <= MAX_TEXT &&
      (a.answer === null ||
        (typeof a.answer === "string" && a.answer.length <= MAX_TEXT)) &&
      (a.correct === null || typeof a.correct === "boolean")
    );
  });
  if (!valid) return null;
  return {
    answers: (answers as PlacementAnswer[]).map((a) => ({
      level: a.level,
      kind: a.kind,
      prompt: a.prompt,
      answer: a.answer,
      correct: a.correct,
    })),
  };
}

export function highestLevel(answers: PlacementAnswer[]): LevelId {
  const index = Math.max(...answers.map((a) => LEVELS.indexOf(a.level)));
  return LEVELS[Math.max(0, index)];
}

// La IA no puede poner a alguien en un nivel al que la evaluación no llegó
export function clampLevel(level: LevelId, max: LevelId): LevelId {
  return LEVELS.indexOf(level) > LEVELS.indexOf(max) ? max : level;
}

export function firstUnitOf(level: LevelId): string {
  return FIRST_UNIT[level];
}

// Lee el JSON de la IA. null si no cumple el esquema (se trata como falla de la IA).
export function parsePlacementOutput(
  text: string,
): { level: LevelId; resumen: string } | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { level, resumen } = data as Record<string, unknown>;
  if (!LEVELS.includes(level as LevelId)) return null;
  if (typeof resumen !== "string" || resumen.trim() === "") return null;
  return {
    level: level as LevelId,
    resumen: resumen.trim().slice(0, MAX_TEXT),
  };
}

export const PLACEMENT_SCHEMA = {
  type: "object",
  properties: {
    level: { type: "string", enum: LEVELS },
    resumen: { type: "string" },
  },
  required: ["level", "resumen"],
  additionalProperties: false,
};

export const PLACEMENT_SYSTEM = `Eres el evaluador de Habla, una app para que adultos hispanohablantes aprendan inglés para la vida real.
Recibes las respuestas de una evaluación corta. Las de opción múltiple ya vienen calificadas; las abiertas son texto que la persona escribió o dictó.
Decide en qué línea empieza:
- L0: casi no entiende inglés; necesita saludos, números y frases básicas.
- A1: entiende y dice frases simples sobre sí misma, su familia y compras.
- A2: se comunica en situaciones comunes: trabajo, restaurante, direcciones, viajes.
- B1: da opiniones, cuenta experiencias y resuelve problemas con cierta fluidez.
Califica las abiertas por comunicación, no por perfección: si se entiende y responde lo que se pidió, cuenta. "No sé" o una respuesta vacía no cuenta, sin castigar más.
Si dudas entre dos niveles, elige el más bajo: es mejor empezar fácil.
Escribe "resumen" en español de México, en segunda persona (tú), en máximo dos frases cortas y en voz activa: primero lo que ya puede hacer y luego qué va a practicar primero. Sin emojis, sin signos de admiración y sin mencionar calificaciones.`;

export function buildPlacementPrompt(answers: PlacementAnswer[]): string {
  const lines = answers.map((a, i) => {
    const given = a.answer === null ? "No sé" : a.answer;
    const result =
      a.correct === null ? "abierta" : a.correct ? "correcta" : "incorrecta";
    return `${i + 1}. [${a.level}] (${a.kind}) ${a.prompt} → ${given} (${result})`;
  });
  return [
    "Respuestas de la evaluación:",
    ...lines,
    `Nivel más alto que alcanzó: ${highestLevel(answers)}`,
  ].join("\n");
}
