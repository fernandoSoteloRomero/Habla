import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { useSpeechInput } from "@/composables/useSpeechInput";
import ChatInput from "./ChatInput.vue";

enableAutoUnmount(afterEach);

function fakeSpeech(
  strategy: "webSpeech" | "keyboardDictation",
  heard = "",
): ReturnType<typeof useSpeechInput> {
  const listening = ref(false);
  const strat = ref(strategy);
  const error = ref<"" | "permiso" | "fallo">("");
  return {
    strategy: strat,
    listening,
    interim: ref(""),
    error,
    start: vi.fn(() => {
      listening.value = true;
    }),
    stop: vi.fn(async () => {
      listening.value = false;
      return heard;
    }),
    cancel: vi.fn(),
    useKeyboard: vi.fn(() => {
      strat.value = "keyboardDictation";
      error.value = "";
    }),
  };
}

describe("ChatInput", () => {
  it("con el teclado escribe y manda con el botón rosa", async () => {
    const w = mount(ChatInput, {
      props: {
        modelValue: "",
        disabled: false,
        speech: fakeSpeech("keyboardDictation"),
      },
    });
    const box = w.get("textarea");
    expect(box.attributes("placeholder")).toBe("Toca y dicta con el teclado");
    expect(box.attributes("lang")).toBe("en");
    expect(box.attributes("maxlength")).toBe("300");
    expect(w.get('button[aria-label="Enviar"]').attributes()).toHaveProperty(
      "disabled",
    );
    await box.setValue("A coke, please.");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["A coke, please."]);
    await w.setProps({ modelValue: "A coke, please." });
    await w.get('button[aria-label="Enviar"]').trigger("click");
    expect(w.emitted("send")).toEqual([["A coke, please."]]);
  });
  it("con el micrófono: presionar escucha y soltar muestra lo que se entendió", async () => {
    const speech = fakeSpeech("webSpeech", "Yes, please.");
    const w = mount(ChatInput, {
      props: { modelValue: "", disabled: false, speech },
    });
    expect(w.text()).toContain("Mantén presionado mientras hablas");
    const mic = w.get('button[aria-label="Mantén presionado para hablar"]');
    await mic.trigger("pointerdown");
    expect(speech.start).toHaveBeenCalled();
    expect(w.text()).toContain("Te estoy escuchando");
    await mic.trigger("pointerup");
    await flushPromises();
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["Yes, please."]);

    await w.setProps({ modelValue: "Yes, please." });
    const buttons = w.findAll("button").map((b) => b.text());
    expect(buttons).toContain("Enviar");
    expect(buttons).toContain("Otra vez");
    await w
      .findAll("button")
      .find((b) => b.text() === "Enviar")
      ?.trigger("click");
    expect(w.emitted("send")).toEqual([["Yes, please."]]);
  });
  it("'Prefiero escribir' cambia al teclado", async () => {
    const speech = fakeSpeech("webSpeech");
    const w = mount(ChatInput, {
      props: { modelValue: "", disabled: false, speech },
    });
    await w
      .findAll("button")
      .find((b) => b.text() === "Prefiero escribir")
      ?.trigger("click");
    expect(speech.useKeyboard).toHaveBeenCalled();
    expect(w.find("textarea").exists()).toBe(true);
  });
  it("sin permiso de micrófono avisa con la placa azul", async () => {
    const speech = fakeSpeech("keyboardDictation");
    speech.error.value = "permiso";
    const w = mount(ChatInput, {
      props: { modelValue: "", disabled: false, speech },
    });
    expect(w.text()).toContain("Falta permiso para el micrófono");
    await w
      .findAll("button")
      .find((b) => b.text() === "Escribir mientras tanto")
      ?.trigger("click");
    expect(speech.useKeyboard).toHaveBeenCalled();
  });
});
