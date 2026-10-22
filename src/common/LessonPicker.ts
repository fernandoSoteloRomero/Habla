import type { KeyPhrase, Unit } from "@/curriculum/units";

// Aprender (spec 5.3): 3 a 5 frases nuevas AL DÍA (aquí 4, sin importar cuántas sesiones haga),
// de las 6 frases clave de la meta, en orden y sin repetir las que ya están en su repaso.

export const MAX_NEW_PER_DAY = 4;

const key = (en: string): string => en.trim().toLowerCase();

// learnedToday: las frases de lección que ya agregó hoy (de esta meta o de la anterior)
export function pickNewPhrases(
  unit: Unit,
  learnedEn: string[],
  learnedToday = 0,
): KeyPhrase[] {
  const learned = new Set(learnedEn.map(key));
  const left = Math.max(0, MAX_NEW_PER_DAY - learnedToday);
  return unit.frases_clave
    .filter((f) => !learned.has(key(f.en)))
    .slice(0, left);
}

// Ya están las 6 en el repaso: se puede seguir a la próxima estación
export function allLearned(unit: Unit, learnedEn: string[]): boolean {
  const learned = new Set(learnedEn.map(key));
  return unit.frases_clave.every((f) => learned.has(key(f.en)));
}
