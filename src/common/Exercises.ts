import type { LevelId } from "@/curriculum/levels";
import { soundsSame } from "./SameWords";

// Practicar: ejercicios cortos para ver si recuerdas las frases (sin puntos ni calificación).
// Los de completar los prepara la IA (hueco + 2 trampas típicas); los demás se arman aquí
// con las frases mismas, así funcionan aunque la IA no esté disponible.

export type ExerciseKind =
  "significado" | "escuchar" | "ordenar" | "completar" | "escribir";

// Una frase para practicar. hueco, trampas y por_que vienen de la IA (frases nuevas de hoy).
export interface ExerciseSource {
  en: string;
  es: string;
  hueco?: string;
  trampas?: string[];
  por_que?: string;
}

export interface Exercise {
  kind: ExerciseKind;
  source: ExerciseSource;
  // Lo que se muestra: el inglés (significado), el español (ordenar y escribir),
  // la frase con "___" (completar) o nada, porque se oye (escuchar)
  prompt: string;
  // Opciones para elegir o palabras para ordenar; vacío en escribir
  options: string[];
  answer: string;
}

// Escribir es el más difícil: solo desde A2
const KINDS_BY_LEVEL: Record<LevelId, ExerciseKind[]> = {
  L0: ["significado", "escuchar", "completar", "ordenar"],
  A1: ["significado", "completar", "ordenar", "escuchar"],
  A2: ["completar", "ordenar", "escribir", "significado", "escuchar"],
  B1: ["completar", "ordenar", "escribir", "significado", "escuchar"],
};
const MIN_ORDER_WORDS = 3;
const MAX_ORDER_WORDS = 9;

export function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Dos opciones equivocadas del mismo tipo (español o inglés) sacadas de otras frases
function distractors(
  answer: string,
  pool: string[],
  random: () => number,
): string[] {
  const others = [...new Set(pool)].filter(
    (text) => text.trim().toLowerCase() !== answer.trim().toLowerCase(),
  );
  return shuffle(others, random).slice(0, 2);
}

function make(
  kind: ExerciseKind,
  source: ExerciseSource,
  pool: ExerciseSource[],
  canSpeak: boolean,
  random: () => number,
): Exercise | null {
  switch (kind) {
    case "significado": {
      const wrong = distractors(
        source.es,
        pool.map((p) => p.es),
        random,
      );
      if (wrong.length < 2) return null;
      return {
        kind,
        source,
        prompt: source.en,
        options: shuffle([source.es, ...wrong], random),
        answer: source.es,
      };
    }
    case "escuchar": {
      if (!canSpeak) return null;
      const wrong = distractors(
        source.en,
        pool.map((p) => p.en),
        random,
      );
      if (wrong.length < 2) return null;
      return {
        kind,
        source,
        prompt: "",
        options: shuffle([source.en, ...wrong], random),
        answer: source.en,
      };
    }
    case "ordenar": {
      const words = source.en.split(/\s+/).filter((w) => w !== "");
      if (words.length < MIN_ORDER_WORDS || words.length > MAX_ORDER_WORDS) {
        return null;
      }
      let options = shuffle(words, random);
      // Que nunca quede ya ordenada
      if (options.join(" ") === words.join(" ")) {
        options = [...words.slice(1), words[0]];
      }
      return {
        kind,
        source,
        prompt: source.es,
        options,
        answer: words.join(" "),
      };
    }
    case "completar": {
      const hueco = source.hueco ?? "";
      const trampas = source.trampas ?? [];
      if (!hueco || trampas.length < 2 || !source.en.includes(hueco)) {
        return null;
      }
      return {
        kind,
        source,
        prompt: source.en.replace(hueco, "___"),
        options: shuffle([hueco, ...trampas.slice(0, 2)], random),
        answer: hueco,
      };
    }
    case "escribir":
      return {
        kind,
        source,
        prompt: source.es,
        options: [],
        answer: source.en,
      };
  }
}

// Un ejercicio por frase. Los tipos se van turnando; si a una frase no le queda uno
// (por ejemplo, sin hueco de la IA), usa el siguiente.
export function buildExercises(params: {
  phrases: ExerciseSource[];
  // Frases de donde salen las opciones equivocadas
  pool: ExerciseSource[];
  level: LevelId;
  // Sin voz del navegador no hay "escuchar"
  canSpeak: boolean;
  random?: () => number;
}): Exercise[] {
  const { phrases, pool, level, canSpeak } = params;
  const random = params.random ?? Math.random;
  const kinds = KINDS_BY_LEVEL[level];

  return phrases.flatMap((source, i) => {
    for (let k = 0; k < kinds.length; k++) {
      const kind = kinds[(i + k) % kinds.length];
      const exercise = make(kind, source, pool, canSpeak, random);
      if (exercise) return [exercise];
    }
    return [];
  });
}

// Escribir acepta contracciones y puntuación distinta; lo demás tiene que ser exacto
export function checkAnswer(exercise: Exercise, given: string): boolean {
  if (exercise.kind === "escribir") return soundsSame(exercise.answer, given);
  return given.trim() === exercise.answer.trim();
}
