// Tipos de la sesión diaria con IA, compartidos por la app y la Edge Function `session`.
// TS puro: sin `npm:` ni `Deno`, para que Vitest y Deno lo importen igual.
import type { Situation } from "./curriculum/units.ts";

export type SessionAction = "start" | "turn" | "close";

// Lo que la IA agrega a cada frase nueva de Aprender
export interface LessonExtra {
  en: string;
  // Vacía si la frase ya trae su nota en el temario
  nota: string;
  ejemplo_en: string;
  ejemplo_es: string;
  // Para el ejercicio de completar: la parte de `en` que se esconde, 2 opciones trampa y por qué
  // la buena es la buena. hueco vacío = esta frase no tiene ejercicio de completar.
  hueco: string;
  trampas: string[];
  por_que: string;
}

// Lo que se prepara al empezar la sesión (sessions.content)
export interface SessionContent {
  frases: LessonExtra[];
  escena: Situation;
  apertura_en: string;
  apertura_es: string;
  sugerencias: string[];
}

// Cómo suena mejor algo que dijo la persona. guardada = entró a su repaso.
export interface Correction {
  original: string;
  mejor: string;
  mejor_es: string;
  nota: string;
  guardada: boolean;
}

// Un turno de la conversación (sessions.transcript). La corrección del personaje es sobre el
// mensaje anterior de la persona.
export type Turn =
  | { quien: "persona"; texto: string }
  | {
      quien: "personaje";
      en: string;
      es: string;
      sugerencias: string[];
      correccion: Correction | null;
      terminada: boolean;
    };

export type PersonajeTurn = Extract<Turn, { quien: "personaje" }>;

export interface SessionSummary {
  bien: string[];
  correcciones: Correction[];
}

export type SessionStatus = "en_curso" | "terminada";

// La sesión como la ve la app
export interface SessionView {
  id: string;
  date: string;
  unitId: string;
  status: SessionStatus;
  content: SessionContent;
  transcript: Turn[];
  summary: SessionSummary | null;
  minutes: number | null;
}

// Lo que regresa la función cuando no sale bien ({ error: código }):
// datos 400, limite 429, presupuesto 402, ia 502, servidor 500, conflicto 409, terminada 409
export type SessionErrorCode =
  | "datos"
  | "limite"
  | "presupuesto"
  | "ia"
  | "servidor"
  | "conflicto"
  | "terminada";
