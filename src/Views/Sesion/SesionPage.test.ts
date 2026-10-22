import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExercises } from "@/common/Exercises";
import type * as ExercisesModule from "@/common/Exercises";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import router from "@/router";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type * as SessionModule from "@/Services/Session/SessionService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import type {
  PersonajeTurn,
  SessionView,
  Turn,
} from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";
import SesionPage from "./SesionPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: {
    GetReviewQueue: vi.fn(),
    GetLearnedEn: vi.fn(),
    CountLearnedToday: vi.fn(),
    GetRecent: vi.fn(),
    SaveReview: vi.fn(),
    AddLessonPhrases: vi.fn(),
  },
}));
// Los ejercicios se prueban aparte; aquí se elige cuáles salen
vi.mock("@/common/Exercises", async () => {
  const actual =
    await vi.importActual<typeof ExercisesModule>("@/common/Exercises");
  return { ...actual, buildExercises: vi.fn() };
});
vi.mock("@/Services/Session/SessionService", async () => {
  const actual = await vi.importActual<typeof SessionModule>(
    "@/Services/Session/SessionService",
  );
  return {
    ...actual,
    default: { Start: vi.fn(), Turn: vi.fn(), Close: vi.fn() },
  };
});

enableAutoUnmount(afterEach);

const unit = getUnit("a2-junta");
const allLearned = unit.frases_clave.map((f) => f.en);
const review = (n: number): Phrase[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    en: `Old ${i}`,
    es: `Vieja ${i}`,
    unit_id: "a2-junta",
    due_on: "2026-10-22",
    interval_days: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0,
    reviewed_on: null,
  }));

const opener: PersonajeTurn = {
  quien: "personaje",
  en: "Welcome to the team. Can you introduce yourself?",
  es: "Bienvenido al equipo. ¿Puedes presentarte?",
  sugerencias: [],
  correccion: null,
  terminada: false,
};

function aiSession(over: Partial<SessionView> = {}): SessionView {
  return {
    id: "s1",
    kind: "diaria",
    date: "2026-10-22",
    unitId: unit.id,
    status: "en_curso",
    content: {
      frases: [
        {
          en: unit.frases_clave[0].en,
          nota: "",
          ejemplo_en: "Example from the AI.",
          ejemplo_es: "Ejemplo de la IA.",
          hueco: "in charge",
          trampas: ["on charge", "of charge"],
          por_que: "Se dice “in charge of”.",
        },
      ],
      escena: unit.escenas.trabajo,
      apertura_en: opener.en,
      apertura_es: opener.es,
      sugerencias: [],
    },
    transcript: [opener],
    summary: null,
    minutes: null,
    ...over,
  };
}

async function setup(
  toReview: number,
  learnedEn: string[],
  learnedToday = 0,
): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({
    supported: true,
    speak: vi.fn(),
  });
  vi.mocked(PhrasesService.GetReviewQueue).mockResolvedValue({
    phrases: review(toReview),
    reviewedToday: 0,
  });
  vi.mocked(PhrasesService.GetLearnedEn).mockResolvedValue(learnedEn);
  vi.mocked(PhrasesService.CountLearnedToday).mockResolvedValue(learnedToday);
  vi.mocked(PhrasesService.GetRecent).mockResolvedValue(review(3));
  vi.mocked(buildExercises).mockReturnValue([]);
  vi.mocked(PhrasesService.SaveReview).mockResolvedValue();
  vi.mocked(PhrasesService.AddLessonPhrases).mockResolvedValue();
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "trabajo",
    level: "A2",
    current_unit_id: "a2-junta",
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  await router.push({ path: "/sesion", force: true });
  const w = mount(SesionPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}
const click = async (w: VueWrapper, text: string): Promise<void> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  await found.trigger("click");
  await flushPromises();
};
const stage = (w: VueWrapper): string | undefined =>
  w.get("[data-paso]").attributes("data-paso");
async function say(w: VueWrapper, text: string): Promise<void> {
  await w.get("textarea").setValue(text);
  await w.get('button[aria-label="Enviar"]').trigger("click");
  await flushPromises();
}

describe("SesionPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("repasa, aprende con la IA, conversa y termina con el resumen", async () => {
    vi.mocked(SessionService.Start).mockResolvedValue(aiSession());
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "I am Ana, the new developer." },
      personaje: { ...opener, en: "Nice to meet you.", terminada: true },
    });
    vi.mocked(SessionService.Close).mockResolvedValue({
      summary: {
        bien: ["Te presentaste con tu puesto"],
        correcciones: [
          {
            original: "I am agree",
            mejor: "I agree",
            mejor_es: "Estoy de acuerdo",
            nota: "",
            guardada: true,
          },
        ],
      },
      minutes: 18,
      ayuda: "libre",
      siguiente: "conversar",
    });
    const w = await setup(2, []);
    // La IA se prepara al abrir, sin esperar a que termine el repaso
    expect(SessionService.Start).toHaveBeenCalledWith(
      expect.any(String),
      unit.frases_clave.slice(0, 4).map((f) => f.en),
    );
    expect(stage(w)).toBe("repasar");
    for (let i = 0; i < 2; i++) {
      await click(w, "Ver significado");
      await click(w, "Fácil");
    }
    expect(stage(w)).toBe("aprender");
    expect(w.text()).toContain("Otro ejemplo");
    expect(w.text()).toContain("Example from the AI.");
    vi.mocked(buildExercises).mockReturnValue([
      {
        kind: "significado",
        source: { en: "Old 9", es: "Vieja 9" },
        prompt: "Old 9",
        options: ["Vieja 9", "Otra", "Una más"],
        answer: "Vieja 9",
      },
    ]);
    for (let i = 0; i < 3; i++) await click(w, "Siguiente frase");
    await click(w, "Terminar");

    // Practicar: las 4 nuevas (la primera con el hueco de la IA) y 2 de días anteriores
    expect(stage(w)).toBe("practicar");
    const { phrases } = vi.mocked(buildExercises).mock.calls[0][0];
    expect(phrases.map((p) => p.en)).toEqual([
      ...unit.frases_clave.slice(0, 4).map((f) => f.en),
      "Old 0",
      "Old 1",
    ]);
    expect(phrases[0]).toMatchObject({
      hueco: "in charge",
      trampas: ["on charge", "of charge"],
    });
    await click(w, "Vieja 9");
    await click(w, "Revisar");
    await click(w, "Terminar");

    expect(stage(w)).toBe("conversar");
    expect(w.text()).toContain(`Con ${unit.escenas.trabajo.personaje_es}`);
    await say(w, "I am Ana, the new developer.");
    await click(w, "Ver tu resumen");
    expect(SessionService.Close).toHaveBeenCalledWith("s1");

    expect(stage(w)).toBe("resumen");
    expect(w.text()).toContain("Sesión terminada");
    expect(w.text()).toContain("18 minutos en Presentarte en una junta.");
    expect(w.text()).toContain("Lo que hiciste bien");
    expect(w.text()).toContain("Te presentaste con tu puesto");
    expect(w.text()).toContain("Para la próxima");
    expect(w.text()).toContain("I agree");
    expect(w.text()).toContain("Repasaste 2 frases");
    expect(w.text()).toContain("Aprendiste 4 frases nuevas");
    expect(w.text()).toContain("Ejercicios: acertaste 1 de 1 a la primera");
    expect(w.text()).toContain("Agregamos 5 frases a tu repaso.");
    // La función ajustó la ayuda de la próxima y le propone otra conversación (en rosa)
    expect(useAuthStore().profile?.ayuda).toBe("libre");
    const keep = w.get('[data-testid="seguir-practicando"]');
    expect(keep.text()).toContain("Seguir practicando");
    const other = keep
      .findAll("button")
      .find((b) => b.text() === "Otra conversación");
    expect(other?.classes()).toContain("bg-rosa");
    expect(keep.text()).toContain("Practicar con ejercicios");
    await click(w, "Terminar");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
  it("sin repasos ni frases nuevas va directo a Conversar y espera a la IA", async () => {
    vi.mocked(SessionService.Start).mockReturnValue(new Promise(() => {}));
    const w = await setup(0, allLearned);
    expect(stage(w)).toBe("conversar");
    expect(w.text()).toContain("Preparando la conversación…");
  });
  it("sin presupuesto de IA se repasa y aprende igual, y Conversar se puede saltar", async () => {
    vi.mocked(SessionService.Start).mockRejectedValue(
      new SessionError("presupuesto"),
    );
    const w = await setup(1, []);
    await click(w, "Ver significado");
    await click(w, "Fácil");
    expect(w.text()).not.toContain("Otro ejemplo");
    for (let i = 0; i < 3; i++) await click(w, "Siguiente frase");
    await click(w, "Terminar");
    expect(stage(w)).toBe("conversar");
    expect(w.text()).toContain("Se terminó el presupuesto de IA de");
    await click(w, "Saltar la conversación");
    expect(stage(w)).toBe("resumen");
    expect(w.text()).not.toContain("Lo que hiciste bien");
    expect(w.text()).toContain("Aprendiste 4 frases nuevas");
    expect(SessionService.Close).not.toHaveBeenCalled();
    // Sin IA no se ofrece otra conversación, pero sí ejercicios
    expect(w.text()).not.toContain("Otra conversación");
    expect(w.text()).toContain("Practicar con ejercicios");
  });
  it("si la IA falló al preparar, 'Intentar de nuevo' la vuelve a llamar", async () => {
    vi.mocked(SessionService.Start)
      .mockRejectedValueOnce(new SessionError("ia"))
      .mockResolvedValueOnce(aiSession());
    const w = await setup(0, allLearned);
    expect(w.text()).toContain("La IA no respondió");
    await click(w, "Intentar de nuevo");
    expect(SessionService.Start).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain(opener.en);
  });
  it("si ya terminó la sesión de hoy, muestra su resumen", async () => {
    vi.mocked(SessionService.Start).mockResolvedValue(
      aiSession({
        status: "terminada",
        summary: { bien: ["Pediste tu comida"], correcciones: [] },
        minutes: 20,
      }),
    );
    const w = await setup(0, allLearned);
    expect(stage(w)).toBe("resumen");
    expect(w.text()).toContain("Pediste tu comida");
    expect(w.text()).not.toContain("Hoy no había frases");
  });
  it("si la dejó a medias, continúa la conversación donde iba", async () => {
    const transcript: Turn[] = [
      opener,
      { quien: "persona", texto: "Hola desde antes" },
      { ...opener, en: "Tell me more." },
    ];
    vi.mocked(SessionService.Start).mockResolvedValue(
      aiSession({ transcript }),
    );
    const w = await setup(0, allLearned);
    expect(stage(w)).toBe("conversar");
    expect(w.text()).toContain("Hola desde antes");
    expect(w.text()).toContain("Tell me more.");
  });
  it("si no se pudo cerrar por falta de conexión, avisa y deja intentar de nuevo", async () => {
    vi.mocked(SessionService.Start).mockResolvedValue(
      aiSession({
        transcript: [
          opener,
          { quien: "persona", texto: "Hi" },
          { ...opener, en: "Hello." },
        ],
      }),
    );
    vi.mocked(SessionService.Close)
      .mockRejectedValueOnce(new SessionError("sin-conexion"))
      .mockResolvedValueOnce({
        summary: { bien: [], correcciones: [] },
        minutes: 5,
        ayuda: "con_ayuda",
        siguiente: "ejercicios",
      });
    const w = await setup(0, allLearned);
    await click(w, "Terminar conversación");
    expect(w.text()).toContain("Sin conexión a internet");
    await click(w, "Intentar de nuevo");
    expect(stage(w)).toBe("resumen");
    expect(w.text()).toContain("5 minutos en");
  });
  it("el máximo de frases nuevas es por día: con 2 aprendidas hoy solo enseña 2", async () => {
    vi.mocked(SessionService.Start).mockResolvedValue(aiSession());
    const w = await setup(0, [], 2);
    expect(w.text()).toContain("Frase nueva 1 de 2");
  });
  it("con 4 aprendidas hoy ya no enseña más: repasa y pasa a Conversar", async () => {
    vi.mocked(SessionService.Start).mockResolvedValue(aiSession());
    const w = await setup(
      1,
      unit.frases_clave.slice(0, 4).map((f) => f.en),
      4,
    );
    expect(SessionService.Start).toHaveBeenCalledWith(expect.any(String), []);
    await click(w, "Ver significado");
    await click(w, "Fácil");
    expect(stage(w)).toBe("conversar");
    expect(PhrasesService.AddLessonPhrases).not.toHaveBeenCalled();
  });
  it("si no se pudo cargar, avisa y deja reintentar", async () => {
    vi.mocked(useSpeechOutput).mockReturnValue({
      supported: true,
      speak: vi.fn(),
    });
    vi.mocked(PhrasesService.GetReviewQueue).mockRejectedValue(
      new TypeError("x"),
    );
    vi.mocked(PhrasesService.GetLearnedEn).mockRejectedValue(
      new TypeError("x"),
    );
    vi.mocked(PhrasesService.CountLearnedToday).mockRejectedValue(
      new TypeError("x"),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1",
      name: "Ana",
      motive: "trabajo",
      level: "A2",
      current_unit_id: "a2-junta",
      is_admin: false,
      placed_at: "2026-10-21T15:00:00Z",
    };
    const w = mount(SesionPage, { global: { plugins: [pinia, router] } });
    await flushPromises();
    expect(w.text()).toContain("Sin conexión a internet");
    expect(w.text()).toContain("Reintentar");
    expect(SessionService.Start).not.toHaveBeenCalled();
  });
});
