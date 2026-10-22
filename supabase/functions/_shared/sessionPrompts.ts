// Prompts, esquemas y lectores de respuesta de la sesión diaria (Edge Function `session`).
// TS puro: sin `npm:` ni `Deno`, para que Vitest lo pruebe y Deno lo importe igual.
// Los prompts de sistema son texto fijo (sin fechas ni nombres) para que la caché funcione;
// lo de cada sesión va en un segundo bloque de system que no cambia durante la sesión.
import { MODEL } from "./aiCall.ts";
import type { MessageParams } from "./aiCall.ts";
import type { LevelId } from "./curriculum/levels.ts";
import type { KeyPhrase, Situation, Unit } from "./curriculum/units.ts";
import type {
  Correction,
  LessonExtra,
  PersonajeTurn,
  SessionContent,
  Sugerencia,
  Turn,
} from "./sessionTypes.ts";

// Apoyo en español según el nivel (spec 5.3): Nivel 0 y A1 ven la traducción desde el
// principio. Las frases sugeridas dependen de la ayuda en la conversación (ayuda.ts).
export function supportFor(level: LevelId): { translationVisible: boolean } {
  return { translationVisible: level === "L0" || level === "A1" };
}

export interface SessionContext {
  unit: Unit;
  level: LevelId;
  motive: string | null;
  scene: Situation;
}

// Primer mensaje fijo: la API pide que la conversación empiece con la persona
export const KICKOFF = "(Empieza la escena.)";
export const LAST_TURN_NOTE =
  "\n\n(Nota del sistema: es el último turno; despídete y pon terminada en true.)";

const LEVEL_ENGLISH: Record<LevelId, string> = {
  L0: "L0, principiante total: frases de 3 a 6 palabras, palabras muy comunes y nada de modismos.",
  A1: "A1: oraciones simples en presente y vocabulario de todos los días.",
  A2: "A2: frases comunes de la vida diaria, con pasado simple y frases de cortesía.",
  B1: "B1: inglés natural, con opiniones y algo de detalle, sin palabras rebuscadas.",
};

const NO_DECORATION =
  "Escribe sin emojis y sin signos de admiración de apertura.";

export const TURN_SYSTEM = `Eres un personaje en Habla, una app donde adultos hispanohablantes practican inglés para la vida real. Conversas con la persona dentro de una escena corta; en el siguiente bloque vienen la meta, la escena, tu personaje y el nivel de la persona.

Cómo hablas (campo "en"):
- Solo en inglés de Estados Unidos y siempre dentro de tu personaje. Nunca digas que eres una IA ni hables de la app.
- Una o dos oraciones, máximo 25 palabras en total. Haz una sola pregunta a la vez para que la persona tenga qué responder.
- Usa el inglés del nivel de la persona. Si parece que no te entendió, dilo más simple.
- Ayuda a que la persona logre el objetivo de la escena, sin hacerlo por ella.
- Si la persona escribe en español, respóndele en inglés simple, como si le hubieras entendido.
- Si la persona se sale de la escena o te pide otra cosa, regrésala con amabilidad a la escena.

"es": la traducción natural de "en" al español de México.

La corrección (revisa solo el último mensaje de la persona):
- Pon "corregir" en true solo si algo cambia el sentido, suena raro o poco amable, o es un error típico de hispanohablantes: "I have 30 years", "I want" al pedir algo, "Is very good" sin sujeto, "I am agree", "She have", "explain me", "I'm boring" en vez de "I'm bored".
- No corrijas mayúsculas, puntuación, faltas de dedo ni el estilo: si el mensaje ya se entiende y suena natural, pon "corregir" en false aunque se pudiera decir de otra forma. Esto vale para todos los niveles.
- Si la persona escribió en español, pon "corregir" en true y en "mejor" cómo decirlo en inglés.
- "original": la parte del mensaje que conviene cambiar, tal como la escribió.
- "mejor": todo el mensaje de la persona como suena natural, nunca un pedazo suelto, corto y listo para repetirlo.
- "mejor_es": la traducción de "mejor" al español de México.
- "nota": por qué suena mejor, en español, de máximo 15 palabras y en tono amable. No uses las palabras "error", "mal" ni "incorrecto".
- Si "corregir" es false, deja "original", "mejor", "mejor_es" y "nota" vacíos.

"sugerencias": 3 respuestas cortas que la persona podría decir ahora para seguir la conversación, distintas entre sí (por ejemplo, una que acepta, una que pide algo más y una pregunta). Cada una con "en" (inglés, de máximo 6 palabras) y "es" (su traducción al español de México). Si la conversación terminó, deja la lista vacía.

"terminada": true cuando la persona ya logró el objetivo de la escena o cuando el sistema avise que es el último turno. En ese caso, en "en" despídete de forma natural y sin hacer otra pregunta.

${NO_DECORATION}`;

export const START_SYSTEM = `Preparas la sesión del día en Habla, una app donde adultos hispanohablantes aprenden inglés para la vida real. En el siguiente bloque vienen la meta, el nivel y el motivo de la persona, tu personaje y la escena de la conversación.

1. Para cada frase nueva que recibes, regresa en "frases" un objeto con:
   - "en": la frase exactamente igual que como la recibiste.
   - "ejemplo_en": otra frase corta en inglés de Estados Unidos que usa la misma estructura en otra situación de la vida real, de preferencia del motivo de la persona (trabajo o viajes). Del nivel de la persona y de máximo 12 palabras.
   - "ejemplo_es": su traducción al español de México.
   - "nota": si la frase ya trae nota, déjala vacía. Si no trae, un consejo de uso en español de máximo 15 palabras: cuándo se usa, qué suena más amable o un error típico de hispanohablantes.
   - Para un ejercicio de completar la frase:
     - "hueco": la parte clave de la frase, de 1 a 3 palabras completas y seguidas, copiada exactamente como aparece en "en". Elige lo que más conviene recordar, no un artículo.
     - "trampas": 2 versiones equivocadas del mismo hueco, como las que escribiría un hispanohablante: otra conjugación, otra preposición, un "to" de más, el orden al revés o una traducción literal del español. Por ejemplo, para "see the menu": "to see the menu" y "seeing the menu"; para "for two": "of two" y "to two"; para "I'm from": "I'm of" y "I from". No uses otra palabra distinta que también tenga sentido en la frase.
     - "por_que": por qué la opción buena es la buena, en español, de máximo 15 palabras.
2. "apertura_en": lo primero que dice tu personaje para empezar la escena: un saludo corto y una pregunta, del nivel de la persona y de máximo 20 palabras. "apertura_es": su traducción al español de México.
3. "sugerencias": 3 respuestas cortas que la persona podría contestar a tu apertura, distintas entre sí. Cada una con "en" (inglés, de máximo 6 palabras) y "es" (su traducción al español de México).

Las notas le hablan de tú a la persona, en voz activa. ${NO_DECORATION}`;

export const CLOSE_SYSTEM = `Lees una conversación corta de práctica en Habla, una app donde adultos hispanohablantes aprenden inglés. En el siguiente bloque vienen la meta, el nivel y la escena; en el mensaje, la conversación entre el personaje y la persona.

Escribe en "bien" de 1 a 3 cosas concretas que la persona hizo bien en esta conversación, en español de México y de máximo 10 palabras cada una. Empieza cada una con un verbo en pasado hablándole de tú, por ejemplo "Pediste tu comida completa" o "Entendiste todas las preguntas del mesero". Fíjate en lo que sí logró de la escena, aunque haya tenido detalles por mejorar. No menciones errores ni calificaciones. ${NO_DECORATION}`;

const str = { type: "string" };
const strList = { type: "array", items: str };
const suggestionList = {
  type: "array",
  items: {
    type: "object",
    properties: { en: str, es: str },
    required: ["en", "es"],
    additionalProperties: false,
  },
};

const TURN_SCHEMA = {
  type: "object",
  properties: {
    en: str,
    es: str,
    corregir: { type: "boolean" },
    original: str,
    mejor: str,
    mejor_es: str,
    nota: str,
    sugerencias: suggestionList,
    terminada: { type: "boolean" },
  },
  required: [
    "en",
    "es",
    "corregir",
    "original",
    "mejor",
    "mejor_es",
    "nota",
    "sugerencias",
    "terminada",
  ],
  additionalProperties: false,
};

const START_SCHEMA = {
  type: "object",
  properties: {
    frases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          en: str,
          nota: str,
          ejemplo_en: str,
          ejemplo_es: str,
          hueco: str,
          trampas: strList,
          por_que: str,
        },
        required: [
          "en",
          "nota",
          "ejemplo_en",
          "ejemplo_es",
          "hueco",
          "trampas",
          "por_que",
        ],
        additionalProperties: false,
      },
    },
    apertura_en: str,
    apertura_es: str,
    sugerencias: suggestionList,
  },
  required: ["frases", "apertura_en", "apertura_es", "sugerencias"],
  additionalProperties: false,
};

const CLOSE_SCHEMA = {
  type: "object",
  properties: { bien: strList },
  required: ["bien"],
  additionalProperties: false,
};

// Lo de esta sesión: igual en todos sus turnos, así la caché lo reutiliza
function contextBlock(ctx: SessionContext): string {
  return [
    `Meta: ${ctx.unit.titulo_es}. ${ctx.unit.meta_puedes}.`,
    `Nivel de la persona: ${LEVEL_ENGLISH[ctx.level]}`,
    `Motivo de la persona: ${ctx.motive ?? "ambos"}.`,
    `Tu personaje: ${ctx.scene.rol_en}.`,
    `Escena: ${ctx.scene.escena_es}`,
    `Objetivo de la persona: ${ctx.scene.objetivo_es}`,
    `Frases clave de la meta: ${ctx.unit.frases_clave.map((f) => f.en).join(" | ")}`,
  ].join("\n");
}

function baseParams(
  system: string,
  ctx: SessionContext,
  schema: Record<string, unknown>,
  maxTokens: number,
  messages: MessageParams["messages"],
): MessageParams {
  return {
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system: [
      { type: "text", text: system },
      { type: "text", text: contextBlock(ctx) },
    ],
    messages,
  };
}

// Siempre con el mismo orden de llaves: la conversación pasada debe ser idéntica turno a turno
export function turnToAssistantJson(turn: PersonajeTurn): string {
  const c = turn.correccion;
  return JSON.stringify({
    en: turn.en,
    es: turn.es,
    corregir: !!c,
    original: c?.original ?? "",
    mejor: c?.mejor ?? "",
    mejor_es: c?.mejor_es ?? "",
    nota: c?.nota ?? "",
    sugerencias: turn.sugerencias,
    terminada: turn.terminada,
  });
}

// transcript empieza con la apertura del personaje (la guarda `start`)
export function buildTurnParams(
  ctx: SessionContext,
  transcript: Turn[],
  text: string,
  lastTurn: boolean,
): MessageParams {
  const history: MessageParams["messages"] = transcript.map((t) =>
    t.quien === "persona"
      ? { role: "user", content: t.texto }
      : { role: "assistant", content: turnToAssistantJson(t) },
  );
  return {
    ...baseParams(TURN_SYSTEM, ctx, TURN_SCHEMA, 500, [
      { role: "user", content: KICKOFF },
      ...history,
      { role: "user", content: lastTurn ? `${text}${LAST_TURN_NOTE}` : text },
    ]),
    cache_control: { type: "ephemeral" },
  };
}

export function buildStartParams(
  ctx: SessionContext,
  phrases: KeyPhrase[],
): MessageParams {
  const lines = phrases.map(
    (p, i) =>
      `${i + 1}. ${p.en} (${p.es})${p.nota ? ` [ya trae nota: ${p.nota}]` : " [sin nota]"}`,
  );
  const content =
    phrases.length > 0
      ? ["Frases nuevas de hoy:", ...lines].join("\n")
      : "Hoy no hay frases nuevas: regresa la lista de frases vacía.";
  return baseParams(START_SYSTEM, ctx, START_SCHEMA, 1400, [
    { role: "user", content },
  ]);
}

export function buildCloseParams(
  ctx: SessionContext,
  transcript: Turn[],
): MessageParams {
  const lines = transcript.map((t) =>
    t.quien === "persona" ? `Persona: ${t.texto}` : `Personaje: ${t.en}`,
  );
  return baseParams(CLOSE_SYSTEM, ctx, CLOSE_SCHEMA, 300, [
    { role: "user", content: ["Conversación:", ...lines].join("\n") },
  ]);
}

// --- Lectores de la respuesta: null = no cumple (se trata como falla de la IA) ---

function readJson(text: string): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// Sin "¡" (regla de textos de la app) y con un largo máximo
function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/¡/g, "").trim().slice(0, max)
    : "";
}

function cleanList(value: unknown, max: number, count: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => clean(v, max))
    .filter((v) => v !== "")
    .slice(0, count);
}

// Hasta 3 respuestas sugeridas con su traducción
function readSuggestions(value: unknown): Sugerencia[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({ en: clean(v.en, 60), es: clean(v.es, 120) }))
    .filter((v) => v.en !== "")
    .slice(0, 3);
}

// Para comparar sin mayúsculas ni puntuación
function sameText(a: string, b: string): boolean {
  const norm = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  return norm(a) === norm(b);
}

export function parseTurnOutput(
  text: string,
  original: string,
):
  | (Omit<PersonajeTurn, "quien" | "correccion"> & {
      correccion: Omit<Correction, "guardada"> | null;
    })
  | null {
  const data = readJson(text);
  if (!data) return null;
  const en = clean(data.en, 300);
  if (en === "" || typeof data.terminada !== "boolean") return null;

  const mejor = clean(data.mejor, 200);
  const mejorEs = clean(data.mejor_es, 200);
  const correccion =
    data.corregir === true &&
    mejor !== "" &&
    mejorEs !== "" &&
    !sameText(mejor, original)
      ? {
          original: clean(data.original, 300) || original.trim().slice(0, 300),
          mejor,
          mejor_es: mejorEs,
          nota: clean(data.nota, 140),
        }
      : null;

  return {
    en,
    es: clean(data.es, 300),
    sugerencias: readSuggestions(data.sugerencias),
    correccion,
    terminada: data.terminada,
  };
}

// El ejercicio de completar solo vale si el hueco está de verdad en la frase (se toma como aparece)
// y hay 2 trampas distintas de la respuesta. Si no, la frase se queda sin ese ejercicio.
function readGap(
  en: string,
  item: Record<string, unknown>,
): Pick<LessonExtra, "hueco" | "trampas" | "por_que"> {
  const none = { hueco: "", trampas: [], por_que: "" };
  const wanted = clean(item.hueco, 40);
  const at = wanted ? en.toLowerCase().indexOf(wanted.toLowerCase()) : -1;
  if (at < 0 || wanted.length >= en.length) return none;
  const hueco = en.slice(at, at + wanted.length);
  const trampas = cleanList(item.trampas, 40, 5)
    .filter((t) => !sameText(t, hueco))
    .filter((t, i, all) => all.findIndex((o) => sameText(o, t)) === i)
    .slice(0, 2);
  if (trampas.length < 2) return none;
  return { hueco, trampas, por_que: clean(item.por_que, 140) };
}

export function parseStartOutput(
  text: string,
  phrases: KeyPhrase[],
): Omit<SessionContent, "escena"> | null {
  const data = readJson(text);
  if (!data) return null;
  const aperturaEn = clean(data.apertura_en, 300);
  if (aperturaEn === "") return null;

  const items = Array.isArray(data.frases)
    ? (data.frases as Record<string, unknown>[])
    : [];
  // Solo las frases que se pidieron, en su orden y con el texto del temario
  const frases: LessonExtra[] = [];
  for (const phrase of phrases) {
    const item = items.find(
      (i) => i && typeof i.en === "string" && sameText(i.en, phrase.en),
    );
    if (!item) continue;
    frases.push({
      en: phrase.en,
      nota: phrase.nota ? "" : clean(item.nota, 140),
      ejemplo_en: clean(item.ejemplo_en, 200),
      ejemplo_es: clean(item.ejemplo_es, 200),
      ...readGap(phrase.en, item),
    });
  }

  return {
    frases,
    apertura_en: aperturaEn,
    apertura_es: clean(data.apertura_es, 300),
    sugerencias: readSuggestions(data.sugerencias),
  };
}

export function parseCloseOutput(text: string): string[] | null {
  const data = readJson(text);
  if (!data || !Array.isArray(data.bien)) return null;
  return cleanList(data.bien, 100, 3);
}
