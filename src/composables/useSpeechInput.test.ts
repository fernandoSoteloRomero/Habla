import { effectScope } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "./useSpeechInput";

// Reconocimiento falso: guarda la última instancia para disparar sus eventos
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = "";
  interimResults = false;
  continuous = true;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
  // results como los manda el navegador: [[{ transcript }], isFinal]
  emit(parts: { text: string; final: boolean }[]): void {
    const results = parts.map((p) =>
      Object.assign([{ transcript: p.text }], { isFinal: p.final }),
    );
    this.onresult?.({ resultIndex: 0, results });
  }
}

const win = window as unknown as Record<string, unknown>;

function setup(): ReturnType<typeof useSpeechInput> {
  const scope = effectScope();
  return scope.run(() => useSpeechInput()) as ReturnType<typeof useSpeechInput>;
}

describe("useSpeechInput", () => {
  beforeEach(() => {
    win.webkitSpeechRecognition = FakeRecognition;
    FakeRecognition.last = null;
  });
  afterEach(() => {
    delete win.webkitSpeechRecognition;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("en Chrome escucha en inglés y muestra lo que va entendiendo", async () => {
    const speech = setup();
    expect(speech.strategy.value).toBe("webSpeech");
    speech.start();
    const r = FakeRecognition.last;
    expect(r?.start).toHaveBeenCalled();
    expect(r?.lang).toBe("en-US");
    expect(r?.interimResults).toBe(true);
    expect(speech.listening.value).toBe(true);

    r?.emit([{ text: "Yes please and", final: false }]);
    expect(speech.interim.value).toBe("Yes please and");

    const done = speech.stop();
    r?.emit([{ text: "Yes, please. And a coke.", final: true }]);
    r?.onend?.();
    expect(await done).toBe("Yes, please. And a coke.");
    expect(speech.listening.value).toBe(false);
  });
  it("sin permiso de micrófono avisa y pasa a escribir", () => {
    const speech = setup();
    speech.start();
    FakeRecognition.last?.onerror?.({ error: "not-allowed" });
    FakeRecognition.last?.onend?.();
    expect(speech.error.value).toBe("permiso");
    expect(speech.strategy.value).toBe("keyboardDictation");
  });
  it("si el navegador nunca avisa que terminó, se rescata a los 8 segundos", async () => {
    vi.useFakeTimers();
    const speech = setup();
    speech.start();
    const r = FakeRecognition.last;
    r?.emit([{ text: "Hello there", final: false }]);
    const done = speech.stop();
    vi.advanceTimersByTime(8000);
    expect(await done).toBe("Hello there");
    expect(r?.abort).toHaveBeenCalled();
  });
  it("sin reconocimiento usa el dictado del teclado", () => {
    delete win.webkitSpeechRecognition;
    expect(setup().strategy.value).toBe("keyboardDictation");
  });
  it("en iPhone usa el dictado del teclado aunque exista el reconocimiento", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(setup().strategy.value).toBe("keyboardDictation");
  });
  it("'Prefiero escribir' cambia al teclado", () => {
    const speech = setup();
    speech.useKeyboard();
    expect(speech.strategy.value).toBe("keyboardDictation");
  });
});
