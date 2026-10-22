import type { KeyPhrase, Unit } from "@/curriculum/units";

// Aprender (spec 5.3): hasta 4 frases nuevas por sesión, de las 6 frases clave de la meta,
// en orden y sin repetir las que ya están en el repaso de la persona.

const NEW_PER_SESSION = 4;

const key = (en: string): string => en.trim().toLowerCase();

export function pickNewPhrases(
  unit: Unit,
  learnedEn: string[],
  max = NEW_PER_SESSION,
): KeyPhrase[] {
  const learned = new Set(learnedEn.map(key));
  return unit.frases_clave.filter((f) => !learned.has(key(f.en))).slice(0, max);
}

// Ya están las 6 en el repaso: se puede seguir a la próxima estación
export function allLearned(unit: Unit, learnedEn: string[]): boolean {
  return pickNewPhrases(unit, learnedEn).length === 0;
}
