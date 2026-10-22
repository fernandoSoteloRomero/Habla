import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import router from "@/router";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type * as SessionModule from "@/Services/Session/SessionService";
import type {
  PersonajeTurn,
  SessionView,
} from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";
import PracticaPage from "./PracticaPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { SaveAyuda: vi.fn() },
}));
vi.mock("@/Services/Session/SessionService", async () => {
  const actual = await vi.importActual<typeof SessionModule>(
    "@/Services/Session/SessionService",
  );
  return {
    ...actual,
    default: { StartPractice: vi.fn(), Turn: vi.fn(), Close: vi.fn() },
  };
});

enableAutoUnmount(afterEach);

const unit = getUnit("a2-junta");
const opener: PersonajeTurn = {
  quien: "personaje",
  en: "Hi! Where are you from?",
  es: "Hola. ¿De dónde eres?",
  sugerencias: [
    { en: "I'm from Mexico.", es: "Soy de México." },
    { en: "I'm from Peru.", es: "Soy de Perú." },
  ],
  correccion: null,
  terminada: false,
};
const practice: SessionView = {
  id: "p1",
  kind: "practica",
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
  transcript: [opener],
  summary: null,
  minutes: null,
};

async function setup(
  ayuda: "guiada" | "con_ayuda" = "guiada",
): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({
    supported: true,
    speak: vi.fn(),
  });
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "trabajo",
    level: "A2",
    current_unit_id: unit.id,
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
    ayuda,
  };
  await router.push({ path: "/practica", force: true });
  const w = mount(PracticaPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}
const click = async (w: VueWrapper, text: string): Promise<void> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  await found.trigger("click");
  await flushPromises();
};

describe("PracticaPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("conversa (en guiada se elige la respuesta), cierra y propone qué sigue", async () => {
    vi.mocked(SessionService.StartPractice).mockResolvedValue(practice);
    vi.mocked(SessionService.Turn).mockResolvedValue({
      persona: { quien: "persona", texto: "I'm from Mexico." },
      personaje: { ...opener, en: "Nice! Enjoy your trip.", terminada: true },
    });
    vi.mocked(SessionService.Close).mockResolvedValue({
      summary: { bien: ["Dijiste de dónde eres"], correcciones: [] },
      minutes: 4,
      ayuda: "con_ayuda",
      siguiente: "ejercicios",
    });
    const w = await setup("guiada");
    expect(SessionService.StartPractice).toHaveBeenCalledWith(
      expect.any(String),
    );
    expect(w.text()).toContain("Elige tu respuesta:");
    await click(w, "I'm from Mexico.");
    await click(w, "Ver tu resumen");
    expect(SessionService.Close).toHaveBeenCalledWith("p1");
    expect(w.text()).toContain("Conversación terminada");
    expect(w.text()).toContain("4 minutos en Presentarte en una junta.");
    expect(w.text()).toContain("Dijiste de dónde eres");
    // Le costó o no, la función decide: aquí recomienda ejercicios (en rosa)
    const keep = w.get('[data-testid="seguir-practicando"]');
    const exercises = keep
      .findAll("button")
      .find((b) => b.text() === "Practicar con ejercicios");
    expect(exercises?.classes()).toContain("bg-rosa");
    expect(useAuthStore().profile?.ayuda).toBe("con_ayuda");
  });
  it("si se acabó el límite del día, avisa y deja volver a Hoy", async () => {
    vi.mocked(SessionService.StartPractice).mockRejectedValue(
      new SessionError("limite"),
    );
    const w = await setup();
    expect(w.text()).toContain("Ya practicaste mucho hoy");
    await click(w, "Volver a Hoy");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
  it("si la IA falló al preparar, 'Intentar de nuevo' lo vuelve a pedir", async () => {
    vi.mocked(SessionService.StartPractice)
      .mockRejectedValueOnce(new SessionError("ia"))
      .mockResolvedValueOnce(practice);
    const w = await setup();
    expect(w.text()).toContain("La IA no respondió");
    await click(w, "Intentar de nuevo");
    expect(SessionService.StartPractice).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain(opener.en);
  });
});
