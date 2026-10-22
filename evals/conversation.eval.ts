// Pruebas de la IA de la conversación (spec 12), con la API real y los mismos prompts que la
// Edge Function `session`. Cuestan alrededor de $0.01 USD. Correr: npm run ai:eval
// La key se lee de .env.local (ANTHROPIC_API_KEY) y nunca se imprime.
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import type {
  AiMessage,
  MessageParams,
} from "../supabase/functions/_shared/aiCall.ts";
import type { LevelId } from "../supabase/functions/_shared/curriculum/levels.ts";
import {
  getUnit,
  sceneFor,
} from "../supabase/functions/_shared/curriculum/units.ts";
import { costUsd } from "../supabase/functions/_shared/pricing.ts";
import type { SessionContext } from "../supabase/functions/_shared/sessionPrompts.ts";
import {
  buildCloseParams,
  buildStartParams,
  buildTurnParams,
  parseCloseOutput,
  parseStartOutput,
  parseTurnOutput,
} from "../supabase/functions/_shared/sessionPrompts.ts";
import type {
  PersonajeTurn,
  Turn,
} from "../supabase/functions/_shared/sessionTypes.ts";

const env = loadEnv("development", process.cwd(), "");
const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 2,
  timeout: 30_000,
});
let totalCost = 0;

async function ask(params: MessageParams): Promise<string> {
  const message = (await client.messages.create(
    params as never,
  )) as unknown as AiMessage;
  totalCost += costUsd(message.usage);
  expect(message.stop_reason).toBe("end_turn");
  return message.content.find((b) => b.type === "text")?.text ?? "";
}

function context(unitId: string, level: LevelId): SessionContext {
  const unit = getUnit(unitId);
  return {
    unit,
    level,
    motive: "ambos",
    scene: sceneFor(unit, "ambos", "2026-10-22"),
  };
}

function opener(en: string): PersonajeTurn {
  return {
    quien: "personaje",
    en,
    es: "",
    sugerencias: [],
    correccion: null,
    terminada: false,
  };
}

interface Case {
  level: LevelId;
  unitId: string;
  opener: string;
  text: string;
  // ¿Debe salir la placa verde?
  corregir: boolean;
}

// Mitad con errores típicos de hispanohablantes; mitad correctas o con detalles que no se corrigen
const CASES: Case[] = [
  {
    level: "L0",
    unitId: "l0-saludar",
    opener: "Good morning! How are you?",
    text: "I am fine, thank you",
    corregir: false,
  },
  {
    level: "L0",
    unitId: "l0-saludar",
    opener: "Good morning! How are you?",
    text: "I fine.",
    corregir: true,
  },
  {
    level: "L0",
    unitId: "l0-numeros",
    opener: "Hi! What time is it?",
    text: "it's three o'clock",
    corregir: false,
  },
  {
    level: "L0",
    unitId: "l0-numeros",
    opener: "Hello! How many apples do you want?",
    text: "Two apple, please.",
    corregir: true,
  },
  {
    level: "L0",
    unitId: "l0-nombre",
    opener: "Hello! What is your name?",
    text: "My name is Carlos.",
    corregir: false,
  },
  {
    level: "L0",
    unitId: "l0-nombre",
    opener: "Hello! What is your name?",
    text: "Me llamo Carlos.",
    corregir: true,
  },
  {
    level: "A1",
    unitId: "a1-quien-eres",
    opener: "Hi, I'm Sam. Where are you from?",
    text: "I am from Mexico.",
    corregir: false,
  },
  {
    level: "A1",
    unitId: "a1-quien-eres",
    opener: "Hi, I'm Sam. Where are you from?",
    text: "I am of Mexico.",
    corregir: true,
  },
  {
    level: "A1",
    unitId: "a1-familia",
    opener: "Do you have brothers or sisters?",
    text: "yes, I have two sisters",
    corregir: false,
  },
  {
    level: "A1",
    unitId: "a1-familia",
    opener: "How old is your son?",
    text: "He have 10 years.",
    corregir: true,
  },
  {
    level: "A1",
    unitId: "a1-rutina",
    opener: "What time do you start work?",
    text: "I start at eight in the morning.",
    corregir: false,
  },
  {
    level: "A1",
    unitId: "a1-cafeteria",
    opener: "Hi! What can I get you?",
    text: "I want a coffee.",
    corregir: true,
  },
  {
    level: "A2",
    unitId: "a2-restaurante",
    opener: "Are you ready to order?",
    text: "Yes, I'd like the chicken, please.",
    corregir: false,
  },
  {
    level: "A2",
    unitId: "a2-restaurante",
    opener: "Are you ready to order?",
    text: "Yes. I want a hamburger and a coke.",
    corregir: true,
  },
  {
    level: "A2",
    unitId: "a2-direcciones",
    opener: "Hi there. Can I help you?",
    text: "Excuse me, how do I get to the meeting room?",
    corregir: false,
  },
  {
    level: "A2",
    unitId: "a2-fin-de-semana",
    opener: "What did you do on the weekend?",
    text: "I go to the beach with my family.",
    corregir: true,
  },
  {
    level: "A2",
    unitId: "a2-trabajo",
    opener: "So, what do you do?",
    text: "I work as a software developer",
    corregir: false,
  },
  {
    level: "A2",
    unitId: "a2-aeropuerto",
    opener: "What is the purpose of your visit?",
    text: "I come for vacations.",
    corregir: true,
  },
  {
    level: "B1",
    unitId: "b1-opinion",
    opener: "What do you think about moving the deadline?",
    text: "I think it's a good idea, because we need more time to test.",
    corregir: false,
  },
  {
    level: "B1",
    unitId: "b1-opinion",
    opener: "What do you think about moving the deadline?",
    text: "I am agree with you, is better to move it.",
    corregir: true,
  },
  {
    level: "B1",
    unitId: "b1-queja",
    opener: "How can I help you today?",
    text: "My laptop stopped working this morning and I can't turn it on.",
    corregir: false,
  },
  {
    level: "B1",
    unitId: "b1-queja",
    opener: "What seems to be the problem?",
    text: "The room is very noisy and there is not hot water.",
    corregir: true,
  },
  {
    level: "B1",
    unitId: "b1-experiencia",
    opener: "Tell me about a difficult situation at work.",
    text: "Last year we had a big problem with a client, and I solved it by calling him every day.",
    corregir: false,
  },
  {
    level: "B1",
    unitId: "b1-proceso",
    opener: "Can you explain how the process works?",
    text: "First you must to fill the form, then you send it to your manager.",
    corregir: true,
  },
];

const NO_DECORATION = /[¡]|\p{Extended_Pictographic}/u;
const HARSH = /\b(error|errores|mal|incorrect[oa]s?)\b/i;

afterAll(() => {
  console.log(`Costo total de la evaluación: $${totalCost.toFixed(5)} USD`);
});

describe("conversación con la IA", () => {
  it("corrige lo que hay que corregir (80% o más) y respeta el formato", async () => {
    const results = await Promise.all(
      CASES.map(async (c) => {
        const ctx = context(c.unitId, c.level);
        const transcript: Turn[] = [opener(c.opener)];
        const text = await ask(buildTurnParams(ctx, transcript, c.text, false));
        return { c, out: parseTurnOutput(text, c.text) };
      }),
    );

    const problems: string[] = [];
    let hits = 0;
    for (const { c, out } of results) {
      const label = `[${c.level}] "${c.text}"`;
      if (!out) {
        problems.push(`${label}: respuesta que no se pudo leer`);
        continue;
      }
      if (!!out.correccion === c.corregir) hits++;
      else
        problems.push(
          `${label}: esperaba corregir=${c.corregir}, salió ${out.correccion ? `"${out.correccion.mejor}"` : "sin corrección"}`,
        );
      // Formato: lo revisa siempre, aunque falle la decisión de corregir
      expect(out.en.split(/\s+/).length, `${label} en`).toBeLessThanOrEqual(30);
      expect(`${out.en} ${out.es}`, label).not.toMatch(NO_DECORATION);
      if (out.correccion) {
        expect(out.correccion.nota, `${label} nota`).not.toBe("");
        expect(out.correccion.nota, `${label} nota`).not.toMatch(HARSH);
      }
      // Las sugerencias (para guiada y con ayuda) traen su traducción
      expect(out.sugerencias.length, label).toBeGreaterThan(0);
      out.sugerencias.forEach((s) => {
        expect(s.es, `${label} ${s.en}`).not.toBe("");
      });
    }

    console.log(
      `Correcciones acertadas: ${hits} de ${CASES.length}\n${problems.join("\n")}`,
    );
    expect(hits / CASES.length).toBeGreaterThanOrEqual(0.8);
  });

  it("al preparar la sesión da un ejemplo para cada frase y la apertura", async () => {
    // Una meta distinta de los ejemplos del prompt, para ver que no solo los copie
    const ctx = context("a2-hotel", "A2");
    const phrases = ctx.unit.frases_clave.slice(0, 4);
    const text = await ask(buildStartParams(ctx, phrases));
    // Lo que mandó la IA, para revisar a ojo que las trampas de verdad estén mal
    const raw = JSON.parse(text) as {
      frases: { en: string; hueco: string; trampas: string[] }[];
    };
    console.log(
      raw.frases
        .map((f) => `${f.en} → [${f.hueco}] trampas: ${f.trampas.join(", ")}`)
        .join("\n"),
    );
    const out = parseStartOutput(text, phrases);
    expect(out).not.toBeNull();
    expect(out?.frases.map((f) => f.en)).toEqual(phrases.map((p) => p.en));
    out?.frases.forEach((f) => {
      expect(f.ejemplo_en, f.en).not.toBe("");
      expect(f.ejemplo_es, f.en).not.toBe("");
      expect(f.en, f.en).toContain(f.hueco);
    });
    // El ejercicio de completar: al menos 3 de 4 frases lo traen bien armado
    const withGap = out?.frases.filter(
      (f) => f.hueco !== "" && f.trampas.length === 2 && f.por_que !== "",
    );
    expect(withGap?.length).toBeGreaterThanOrEqual(3);
    expect(out?.apertura_en).not.toBe("");
  });

  it("al cerrar dice de 1 a 3 cosas que salieron bien", async () => {
    const ctx = context("a2-restaurante", "A2");
    const transcript: Turn[] = [
      opener("Hi! Welcome. Are you ready to order?"),
      { quien: "persona", texto: "Yes, I'd like a hamburger, please." },
      opener("Great. Anything to drink?"),
      { quien: "persona", texto: "A coke, please. How much is it?" },
      opener("That's twelve dollars."),
    ];
    const bien = parseCloseOutput(await ask(buildCloseParams(ctx, transcript)));
    expect(bien?.length).toBeGreaterThanOrEqual(1);
    expect(bien?.length).toBeLessThanOrEqual(3);
    bien?.forEach((b) => expect(b).not.toMatch(NO_DECORATION));
  });
});
