import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import router from "@/router";
import PlacementService, {
  PlacementError,
} from "@/Services/Placement/PlacementService";
import type * as PlacementModule from "@/Services/Placement/PlacementService";
import { useAuthStore } from "@/stores/auth";
import EvaluacionPage from "./EvaluacionPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
// Se conserva PlacementError de verdad; solo se reemplaza Run
vi.mock("@/Services/Placement/PlacementService", async (importOriginal) => {
  const actual = await importOriginal<typeof PlacementModule>();
  return { ...actual, default: { Run: vi.fn() } };
});

enableAutoUnmount(afterEach);

const speak = vi.fn();

async function setup(supported = true): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported, speak });
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "viajes",
    level: "L0",
    current_unit_id: "l0-saludar",
    is_admin: false,
    placed_at: null,
  };
  await router.push({ path: "/evaluacion", force: true });
  return mount(EvaluacionPage, { global: { plugins: [pinia, router] } });
}

const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

// Dos "No sé" en Nivel 0 terminan la evaluación
async function answerTwoNoSe(w: VueWrapper): Promise<void> {
  await button(w, "No sé").trigger("click");
  await button(w, "No sé").trigger("click");
}

describe("EvaluacionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("empieza con la primera pregunta de escuchar", async () => {
    const w = await setup();
    expect(w.text()).toContain("Pregunta 1, de unas 12");
    expect(w.text()).toContain("Escucha y elige qué significa");
    expect(w.text()).toContain("No sé");
    await button(w, "Escuchar").trigger("click");
    expect(speak).toHaveBeenCalledWith("Good morning.", false);
    await button(w, "Más lento").trigger("click");
    expect(speak).toHaveBeenCalledWith("Good morning.", true);
  });
  it("sin audio muestra la frase escrita", async () => {
    const w = await setup(false);
    expect(w.text()).toContain("Good morning.");
    expect(w.text()).toContain(
      "Tu navegador no puede leer en voz alta. Lee la frase.",
    );
  });
  it("elegir una opción solo la marca; Siguiente pasa a la siguiente pregunta", async () => {
    const w = await setup();
    expect(button(w, "Siguiente").attributes("disabled")).toBeDefined();
    await button(w, "Buenos días.").trigger("click");
    expect(w.text()).toContain("Pregunta 1, de unas 12");
    expect(button(w, "Buenos días.").attributes("aria-checked")).toBe("true");
    expect(button(w, "Siguiente").attributes("disabled")).toBeUndefined();
    await button(w, "Siguiente").trigger("click");
    expect(w.text()).toContain("Pregunta 2, de unas 12");
    expect(w.text()).toContain("My ___ is Ana.");
    // La nueva pregunta empieza sin opción marcada
    expect(button(w, "Siguiente").attributes("disabled")).toBeDefined();
  });
  it("con dos 'No sé' termina y una sola llamada aunque toque dos veces", async () => {
    vi.mocked(PlacementService.Run).mockReturnValue(new Promise(() => {}));
    const w = await setup();
    await answerTwoNoSe(w);
    expect(w.text()).toContain("Listo, ya tenemos tus respuestas");
    const send = button(w, "Ver mi resultado");
    await send.trigger("click");
    // Mientras la IA responde: el botón avisa y queda apagado
    expect(w.text()).toContain("Calculando tu nivel…");
    expect(w.text()).toContain("Tarda unos segundos.");
    expect(
      button(w, "Calculando tu nivel…").attributes("disabled"),
    ).toBeDefined();
    await send.trigger("click");
    expect(PlacementService.Run).toHaveBeenCalledTimes(1);
    expect(vi.mocked(PlacementService.Run).mock.calls[0][0]).toHaveLength(2);
  });
  it("si sale bien, actualiza el perfil y va al resultado", async () => {
    vi.mocked(PlacementService.Run).mockResolvedValue({
      level: "A2",
      unitId: "a2-junta",
      resumen: "Ya entiendes frases de trabajo.",
    });
    const w = await setup();
    await answerTwoNoSe(w);
    await button(w, "Ver mi resultado").trigger("click");
    await flushPromises();
    const auth = useAuthStore();
    expect(auth.lastPlacement?.unitId).toBe("a2-junta");
    expect(auth.profile?.level).toBe("A2");
    expect(auth.profile?.current_unit_id).toBe("a2-junta");
    expect(auth.profile?.placed_at).not.toBeNull();
    await vi.waitFor(() =>
      expect(router.currentRoute.value.name).toBe("resultado"),
    );
  });
  it("si se acabó el presupuesto, avisa con el mes y deja reintentar", async () => {
    vi.mocked(PlacementService.Run).mockRejectedValue(
      new PlacementError("presupuesto"),
    );
    const w = await setup();
    await answerTwoNoSe(w);
    await button(w, "Ver mi resultado").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Se terminó el presupuesto de IA de octubre");
    expect(w.text()).toContain("Vuelve el 1 de noviembre.");
    expect(router.currentRoute.value.name).toBe("evaluacion");
    await button(w, "Intentar de nuevo").trigger("click");
    await flushPromises();
    expect(PlacementService.Run).toHaveBeenCalledTimes(2);
    expect(vi.mocked(PlacementService.Run).mock.calls[1][0]).toEqual(
      vi.mocked(PlacementService.Run).mock.calls[0][0],
    );
  });
  it.each([
    [
      "ia",
      "La IA no respondió",
      "Lo intentamos dos veces. Prueba de nuevo en un minuto.",
    ],
    [
      "limite",
      "Ya hiciste la evaluación varias veces hoy",
      "Vuelve mañana para intentarlo otra vez.",
    ],
    [
      "sin-conexion",
      "Sin conexión a internet",
      "Tus respuestas siguen aquí. Revisa tu conexión y vuelve a intentar.",
    ],
  ] as const)("con el error %s muestra su aviso", async (code, title, body) => {
    vi.mocked(PlacementService.Run).mockRejectedValue(new PlacementError(code));
    const w = await setup();
    await answerTwoNoSe(w);
    await button(w, "Ver mi resultado").trigger("click");
    await flushPromises();
    expect(w.text()).toContain(title);
    expect(w.text()).toContain(body);
  });
});
