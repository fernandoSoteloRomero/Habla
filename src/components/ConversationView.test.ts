import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "@/composables/useSpeechInput";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type * as SessionModule from "@/Services/Session/SessionService";
import type {
  PersonajeTurn,
  SessionView,
  Turn,
} from "@/Services/interfaces/Session/SessionInterface";
import ConversationView from "./ConversationView.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/composables/useSpeechInput", () => ({ useSpeechInput: vi.fn() }));
vi.mock("@/Services/Session/SessionService", async () => {
  const actual = await vi.importActual<typeof SessionModule>(
    "@/Services/Session/SessionService",
  );
  return {
    ...actual,
    default: { Turn: vi.fn(), Start: vi.fn() },
  };
});

enableAutoUnmount(afterEach);

const unit = getUnit("a2-restaurante");
const speak = vi.fn();

const opener: PersonajeTurn = {
  quien: "personaje",
  en: "Hi! Welcome to Sam's Diner. Are you ready to order?",
  es: "Hola, bienvenido a Sam's Diner. ¿Ya sabe qué va a pedir?",
  sugerencias: [
    { en: "Yes, please.", es: "Sí, por favor." },
    { en: "Not yet.", es: "Todavía no." },
    { en: "What do you recommend?", es: "¿Qué me recomienda?" },
  ],
  correccion: null,
  terminada: false,
};
const reply: PersonajeTurn = {
  quien: "personaje",
  en: "Great choice. Anything to drink?",
  es: "Buena elección. ¿Algo de tomar?",
  sugerencias: [{ en: "A coke, please.", es: "Una coca, por favor." }],
  correccion: {
    original: "I want a burger",
    mejor: "I'd like a burger, please.",
    mejor_es: "Quisiera una hamburguesa, por favor.",
    nota: "“I'd like” suena más amable.",
    guardada: true,
  },
  terminada: false,
};

function session(transcript: Turn[] = [opener]): SessionView {
  return {
    id: "s1",
    kind: "diaria",
    date: "2026-10-22",
    unitId: unit.id,
    status: "en_curso",
    content: {
      frases: [],
      escena: unit.escenas.viajes,
      apertura_en: opener.en,
      apertura_es: opener.es,
      sugerencias: opener.sugerencias,
    },
    transcript,
    summary: null,
    minutes: null,
  };
}

function setup(
  level: "A1" | "A2" | "B1" = "A2",
  transcript?: Turn[],
  ayuda: "guiada" | "con_ayuda" | "libre" = "con_ayuda",
): VueWrapper {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
  vi.mocked(useSpeechInput).mockReturnValue({
    strategy: ref("keyboardDictation"),
    listening: ref(false),
    interim: ref(""),
    error: ref(""),
    start: vi.fn(),
    stop: vi.fn(async () => ""),
    cancel: vi.fn(),
    useKeyboard: vi.fn(),
  });
  return mount(ConversationView, {
    props: { session: session(transcript), level, ayuda },
  });
}

const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

async function say(w: VueWrapper, text: string): Promise<void> {
  await w.get("textarea").setValue(text);
  await w.get('button[aria-label="Enviar"]').trigger("click");
  await flushPromises();
}

describe("ConversationView", () => {
  beforeEach(() => vi.resetAllMocks());

  it("muestra el personaje, la escena con su objetivo y la apertura", async () => {
    const w = setup();
    expect(w.text()).toContain("Con el mesero");
    expect(w.text()).toContain(unit.escenas.viajes.escena_es);
    expect(w.text()).toContain("Tu objetivo:");
    expect(w.text()).toContain(unit.escenas.viajes.objetivo_es);
    expect(w.text()).toContain(opener.en);
    await button(w, "Escuchar").trigger("click");
    expect(speak).toHaveBeenCalledWith(opener.en, false);
  });
  it("en A2 la traducción sale con un toque; en A1 se ve desde el principio", async () => {
    const a2 = setup("A2");
    expect(a2.text()).not.toContain(opener.es);
    await button(a2, "En español").trigger("click");
    expect(a2.text()).toContain(opener.es);
    const a1 = setup("A1");
    expect(a1.text()).toContain(opener.es);
  });
  it("al mandar agrega su mensaje, la respuesta y la placa verde", async () => {
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "Yes. I want a burger." },
      personaje: reply,
    });
    const w = setup();
    await say(w, "Yes. I want a burger.");
    expect(SessionService.Turn).toHaveBeenCalledWith(
      "s1",
      "Yes. I want a burger.",
    );
    expect(w.text()).toContain("Yes. I want a burger.");
    expect(w.text()).toContain("Se entendió. Suena mejor así:");
    expect(w.text()).toContain("I'd like a burger, please.");
    expect(w.text()).toContain("Guardada en tu repaso");
    expect(w.text()).toContain(reply.en);
    expect((w.get("textarea").element as HTMLTextAreaElement).value).toBe("");
  });
  it("con ayuda, las sugerencias se tocan y quedan en el cuadro sin mandarlas", async () => {
    const w = setup("A2");
    expect(w.text()).toContain("Si no sabes qué decir:");
    await button(w, "What do you recommend?").trigger("click");
    expect((w.get("textarea").element as HTMLTextAreaElement).value).toBe(
      "What do you recommend?",
    );
    expect(SessionService.Turn).not.toHaveBeenCalled();
  });
  it("en libre no hay sugerencias, solo el cuadro para escribir", () => {
    const w = setup("B1", undefined, "libre");
    expect(w.text()).not.toContain("Si no sabes qué decir:");
    expect(w.find("textarea").exists()).toBe(true);
  });
  it("en guiada se elige la respuesta (con su traducción) y se manda con un toque", async () => {
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "Not yet." },
      personaje: { ...reply, correccion: null },
    });
    const w = setup("A1", undefined, "guiada");
    expect(w.text()).toContain("Elige tu respuesta:");
    expect(w.text()).toContain("Todavía no.");
    expect(w.find("textarea").exists()).toBe(false);
    await button(w, "Not yet.").trigger("click");
    await flushPromises();
    expect(SessionService.Turn).toHaveBeenCalledWith("s1", "Not yet.");
    // Las siguientes opciones son las de la nueva respuesta del personaje
    expect(w.text()).toContain("Una coca, por favor.");
  });
  it("en guiada, si la IA no respondió, 'Intentar de nuevo' manda la misma opción", async () => {
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("ia"),
    );
    const w = setup("A1", undefined, "guiada");
    await button(w, "Not yet.").trigger("click");
    await flushPromises();
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "Not yet." },
      personaje: { ...reply, correccion: null },
    });
    await button(w, "Intentar de nuevo").trigger("click");
    await flushPromises();
    expect(SessionService.Turn).toHaveBeenLastCalledWith("s1", "Not yet.");
  });
  it("se puede pedir más o menos ayuda", async () => {
    const w = setup("A2");
    await button(w, "Más ayuda").trigger("click");
    await button(w, "Menos ayuda").trigger("click");
    expect(w.emitted("ayuda")).toEqual([["guiada"], ["libre"]]);
    expect(
      setup("A2", undefined, "guiada")
        .findAll("button")
        .some((b) => b.text() === "Más ayuda"),
    ).toBe(false);
  });
  it("si la IA no respondió, el texto se queda y se puede volver a mandar", async () => {
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("ia"),
    );
    const w = setup();
    await say(w, "A coke, please.");
    expect(w.text()).toContain("La IA no respondió");
    expect((w.get("textarea").element as HTMLTextAreaElement).value).toBe(
      "A coke, please.",
    );
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "A coke, please." },
      personaje: { ...reply, correccion: null },
    });
    await button(w, "Intentar de nuevo").trigger("click");
    await flushPromises();
    expect(SessionService.Turn).toHaveBeenLastCalledWith(
      "s1",
      "A coke, please.",
    );
    expect(w.text()).not.toContain("La IA no respondió");
  });
  it("avisa del presupuesto, del límite y de la falta de conexión", async () => {
    const w = setup();
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("presupuesto"),
    );
    await say(w, "Hi");
    expect(w.text()).toContain("Se terminó el presupuesto de IA de");
    expect(w.text()).toContain("El repaso sigue disponible.");
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("limite"),
    );
    await say(w, "Hi");
    expect(w.text()).toContain("Ya practicaste mucho hoy");
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("sin-conexion"),
    );
    await say(w, "Hi");
    expect(w.text()).toContain("Sin conexión a internet");
    expect((w.get("textarea").element as HTMLTextAreaElement).value).toBe("Hi");
  });
  it("si otra pestaña guardó primero, vuelve a cargar la conversación", async () => {
    vi.mocked(SessionService.Turn).mockRejectedValueOnce(
      new SessionError("conflicto"),
    );
    vi.mocked(SessionService.Start).mockResolvedValue(
      session([
        opener,
        { quien: "persona", texto: "Desde la otra pestaña" },
        { ...reply, en: "Respuesta de la otra pestaña" },
      ]),
    );
    const w = setup();
    await say(w, "Hi");
    expect(SessionService.Start).toHaveBeenCalledWith("2026-10-22", []);
    expect(w.text()).toContain("Respuesta de la otra pestaña");
  });
  it("cuando termina, la acción es 'Ver tu resumen'", async () => {
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "The check, please." },
      personaje: {
        ...reply,
        correccion: null,
        terminada: true,
        sugerencias: [],
      },
    });
    const w = setup();
    await say(w, "The check, please.");
    expect(w.find("textarea").exists()).toBe(false);
    await button(w, "Ver tu resumen").trigger("click");
    expect(w.emitted("done")).toHaveLength(1);
  });
  it("después de hablar una vez se puede terminar la conversación", async () => {
    const w = setup("A2", [
      opener,
      { quien: "persona", texto: "Hi" },
      { ...reply, correccion: null },
    ]);
    await button(w, "Terminar conversación").trigger("click");
    expect(w.emitted("done")).toHaveLength(1);
  });
});
