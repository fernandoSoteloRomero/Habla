// Banco de la evaluación inicial (spec 5.2): 3 preguntas por nivel, de Nivel 0 a B1.
// No usa IA: la app sube o baja de nivel según las respuestas (src/common/PlacementFlow.ts),
// y la IA solo decide el nivel al final con todas las respuestas.
// Ruta relativa y ".ts" (sin "@/"), como el resto de src/curriculum.
import type {
  LevelId,
  QuestionKind,
} from "../../supabase/functions/_shared/placementTypes.ts";

export interface PlacementQuestion {
  id: string;
  level: LevelId;
  kind: QuestionKind;
  // Instrucción en español; text es lo que se escucha o se completa (en inglés)
  instruction: string;
  text: string;
  options?: string[];
  correct?: number;
}

export const placementQuestions: PlacementQuestion[] = [
  // Nivel 0
  {
    id: "l0-escuchar",
    level: "L0",
    kind: "escuchar",
    instruction: "Escucha y elige qué significa",
    text: "Good morning.",
    options: ["Buenas noches.", "Buenos días.", "Hasta luego.", "Mucho gusto."],
    correct: 1,
  },
  {
    id: "l0-completar",
    level: "L0",
    kind: "completar",
    instruction: "Elige la palabra que completa la frase",
    text: "My ___ is Ana.",
    options: ["years", "from", "name", "morning"],
    correct: 2,
  },
  {
    id: "l0-responder",
    level: "L0",
    kind: "responder",
    instruction: "Responde en inglés",
    text: "What is your name?",
  },

  // A1
  {
    id: "a1-escuchar",
    level: "A1",
    kind: "escuchar",
    instruction: "Escucha y elige qué significa",
    text: "Where do you live?",
    options: [
      "¿Dónde vives?",
      "¿A qué te dedicas?",
      "¿Cuántos años tienes?",
      "¿De dónde eres?",
    ],
    correct: 0,
  },
  {
    id: "a1-completar",
    level: "A1",
    kind: "completar",
    instruction: "Elige la palabra que completa la frase",
    text: "I ___ coffee every morning.",
    options: ["drinks", "drink", "drinking", "drank"],
    correct: 1,
  },
  {
    id: "a1-responder",
    level: "A1",
    kind: "responder",
    instruction: "Responde en inglés",
    text: "What do you do on weekends?",
  },

  // A2
  {
    id: "a2-escuchar",
    level: "A2",
    kind: "escuchar",
    instruction: "Escucha y elige qué significa",
    text: "Could you tell me how to get to the station?",
    options: [
      "¿Sabe a qué hora sale el tren?",
      "¿Me puede llamar un taxi?",
      "¿Me podría decir cómo llegar a la estación?",
      "¿La estación está cerrada hoy?",
    ],
    correct: 2,
  },
  {
    id: "a2-completar",
    level: "A2",
    kind: "completar",
    instruction: "Elige la palabra que completa la frase",
    text: "Last weekend I ___ to the beach with my family.",
    options: ["went", "go", "have gone", "going"],
    correct: 0,
  },
  {
    id: "a2-responder",
    level: "A2",
    kind: "responder",
    instruction: "Responde en inglés, en dos o tres frases",
    text: "Tell me about your job.",
  },

  // B1
  {
    id: "b1-escuchar",
    level: "B1",
    kind: "escuchar",
    instruction: "Escucha y elige qué significa",
    text: "If I had known about the meeting, I would have prepared a presentation.",
    options: [
      "Como sé de la junta, voy a preparar una presentación.",
      "Si hay junta, prepararé una presentación.",
      "Supe de la junta y preparé una presentación.",
      "Si hubiera sabido de la junta, habría preparado una presentación.",
    ],
    correct: 3,
  },
  {
    id: "b1-completar",
    level: "B1",
    kind: "completar",
    instruction: "Elige la palabra que completa la frase",
    text: "I've been working here ___ 2019.",
    options: ["for", "since", "from", "during"],
    correct: 1,
  },
  {
    id: "b1-responder",
    level: "B1",
    kind: "responder",
    instruction: "Da tu opinión en inglés",
    text: "What would you change about your city, and why?",
  },
];
