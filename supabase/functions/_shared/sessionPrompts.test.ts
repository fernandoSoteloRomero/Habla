import { describe, expect, it } from "vitest";
import { getUnit, sceneFor } from "./curriculum/units.ts";
import type { SessionContext } from "./sessionPrompts.ts";
import {
  buildCloseParams,
  buildStartParams,
  buildTurnParams,
  KICKOFF,
  LAST_TURN_NOTE,
  parseCloseOutput,
  parseStartOutput,
  parseTurnOutput,
  supportFor,
  turnToAssistantJson,
} from "./sessionPrompts.ts";
import type { PersonajeTurn, Turn } from "./sessionTypes.ts";

const unit = getUnit("a2-restaurante");
const ctx = (level: SessionContext["level"] = "A2"): SessionContext => ({
  unit,
  level,
  motive: "viajes",
  scene: sceneFor(unit, "viajes", "2026-10-22"),
});

const opener: PersonajeTurn = {
  quien: "personaje",
  en: "Hi! Welcome to Sam's Diner. Are you ready to order?",
  es: "Hola, bienvenido a Sam's Diner. ¿Ya sabe qué va a pedir?",
  sugerencias: ["Yes, please.", "Not yet.", "What do you recommend?"],
  correccion: null,
  terminada: false,
};

const turnJson = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    en: "Great choice. Would you like fries with that?",
    es: "Buena elección. ¿Quiere papas con eso?",
    corregir: true,
    original: "I want a hamburger",
    mejor: "I'd like a hamburger, please.",
    mejor_es: "Quisiera una hamburguesa, por favor.",
    nota: "“I'd like” suena más amable que “I want” al pedir.",
    sugerencias: ["Yes, please.", "No, thank you.", "How much is it?", "Extra"],
    terminada: false,
    ...over,
  });

describe("apoyo en español por nivel", () => {
  it("L0 y A1 con traducción visible y sugerencias; A2 con sugerencias; B1 sin nada", () => {
    expect(supportFor("L0")).toEqual({
      translationVisible: true,
      suggestions: true,
    });
    expect(supportFor("A1")).toEqual({
      translationVisible: true,
      suggestions: true,
    });
    expect(supportFor("A2")).toEqual({
      translationVisible: false,
      suggestions: true,
    });
    expect(supportFor("B1")).toEqual({
      translationVisible: false,
      suggestions: false,
    });
  });
});

describe("buildTurnParams", () => {
  const transcript: Turn[] = [
    opener,
    { quien: "persona", texto: "Yes. I want a hamburger." },
    {
      quien: "personaje",
      en: "Sure. Anything to drink?",
      es: "Claro. ¿Algo de tomar?",
      sugerencias: [],
      correccion: null,
      terminada: false,
    },
  ];

  it("el primer bloque de system es fijo y el segundo trae la meta, la escena y el nivel", () => {
    const a = buildTurnParams(ctx("A2"), transcript, "A coke.", false);
    const b = buildTurnParams(
      { ...ctx("B1"), unit: getUnit("a2-hotel") },
      transcript,
      "Hi",
      false,
    );
    const sysA = a.system as { text: string }[];
    const sysB = b.system as { text: string }[];
    expect(sysA[0].text).toBe(sysB[0].text);
    expect(sysA[1].text).toContain("Pedir comida en un restaurante");
    expect(sysA[1].text).toContain(ctx().scene.rol_en);
    expect(sysA[1].text).toContain("A2");
  });
  it("arma los mensajes alternados con la apertura y el texto nuevo al final", () => {
    const p = buildTurnParams(ctx(), transcript, "A coke, please.", false);
    expect(p.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
    ]);
    expect(p.messages[0].content).toBe(KICKOFF);
    expect(p.messages[1].content).toBe(turnToAssistantJson(opener));
    expect(p.messages[2].content).toBe("Yes. I want a hamburger.");
    expect(p.messages[4].content).toBe("A coke, please.");
  });
  it("en el último turno le avisa a la IA que cierre", () => {
    const p = buildTurnParams(ctx(), transcript, "A coke.", true);
    expect(p.messages.at(-1)?.content).toBe(`A coke.${LAST_TURN_NOTE}`);
  });
  it("usa Haiku sin pensamiento, effort low, caché automática y 350 tokens", () => {
    const p = buildTurnParams(ctx(), transcript, "A coke.", false);
    expect(p).toMatchObject({
      model: "claude-haiku-5-5",
      max_tokens: 350,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema" } },
      cache_control: { type: "ephemeral" },
    });
  });
  it("la respuesta del personaje se serializa siempre igual (para la caché)", () => {
    expect(turnToAssistantJson(opener)).toBe(
      JSON.stringify({
        en: opener.en,
        es: opener.es,
        corregir: false,
        original: "",
        mejor: "",
        mejor_es: "",
        nota: "",
        sugerencias: opener.sugerencias,
        terminada: false,
      }),
    );
  });
});

describe("parseTurnOutput", () => {
  it("lee la respuesta con su corrección y deja máximo 3 sugerencias", () => {
    const out = parseTurnOutput(turnJson(), "A2", "Yes. I want a hamburger.");
    expect(out).toEqual({
      en: "Great choice. Would you like fries with that?",
      es: "Buena elección. ¿Quiere papas con eso?",
      sugerencias: ["Yes, please.", "No, thank you.", "How much is it?"],
      correccion: {
        original: "I want a hamburger",
        mejor: "I'd like a hamburger, please.",
        mejor_es: "Quisiera una hamburguesa, por favor.",
        nota: "“I'd like” suena más amable que “I want” al pedir.",
      },
      terminada: false,
    });
  });
  it("en B1 no hay sugerencias", () => {
    expect(parseTurnOutput(turnJson(), "B1", "x")?.sugerencias).toEqual([]);
  });
  it("descarta la corrección si no corrige, si está vacía o si es igual a lo que dijo", () => {
    expect(
      parseTurnOutput(turnJson({ corregir: false }), "A2", "x")?.correccion,
    ).toBeNull();
    expect(
      parseTurnOutput(turnJson({ mejor: " " }), "A2", "x")?.correccion,
    ).toBeNull();
    expect(
      parseTurnOutput(
        turnJson({ mejor: "Yes, I want a hamburger." }),
        "A2",
        "yes i want a hamburger",
      )?.correccion,
    ).toBeNull();
  });
  it("si la IA no dice qué parte cambiar, usa el mensaje completo", () => {
    expect(
      parseTurnOutput(turnJson({ original: "" }), "A2", "I want burger")
        ?.correccion?.original,
    ).toBe("I want burger");
  });
  it("recorta la nota a 140 caracteres y quita los signos de apertura", () => {
    const out = parseTurnOutput(
      turnJson({ nota: "x".repeat(200), es: "¡Claro! ¿Algo más?" }),
      "A2",
      "x",
    );
    expect(out?.correccion?.nota).toHaveLength(140);
    expect(out?.es).toBe("Claro! ¿Algo más?");
  });
  it("con un JSON inválido o sin 'en' regresa null", () => {
    expect(parseTurnOutput("no es json", "A2", "x")).toBeNull();
    expect(parseTurnOutput(turnJson({ en: " " }), "A2", "x")).toBeNull();
    expect(
      parseTurnOutput(turnJson({ terminada: "si" }), "A2", "x"),
    ).toBeNull();
  });
});

describe("start y close", () => {
  const phrases = unit.frases_clave.slice(0, 2);

  it("buildStartParams manda las frases nuevas y pide 900 tokens", () => {
    const p = buildStartParams(ctx(), phrases);
    expect(p.max_tokens).toBe(900);
    expect(p.messages[0].content).toContain(phrases[0].en);
    expect(p.messages[0].content).toContain(phrases[1].en);
  });
  it("parseStartOutput regresa solo las frases pedidas, en orden", () => {
    const text = JSON.stringify({
      frases: [
        {
          en: phrases[1].en,
          nota: "Nota dos.",
          ejemplo_en: "Ex two.",
          ejemplo_es: "Ej dos.",
        },
        { en: "Otra frase.", nota: "", ejemplo_en: "x", ejemplo_es: "x" },
        {
          en: phrases[0].en,
          nota: "Nota uno.",
          ejemplo_en: "Ex one.",
          ejemplo_es: "Ej uno.",
        },
      ],
      apertura_en: "Hi! Ready to order?",
      apertura_es: "Hola. ¿Lista para pedir?",
      sugerencias: ["Yes.", "No.", "Water, please.", "Extra."],
    });
    const out = parseStartOutput(text, phrases, "A2");
    expect(out?.frases.map((f) => f.en)).toEqual([
      phrases[0].en,
      phrases[1].en,
    ]);
    // Si la frase ya trae nota en el temario, la de la IA no se usa
    expect(out?.frases[0].nota).toBe(phrases[0].nota ? "" : "Nota uno.");
    expect(out?.sugerencias).toHaveLength(3);
    expect(out?.apertura_en).toBe("Hi! Ready to order?");
  });
  it("parseStartOutput sin apertura regresa null", () => {
    expect(
      parseStartOutput(
        JSON.stringify({
          frases: [],
          apertura_en: "",
          apertura_es: "",
          sugerencias: [],
        }),
        [],
        "A2",
      ),
    ).toBeNull();
  });
  it("buildCloseParams manda la conversación como texto", () => {
    const p = buildCloseParams(ctx(), [
      opener,
      { quien: "persona", texto: "Yes, a burger please." },
    ]);
    expect(p.messages[0].content).toContain(`Personaje: ${opener.en}`);
    expect(p.messages[0].content).toContain("Persona: Yes, a burger please.");
    expect(p.max_tokens).toBe(300);
  });
  it("parseCloseOutput deja máximo 3 y regresa null si no es una lista", () => {
    expect(
      parseCloseOutput(
        JSON.stringify({ bien: ["Uno", "Dos", "Tres", "Cuatro"] }),
      ),
    ).toEqual(["Uno", "Dos", "Tres"]);
    expect(parseCloseOutput(JSON.stringify({ bien: "Uno" }))).toBeNull();
    expect(parseCloseOutput("x")).toBeNull();
  });
});
