// Flujo completo de la Edge Function `session` (spec 5.3 y 7.1), con la base y la IA inyectadas
// para que Vitest lo pruebe sin gastar. index.ts solo conecta las dependencias reales.
// - start: prepara la sesión del día (o regresa la que ya existe, sin gastar). Con
//   `practice: true`, una conversación extra ("Seguir practicando") con la otra escena.
// - turn: un turno de la conversación; el historial vive en la base, no lo manda la app.
// - close: el resumen. Siempre termina la sesión, aunque la IA no esté disponible, y ajusta
//   la ayuda de la próxima conversación según cómo le fue (ayuda.ts).
import { callAi } from "./aiCall.ts";
import type {
  AiCallDeps,
  AiCallResult,
  MessageParams,
  UsageTotals,
} from "./aiCall.ts";
import { ayudaFor, conversationStats, nextAyuda } from "./ayuda.ts";
import type { Ayuda } from "./ayuda.ts";
import type { LevelId } from "./curriculum/levels.ts";
import { getUnit, sceneFor } from "./curriculum/units.ts";
import type { Situation } from "./curriculum/units.ts";
import {
  CONVERSATION_TURN_DAILY_MAX,
  MAX_SAVED_CORRECTIONS,
  MAX_USER_TURNS,
  SESSION_CLOSE_DAILY_MAX,
  SESSION_START_DAILY_MAX,
} from "./limits.ts";
import {
  buildCloseParams,
  buildStartParams,
  buildTurnParams,
  parseCloseOutput,
  parseStartOutput,
  parseTurnOutput,
} from "./sessionPrompts.ts";
import type { SessionContext } from "./sessionPrompts.ts";
import type {
  Correction,
  PersonajeTurn,
  SessionContent,
  SessionErrorCode,
  SessionKind,
  SessionStatus,
  SessionSummary,
  SessionView,
  Turn,
} from "./sessionTypes.ts";

// Nombres en usage_log (spec 7.1): así se ve el gasto de cada parte
export type AiFunctionName =
  "session-generate" | "conversation-turn" | "session-close";

export type Motive = "trabajo" | "viajes" | "ambos" | null;

export interface SessionProfile {
  level: LevelId;
  motive: Motive;
  current_unit_id: string;
  ayuda: Ayuda | null;
}

// Fila de public.sessions como la lee la función
export interface SessionRow {
  id: string;
  kind: SessionKind;
  unit_id: string;
  date: string;
  content: SessionContent;
  transcript: Turn[];
  turns: number;
  summary: SessionSummary | null;
  status: SessionStatus;
  minutes: number | null;
  created_at: string;
}

export interface NewSessionRow {
  kind: SessionKind;
  unit_id: string;
  date: string;
  content: SessionContent;
  transcript: Turn[];
}

export interface SessionDeps extends AiCallDeps {
  getProfile(): Promise<SessionProfile | null>;
  saveAyuda(ayuda: Ayuda): Promise<void>;
  // Todas filtran por la persona de la sesión de Supabase.
  // findSessionByDate solo busca la sesión del día (kind = 'diaria').
  findSessionByDate(date: string): Promise<SessionRow | null>;
  countPracticeSessions(date: string): Promise<number>;
  getSession(id: string): Promise<SessionRow | null>;
  // "existe" si otra petición ya creó la sesión de ese día (unique)
  insertSession(row: NewSessionRow): Promise<SessionRow | "existe">;
  // false si `turns` ya no es expectedTurns (otra pestaña guardó primero)
  saveTurns(
    id: string,
    expectedTurns: number,
    transcript: Turn[],
  ): Promise<boolean>;
  closeSession(
    id: string,
    summary: SessionSummary,
    minutes: number,
  ): Promise<void>;
  addCorrectionPhrase(
    unitId: string,
    en: string,
    es: string,
    dueOn: string,
  ): Promise<void>;
  // id de la fila reservada en usage_log, o null si ya llegó al límite
  reserveCall(fn: AiFunctionName, max: number): Promise<number | null>;
  finishCall(id: number, usage: UsageTotals): Promise<void>;
  releaseCall(id: number): Promise<void>;
}

export interface HandlerResponse {
  status: number;
  body: unknown;
}

const STATUS: Record<SessionErrorCode, number> = {
  datos: 400,
  limite: 429,
  presupuesto: 402,
  ia: 502,
  servidor: 500,
  conflicto: 409,
  terminada: 409,
};

const MAX_NEW_PHRASES = 4;
const MAX_TEXT = 300;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: SessionErrorCode): HandlerResponse {
  return { status: STATUS[error], body: { error } };
}
function ok(body: unknown): HandlerResponse {
  return { status: 200, body };
}

function toView(row: SessionRow): SessionView {
  return {
    id: row.id,
    kind: row.kind,
    date: row.date,
    unitId: row.unit_id,
    status: row.status,
    content: row.content,
    transcript: row.transcript,
    summary: row.summary,
    minutes: row.minutes,
  };
}

function isValidDate(date: unknown): date is string {
  return (
    typeof date === "string" &&
    DATE.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  );
}

// El día siguiente de "AAAA-MM-DD" (las correcciones vuelven mañana, como las frases nuevas)
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const sameText = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

function personaTurns(transcript: Turn[]): number {
  return transcript.filter((t) => t.quien === "persona").length;
}

function corrections(transcript: Turn[]): Correction[] {
  return transcript.flatMap((t) =>
    t.quien === "personaje" && t.correccion ? [t.correccion] : [],
  );
}

// Llama a la IA con una reserva ya hecha y deja el gasto registrado (o la reserva libre)
async function spend<T>(
  deps: SessionDeps,
  reservation: number,
  params: MessageParams,
  parse: (text: string) => T | null,
): Promise<AiCallResult<T>> {
  const result = await callAi(deps, params, parse);
  if (!result.ok && result.error === "presupuesto" && !result.spent) {
    await deps.releaseCall(reservation);
  } else {
    await deps.finishCall(reservation, result.usage);
  }
  return result;
}

// La conversación extra usa la otra escena de la meta y, si se repite, se van turnando
function practiceScene(
  daily: Situation,
  escenas: { trabajo: Situation; viajes: Situation },
  practicedToday: number,
): Situation {
  const other = daily === escenas.trabajo ? escenas.viajes : escenas.trabajo;
  return practicedToday % 2 === 0 ? other : daily;
}

async function handleStart(
  body: Record<string, unknown>,
  deps: SessionDeps,
): Promise<HandlerResponse> {
  const { date, newEn } = body;
  const practice = body.practice === true;
  if (
    !isValidDate(date) ||
    !Array.isArray(newEn) ||
    newEn.length > MAX_NEW_PHRASES ||
    !newEn.every((en) => typeof en === "string" && en.length <= 200)
  ) {
    return fail("datos");
  }

  let profile: SessionProfile | null;
  let reservation: number | null;
  let practicedToday = 0;
  try {
    if (practice) {
      practicedToday = await deps.countPracticeSessions(date);
    } else {
      const existing = await deps.findSessionByDate(date);
      if (existing) return ok({ session: toView(existing) });
    }
    profile = await deps.getProfile();
    if (!profile) return fail("datos");
    reservation = await deps.reserveCall(
      "session-generate",
      SESSION_START_DAILY_MAX,
    );
  } catch {
    return fail("servidor");
  }
  if (reservation === null) return fail("limite");

  const unit = getUnit(profile.current_unit_id);
  const daily = sceneFor(unit, profile.motive, date);
  const scene = practice
    ? practiceScene(daily, unit.escenas, practicedToday)
    : daily;
  const ctx: SessionContext = {
    unit,
    level: profile.level,
    motive: profile.motive,
    scene,
  };
  // Solo frases de la meta (lo demás que mande la app se ignora); en la extra no hay frases nuevas
  const phrases = practice
    ? []
    : unit.frases_clave.filter((f) =>
        (newEn as string[]).some((en) => sameText(en, f.en)),
      );

  const result = await spend(
    deps,
    reservation,
    buildStartParams(ctx, phrases),
    (text) => parseStartOutput(text, phrases),
  );
  if (!result.ok) return fail(result.error);

  const content: SessionContent = { ...result.output, escena: scene };
  const opener: PersonajeTurn = {
    quien: "personaje",
    en: content.apertura_en,
    es: content.apertura_es,
    sugerencias: content.sugerencias,
    correccion: null,
    terminada: false,
  };

  try {
    const inserted = await deps.insertSession({
      kind: practice ? "practica" : "diaria",
      unit_id: unit.id,
      date,
      content,
      transcript: [opener],
    });
    if (inserted !== "existe") return ok({ session: toView(inserted) });
    // Otra pestaña la creó al mismo tiempo: se usa la que ganó
    const winner = await deps.findSessionByDate(date);
    return winner ? ok({ session: toView(winner) }) : fail("servidor");
  } catch {
    return fail("servidor");
  }
}

async function handleTurn(
  body: Record<string, unknown>,
  deps: SessionDeps,
): Promise<HandlerResponse> {
  const { sessionId } = body;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (
    typeof sessionId !== "string" ||
    !UUID.test(sessionId) ||
    text === "" ||
    text.length > MAX_TEXT
  ) {
    return fail("datos");
  }

  let session: SessionRow | null;
  let profile: SessionProfile | null;
  try {
    [session, profile] = await Promise.all([
      deps.getSession(sessionId),
      deps.getProfile(),
    ]);
  } catch {
    return fail("servidor");
  }
  if (!session || !profile) return fail("datos");

  const done = session.transcript.some(
    (t) => t.quien === "personaje" && t.terminada,
  );
  const spoken = personaTurns(session.transcript);
  if (session.status === "terminada" || done || spoken >= MAX_USER_TURNS) {
    return fail("terminada");
  }
  const lastTurn = spoken + 1 === MAX_USER_TURNS;

  let reservation: number | null;
  try {
    reservation = await deps.reserveCall(
      "conversation-turn",
      CONVERSATION_TURN_DAILY_MAX,
    );
  } catch {
    return fail("servidor");
  }
  if (reservation === null) return fail("limite");

  const ctx: SessionContext = {
    unit: getUnit(session.unit_id),
    level: profile.level,
    motive: profile.motive,
    scene: session.content.escena,
  };
  const result = await spend(
    deps,
    reservation,
    buildTurnParams(ctx, session.transcript, text, lastTurn),
    (output) => parseTurnOutput(output, text),
  );
  if (!result.ok) return fail(result.error);

  const out = result.output;
  const saved = corrections(session.transcript).filter((c) => c.guardada);
  const correccion: Correction | null = out.correccion
    ? { ...out.correccion, guardada: saved.length < MAX_SAVED_CORRECTIONS }
    : null;
  const terminada = out.terminada || lastTurn;
  const persona: Turn = { quien: "persona", texto: text };
  const personaje: PersonajeTurn = {
    quien: "personaje",
    en: out.en,
    es: out.es,
    sugerencias: terminada ? [] : out.sugerencias,
    correccion,
    terminada,
  };

  try {
    const stored = await deps.saveTurns(session.id, session.turns, [
      ...session.transcript,
      persona,
      personaje,
    ]);
    if (!stored) return fail("conflicto");
  } catch {
    return fail("servidor");
  }

  // La frase entra al repaso para mañana; si falla, el turno ya quedó guardado
  if (correccion?.guardada) {
    try {
      await deps.addCorrectionPhrase(
        session.unit_id,
        correccion.mejor,
        correccion.mejor_es,
        nextDay(session.date),
      );
    } catch {
      // se queda solo en la conversación
    }
  }

  return ok({ persona, personaje });
}

async function handleClose(
  body: Record<string, unknown>,
  deps: SessionDeps,
): Promise<HandlerResponse> {
  const { sessionId } = body;
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) {
    return fail("datos");
  }

  let session: SessionRow | null;
  let profile: SessionProfile | null;
  try {
    [session, profile] = await Promise.all([
      deps.getSession(sessionId),
      deps.getProfile(),
    ]);
  } catch {
    return fail("servidor");
  }
  if (!session) return fail("datos");

  const correcciones = corrections(session.transcript).slice(0, 3);
  const currentAyuda = profile
    ? ayudaFor(profile.level, profile.ayuda)
    : "con_ayuda";
  if (session.status === "terminada") {
    return ok({
      summary: session.summary ?? { bien: [], correcciones },
      minutes: session.minutes ?? 0,
      ayuda: currentAyuda,
      siguiente: "conversar",
    });
  }

  const elapsed = deps.now() - Date.parse(session.created_at);
  const minutes = Math.min(120, Math.max(1, Math.round(elapsed / 60_000)));

  // "Lo que hiciste bien" solo si habló; sin IA disponible, el resumen sale sin esa parte
  let bien: string[] = [];
  if (profile && personaTurns(session.transcript) > 0) {
    try {
      const reservation = await deps.reserveCall(
        "session-close",
        SESSION_CLOSE_DAILY_MAX,
      );
      if (reservation !== null) {
        const ctx: SessionContext = {
          unit: getUnit(session.unit_id),
          level: profile.level,
          motive: profile.motive,
          scene: session.content.escena,
        };
        const result = await spend(
          deps,
          reservation,
          buildCloseParams(ctx, session.transcript),
          parseCloseOutput,
        );
        if (result.ok) bien = result.output;
      }
    } catch {
      // se cierra sin IA
    }
  }

  const summary: SessionSummary = { bien, correcciones };
  try {
    await deps.closeSession(session.id, summary, minutes);
  } catch {
    return fail("servidor");
  }

  // La ayuda de la próxima conversación, según cómo le fue; y qué le conviene practicar ahora
  const { ayuda, struggled } = nextAyuda(
    currentAyuda,
    conversationStats(session.transcript),
  );
  if (profile && ayuda !== currentAyuda) {
    try {
      await deps.saveAyuda(ayuda);
    } catch {
      // se queda la de antes
    }
  }
  return ok({
    summary,
    minutes,
    ayuda,
    siguiente: struggled ? "ejercicios" : "conversar",
  });
}

export async function handleSession(
  body: unknown,
  deps: SessionDeps,
): Promise<HandlerResponse> {
  if (!body || typeof body !== "object") return fail("datos");
  const request = body as Record<string, unknown>;
  switch (request.action) {
    case "start":
      return handleStart(request, deps);
    case "turn":
      return handleTurn(request, deps);
    case "close":
      return handleClose(request, deps);
    default:
      return fail("datos");
  }
}
