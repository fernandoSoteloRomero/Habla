// Cuánta ayuda tiene la persona en la conversación. No a todos se les facilita chatear o hablar,
// así que la app empieza según el nivel y se ajusta sola después de cada sesión:
// - guiada: elige su respuesta entre 3 opciones con su traducción, sin escribir.
// - con_ayuda: escribe o dicta, con frases sugeridas.
// - libre: escribe o dicta, sin sugerencias.
// La persona la puede cambiar cuando quiera ("Más ayuda" / "Menos ayuda").
// TS puro: sin `npm:` ni `Deno`, para que Vitest y Deno lo importen igual.
import type { LevelId } from "./curriculum/levels.ts";
import type { Turn } from "./sessionTypes.ts";

export type Ayuda = "guiada" | "con_ayuda" | "libre";

const STEPS: Ayuda[] = ["guiada", "con_ayuda", "libre"];

// null = todavía no se ajusta: la del nivel
export function ayudaFor(level: LevelId, ayuda: Ayuda | null): Ayuda {
  if (ayuda) return ayuda;
  if (level === "L0" || level === "A1") return "guiada";
  return level === "A2" ? "con_ayuda" : "libre";
}

export function moreHelp(ayuda: Ayuda): Ayuda {
  return STEPS[Math.max(0, STEPS.indexOf(ayuda) - 1)];
}
export function lessHelp(ayuda: Ayuda): Ayuda {
  return STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(ayuda) + 1)];
}

export interface ConversationStats {
  // Mensajes de la persona
  spoke: number;
  // De esos, cuántos necesitaron corrección
  corrected: number;
  // Cuántos fueron una de las frases sugeridas, tal cual
  fromSuggestions: number;
  // Llegó al final de la escena
  finished: boolean;
}

const norm = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function conversationStats(transcript: Turn[]): ConversationStats {
  const stats: ConversationStats = {
    spoke: 0,
    corrected: 0,
    fromSuggestions: 0,
    finished: false,
  };
  transcript.forEach((turn, i) => {
    if (turn.quien === "personaje") {
      if (turn.terminada) stats.finished = true;
      return;
    }
    stats.spoke += 1;
    const before = transcript[i - 1];
    const after = transcript[i + 1];
    if (
      before?.quien === "personaje" &&
      before.sugerencias.some((s) => norm(s.en) === norm(turn.texto))
    ) {
      stats.fromSuggestions += 1;
    }
    if (after?.quien === "personaje" && after.correccion) stats.corrected += 1;
  });
  return stats;
}

// Después de cada sesión:
// - Le costó (no habló, o la mitad o más de sus mensajes necesitaron corrección): más ayuda.
// - Le salió bien (habló 3 veces o más, máximo 1 corrección y, en guiada, llegó al final de la
//   escena; con ayuda, la mayoría con sus propias palabras): menos ayuda.
// - Si no, se queda igual.
export function nextAyuda(
  current: Ayuda,
  stats: ConversationStats,
): { ayuda: Ayuda; struggled: boolean } {
  const struggled = stats.spoke === 0 || stats.corrected / stats.spoke >= 0.5;
  if (struggled) return { ayuda: moreHelp(current), struggled };

  const ownWords =
    current === "guiada"
      ? stats.finished
      : stats.fromSuggestions / stats.spoke < 0.5;
  const didWell = stats.spoke >= 3 && stats.corrected <= 1 && ownWords;
  return { ayuda: didWell ? lessHelp(current) : current, struggled };
}
