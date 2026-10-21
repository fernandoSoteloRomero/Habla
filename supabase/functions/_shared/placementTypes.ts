// Tipos de la evaluación inicial, compartidos por la app y la Edge Function `placement`.
// TS puro: sin `npm:` ni `Deno`, para que Vitest y Deno lo importen igual.

export type LevelId = "L0" | "A1" | "A2" | "B1";

export type QuestionKind = "escuchar" | "completar" | "responder";

// Una respuesta de la evaluación. answer null = "No sé"; correct null = pregunta abierta.
export interface PlacementAnswer {
  level: LevelId;
  kind: QuestionKind;
  prompt: string;
  answer: string | null;
  correct: boolean | null;
}

export interface PlacementRequest {
  answers: PlacementAnswer[];
}

// Lo que regresa la función cuando sale bien
export interface PlacementResult {
  level: LevelId;
  unitId: string;
  resumen: string;
}

// Lo que regresa la función cuando no ({ error: código })
export type AiErrorCode = "datos" | "limite" | "presupuesto" | "ia";
