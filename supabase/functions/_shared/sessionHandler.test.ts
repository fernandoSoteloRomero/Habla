import { describe, expect, it, vi } from "vitest";
import type { AiMessage } from "./aiCall.ts";
import { getUnit } from "./curriculum/units.ts";
import { LAST_TURN_NOTE } from "./sessionPrompts.ts";
import type { SessionDeps, SessionRow } from "./sessionHandler.ts";
import { handleSession } from "./sessionHandler.ts";
import type { PersonajeTurn, Turn } from "./sessionTypes.ts";

const SESSION_ID = "6f1c2c3a-1b2d-4e5f-8a9b-0c1d2e3f4a5b";
const unit = getUnit("a2-restaurante");

const message = (data: unknown): AiMessage => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify(data) }],
  usage: { input_tokens: 1000, output_tokens: 100 },
});
const startOutput = message({
  frases: [
    {
      en: unit.frases_clave[0].en,
      nota: "",
      ejemplo_en: "I'd like a tea, please.",
      ejemplo_es: "Quisiera un té, por favor.",
    },
  ],
  apertura_en: "Hi! Are you ready to order?",
  apertura_es: "Hola. ¿Ya sabe qué va a pedir?",
  sugerencias: ["Yes, please.", "Not yet.", "What do you recommend?"],
});
const turnOutput = (over: Record<string, unknown> = {}): AiMessage =>
  message({
    en: "Great choice. Anything to drink?",
    es: "Buena elección. ¿Algo de tomar?",
    corregir: true,
    original: "I want a burger",
    mejor: "I'd like a burger, please.",
    mejor_es: "Quisiera una hamburguesa, por favor.",
    nota: "“I'd like” suena más amable.",
    sugerencias: ["A coke, please.", "Water, please.", "No, thanks."],
    terminada: false,
    ...over,
  });
const closeOutput = message({ bien: ["Pediste tu comida completa"] });

const opener: PersonajeTurn = {
  quien: "personaje",
  en: "Hi! Are you ready to order?",
  es: "Hola. ¿Ya sabe qué va a pedir?",
  sugerencias: [],
  correccion: null,
  terminada: false,
};

// n intercambios ya hechos (persona + personaje); `corrected` de ellos con corrección guardada
function transcriptWith(n: number, corrected = 0): Turn[] {
  const turns: Turn[] = [opener];
  for (let i = 0; i < n; i++) {
    turns.push({ quien: "persona", texto: `Mensaje ${i}` });
    turns.push({
      ...opener,
      en: `Respuesta ${i}`,
      correccion:
        i < corrected
          ? {
              original: `Mensaje ${i}`,
              mejor: `Mejor ${i}`,
              mejor_es: `Mejor es ${i}`,
              nota: "Nota.",
              guardada: true,
            }
          : null,
    });
  }
  return turns;
}

function row(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: SESSION_ID,
    unit_id: unit.id,
    date: "2026-10-22",
    content: {
      frases: [],
      escena: unit.escenas.viajes,
      apertura_en: opener.en,
      apertura_es: opener.es,
      sugerencias: [],
    },
    transcript: [opener],
    turns: 0,
    summary: null,
    status: "en_curso",
    minutes: null,
    created_at: "2026-10-22T15:00:00.000Z",
    ...over,
  };
}

function fakeDeps(over: Partial<SessionDeps> = {}): SessionDeps {
  return {
    getProfile: vi.fn().mockResolvedValue({
      level: "A2",
      motive: "viajes",
      current_unit_id: unit.id,
    }),
    findSessionByDate: vi.fn().mockResolvedValue(null),
    getSession: vi.fn().mockResolvedValue(row()),
    insertSession: vi.fn(async (r) => row({ ...r })),
    saveTurns: vi.fn().mockResolvedValue(true),
    closeSession: vi.fn().mockResolvedValue(undefined),
    addCorrectionPhrase: vi.fn().mockResolvedValue(undefined),
    reserveCall: vi.fn().mockResolvedValue(9),
    finishCall: vi.fn().mockResolvedValue(undefined),
    releaseCall: vi.fn().mockResolvedValue(undefined),
    createMessage: vi.fn().mockResolvedValue(turnOutput()),
    now: vi.fn().mockReturnValue(Date.parse("2026-10-22T15:20:00.000Z")),
    ...over,
  };
}

const BUDGET = {
  status: 400,
  message: "You have reached your specified API usage limits.",
};

describe("session: start", () => {
  const body = {
    action: "start",
    date: "2026-10-22",
    newEn: [unit.frases_clave[0].en],
  };

  it("con una fecha inválida o más de 4 frases responde 400 sin gastar", async () => {
    const deps = fakeDeps();
    for (const bad of [
      { ...body, date: "22/10/2026" },
      { ...body, newEn: ["a", "b", "c", "d", "e"] },
      { action: "otra" },
      null,
    ]) {
      expect(await handleSession(bad, deps)).toEqual({
        status: 400,
        body: { error: "datos" },
      });
    }
    expect(deps.reserveCall).not.toHaveBeenCalled();
  });
  it("si ya hay sesión ese día la regresa sin gastar", async () => {
    const deps = fakeDeps({
      findSessionByDate: vi.fn().mockResolvedValue(row()),
    });
    const res = await handleSession(body, deps);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      session: { id: SESSION_ID, status: "en_curso" },
    });
    expect(deps.reserveCall).not.toHaveBeenCalled();
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("prepara la sesión con la IA, guarda la escena del motivo y la apertura", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue(startOutput),
    });
    const res = await handleSession(
      { ...body, newEn: [unit.frases_clave[0].en, "Una frase de otra meta."] },
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.reserveCall).toHaveBeenCalledWith("session-generate", 3);
    const inserted = vi.mocked(deps.insertSession).mock.calls[0][0];
    expect(inserted.unit_id).toBe(unit.id);
    expect(inserted.date).toBe("2026-10-22");
    expect(inserted.content.escena).toBe(unit.escenas.viajes);
    expect(inserted.content.frases.map((f) => f.en)).toEqual([
      unit.frases_clave[0].en,
    ]);
    expect(inserted.transcript).toEqual([
      {
        quien: "personaje",
        en: "Hi! Are you ready to order?",
        es: "Hola. ¿Ya sabe qué va a pedir?",
        sugerencias: ["Yes, please.", "Not yet.", "What do you recommend?"],
        correccion: null,
        terminada: false,
      },
    ]);
    expect(deps.finishCall).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ input_tokens: 1000, output_tokens: 100 }),
    );
  });
  it("sin lugar en el límite responde 429 sin llamar a la IA", async () => {
    const deps = fakeDeps({ reserveCall: vi.fn().mockResolvedValue(null) });
    expect((await handleSession(body, deps)).body).toEqual({
      error: "limite",
    });
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
  it("con el presupuesto agotado responde 402 y libera la reserva", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockRejectedValue(BUDGET),
    });
    expect(await handleSession(body, deps)).toEqual({
      status: 402,
      body: { error: "presupuesto" },
    });
    expect(deps.releaseCall).toHaveBeenCalledWith(9);
  });
  it("si la IA falla responde 502 y no guarda la sesión", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue(message({ x: 1 })),
    });
    expect((await handleSession(body, deps)).status).toBe(502);
    expect(deps.insertSession).not.toHaveBeenCalled();
    expect(deps.finishCall).toHaveBeenCalled();
  });
  it("si otra pestaña la creó primero, regresa la que ganó", async () => {
    const winner = row({ id: "otra" });
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue(startOutput),
      insertSession: vi.fn().mockResolvedValue("existe"),
      findSessionByDate: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner),
    });
    expect((await handleSession(body, deps)).body).toMatchObject({
      session: { id: "otra" },
    });
  });
});

describe("session: turn", () => {
  const body = {
    action: "turn",
    sessionId: SESSION_ID,
    text: "  I want a burger.  ",
  };

  it("con un texto vacío o de más de 300 caracteres responde 400", async () => {
    const deps = fakeDeps();
    for (const text of ["   ", "x".repeat(301)]) {
      expect((await handleSession({ ...body, text }, deps)).status).toBe(400);
    }
    expect(
      (await handleSession({ ...body, sessionId: "x" }, deps)).status,
    ).toBe(400);
  });
  it("si la sesión no es suya o no existe responde 400", async () => {
    const deps = fakeDeps({ getSession: vi.fn().mockResolvedValue(null) });
    expect((await handleSession(body, deps)).body).toEqual({ error: "datos" });
  });
  it("si la sesión ya terminó responde 409 sin gastar", async () => {
    const deps = fakeDeps({
      getSession: vi.fn().mockResolvedValue(row({ status: "terminada" })),
    });
    expect(await handleSession(body, deps)).toEqual({
      status: 409,
      body: { error: "terminada" },
    });
    expect(deps.reserveCall).not.toHaveBeenCalled();
  });
  it("guarda el turno, la corrección en el repaso y la regresa", async () => {
    const deps = fakeDeps();
    const res = await handleSession(body, deps);
    expect(res.status).toBe(200);
    expect(deps.reserveCall).toHaveBeenCalledWith("conversation-turn", 40);
    const persona = { quien: "persona", texto: "I want a burger." };
    const personaje = {
      quien: "personaje",
      en: "Great choice. Anything to drink?",
      es: "Buena elección. ¿Algo de tomar?",
      sugerencias: ["A coke, please.", "Water, please.", "No, thanks."],
      correccion: {
        original: "I want a burger",
        mejor: "I'd like a burger, please.",
        mejor_es: "Quisiera una hamburguesa, por favor.",
        nota: "“I'd like” suena más amable.",
        guardada: true,
      },
      terminada: false,
    };
    expect(res.body).toEqual({ persona, personaje });
    expect(deps.saveTurns).toHaveBeenCalledWith(SESSION_ID, 0, [
      opener,
      persona,
      personaje,
    ]);
    expect(deps.addCorrectionPhrase).toHaveBeenCalledWith(
      unit.id,
      "I'd like a burger, please.",
      "Quisiera una hamburguesa, por favor.",
      "2026-10-23",
    );
  });
  it("después de 3 correcciones guardadas ya no agrega más al repaso", async () => {
    const deps = fakeDeps({
      getSession: vi
        .fn()
        .mockResolvedValue(row({ transcript: transcriptWith(3, 3), turns: 3 })),
    });
    const res = await handleSession(body, deps);
    expect(res.body).toMatchObject({
      personaje: { correccion: { guardada: false } },
    });
    expect(deps.addCorrectionPhrase).not.toHaveBeenCalled();
  });
  it("si la IA falla responde 502 y la conversación no cambia", async () => {
    const deps = fakeDeps({
      createMessage: vi.fn().mockResolvedValue({
        ...turnOutput(),
        stop_reason: "refusal",
      }),
    });
    expect((await handleSession(body, deps)).status).toBe(502);
    expect(deps.saveTurns).not.toHaveBeenCalled();
    expect(deps.addCorrectionPhrase).not.toHaveBeenCalled();
  });
  it("si otra pestaña guardó primero responde 409 conflicto y no guarda la frase", async () => {
    const deps = fakeDeps({ saveTurns: vi.fn().mockResolvedValue(false) });
    expect(await handleSession(body, deps)).toEqual({
      status: 409,
      body: { error: "conflicto" },
    });
    expect(deps.addCorrectionPhrase).not.toHaveBeenCalled();
  });
  it("en el turno 10 avisa a la IA y la conversación termina", async () => {
    const deps = fakeDeps({
      getSession: vi
        .fn()
        .mockResolvedValue(row({ transcript: transcriptWith(9), turns: 9 })),
    });
    const res = await handleSession(body, deps);
    const params = vi.mocked(deps.createMessage).mock.calls[0][0];
    expect(params.messages.at(-1)?.content).toBe(
      `I want a burger.${LAST_TURN_NOTE}`,
    );
    expect(res.body).toMatchObject({
      personaje: { terminada: true, sugerencias: [] },
    });
  });
  it("después del turno 10 ya no deja seguir", async () => {
    const deps = fakeDeps({
      getSession: vi
        .fn()
        .mockResolvedValue(row({ transcript: transcriptWith(10), turns: 10 })),
    });
    expect((await handleSession(body, deps)).body).toEqual({
      error: "terminada",
    });
  });
});

describe("session: close", () => {
  const body = { action: "close", sessionId: SESSION_ID };

  it("si ya terminó regresa su resumen sin gastar", async () => {
    const summary = { bien: ["Pediste"], correcciones: [] };
    const deps = fakeDeps({
      getSession: vi
        .fn()
        .mockResolvedValue(row({ status: "terminada", summary, minutes: 12 })),
    });
    expect(await handleSession(body, deps)).toEqual({
      status: 200,
      body: { summary, minutes: 12 },
    });
    expect(deps.closeSession).not.toHaveBeenCalled();
  });
  it("si la persona no habló, cierra sin IA", async () => {
    const deps = fakeDeps();
    expect(await handleSession(body, deps)).toEqual({
      status: 200,
      body: { summary: { bien: [], correcciones: [] }, minutes: 20 },
    });
    expect(deps.createMessage).not.toHaveBeenCalled();
    expect(deps.closeSession).toHaveBeenCalledWith(
      SESSION_ID,
      { bien: [], correcciones: [] },
      20,
    );
  });
  it("con conversación, la IA dice lo que salió bien y van las primeras 3 correcciones", async () => {
    const deps = fakeDeps({
      getSession: vi
        .fn()
        .mockResolvedValue(row({ transcript: transcriptWith(5, 4), turns: 5 })),
      createMessage: vi.fn().mockResolvedValue(closeOutput),
    });
    const res = await handleSession(body, deps);
    expect(deps.reserveCall).toHaveBeenCalledWith("session-close", 3);
    expect(res.body).toMatchObject({
      summary: { bien: ["Pediste tu comida completa"] },
      minutes: 20,
    });
    const summary = (res.body as { summary: { correcciones: unknown[] } })
      .summary;
    expect(
      summary.correcciones.map((c) => (c as { mejor: string }).mejor),
    ).toEqual(["Mejor 0", "Mejor 1", "Mejor 2"]);
  });
  it("sin lugar en el límite o sin presupuesto, cierra igual sin 'lo que hiciste bien'", async () => {
    for (const over of [
      { reserveCall: vi.fn().mockResolvedValue(null) },
      { createMessage: vi.fn().mockRejectedValue(BUDGET) },
    ]) {
      const deps = fakeDeps({
        getSession: vi
          .fn()
          .mockResolvedValue(row({ transcript: transcriptWith(2), turns: 2 })),
        ...over,
      });
      const res = await handleSession(body, deps);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ summary: { bien: [] } });
      expect(deps.closeSession).toHaveBeenCalled();
    }
  });
  it("los minutos van de 1 a 120", async () => {
    const deps = fakeDeps({
      now: vi.fn().mockReturnValue(Date.parse("2026-10-22T19:00:00.000Z")),
    });
    expect((await handleSession(body, deps)).body).toMatchObject({
      minutes: 120,
    });
  });
});
