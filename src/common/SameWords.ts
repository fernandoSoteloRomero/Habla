// "Decirla en voz alta" (pantalla 2.3): ¿lo que entendió el navegador o el teclado es la frase?
// No califica la pronunciación (fuera de la v1): solo revisa que se entendieran sus palabras.

const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am",
  "you're": "you are",
  "it's": "it is",
  "don't": "do not",
  "doesn't": "does not",
  "isn't": "is not",
  "can't": "can not",
  cannot: "can not",
  "i'd": "i would",
  "i'll": "i will",
  "i've": "i have",
  "we're": "we are",
  "they're": "they are",
  "let's": "let us",
  "what's": "what is",
  "that's": "that is",
};

const MIN_SHARE = 0.8;

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "")
    .flatMap((w) => (CONTRACTIONS[w] ?? w).split(" "))
    .map((w) => w.replace(/'/g, ""));
}

// Se entendió si al menos el 80% de las palabras de la frase aparecen en lo que se oyó
export function soundsSame(target: string, heard: string): boolean {
  const words = normalizeWords(target);
  if (words.length === 0) return false;
  const heardWords = new Set(normalizeWords(heard));
  const found = words.filter((w) => heardWords.has(w)).length;
  return found / words.length >= MIN_SHARE;
}
