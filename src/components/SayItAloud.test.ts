import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "@/composables/useSpeechInput";
import SayItAloud from "./SayItAloud.vue";

vi.mock("@/composables/useSpeechInput", () => ({ useSpeechInput: vi.fn() }));

enableAutoUnmount(afterEach);

const PHRASE = "Can I see the menu, please?";

function fakeSpeech(
  strategy: "webSpeech" | "keyboardDictation",
  heard = "",
): ReturnType<typeof useSpeechInput> {
  const listening = ref(false);
  const interim = ref("");
  const error = ref<"" | "permiso" | "fallo">("");
  const strat = ref(strategy);
  const speech = {
    strategy: strat,
    listening,
    interim,
    error,
    start: vi.fn(() => {
      listening.value = true;
    }),
    stop: vi.fn(async () => {
      listening.value = false;
      interim.value = heard;
      return heard;
    }),
    cancel: vi.fn(),
    useKeyboard: vi.fn(() => {
      strat.value = "keyboardDictation";
      error.value = "";
    }),
  };
  vi.mocked(useSpeechInput).mockReturnValue(speech);
  return speech;
}

const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

describe("SayItAloud", () => {
  it("con el micrófono del navegador escucha y dice si se entendió bien", async () => {
    const speech = fakeSpeech("webSpeech", "can I see the menu please");
    const w = mount(SayItAloud, { props: { phrase: PHRASE } });
    await button(w, "Decirla en voz alta").trigger("click");
    expect(speech.start).toHaveBeenCalled();
    expect(w.text()).toContain("Te estoy escuchando");
    await button(w, "Listo").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Se entendió bien.");
  });
  it("si se oyó otra cosa, dice qué se entendió", async () => {
    fakeSpeech("webSpeech", "the menu");
    const w = mount(SayItAloud, { props: { phrase: PHRASE } });
    await button(w, "Decirla en voz alta").trigger("click");
    await button(w, "Listo").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Se entendió: “the menu”. Inténtalo otra vez.");
  });
  it("con el teclado se dicta en un cuadro de texto y se revisa", async () => {
    fakeSpeech("keyboardDictation");
    const w = mount(SayItAloud, { props: { phrase: PHRASE } });
    await button(w, "Decirla en voz alta").trigger("click");
    expect(w.text()).toContain(
      "Toca el micrófono del teclado y dila en inglés.",
    );
    await w.get("textarea").setValue("Can I see the menu, please?");
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Se entendió bien.");
  });
  it("sin permiso de micrófono avisa y deja escribir", async () => {
    const speech = fakeSpeech("webSpeech");
    const w = mount(SayItAloud, { props: { phrase: PHRASE } });
    await button(w, "Decirla en voz alta").trigger("click");
    speech.error.value = "permiso";
    speech.listening.value = false;
    await flushPromises();
    expect(w.text()).toContain("Falta permiso para el micrófono");
    await button(w, "Escribir mientras tanto").trigger("click");
    expect(speech.useKeyboard).toHaveBeenCalled();
    expect(w.find("textarea").exists()).toBe(true);
  });
});
