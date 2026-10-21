import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "./useSpeechOutput";

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: { lang: string; name: string } | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeech(voices: { lang: string; name: string }[]): {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
} {
  const synth = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return synth;
}

const spokenWith = (speak: ReturnType<typeof vi.fn>): FakeUtterance =>
  speak.mock.calls[0][0] as FakeUtterance;

describe("useSpeechOutput", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("habla en inglés de EE. UU. a velocidad normal, cancelando lo anterior", () => {
    const synth = stubSpeech([
      { lang: "es-MX", name: "Paulina" },
      { lang: "en-US", name: "Samantha" },
    ]);
    const { supported, speak } = useSpeechOutput();
    expect(supported).toBe(true);
    speak("Good morning.");
    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak);
    const u = spokenWith(synth.speak);
    expect(u.text).toBe("Good morning.");
    expect(u.lang).toBe("en-US");
    expect(u.rate).toBe(1);
    expect(u.voice?.name).toBe("Samantha");
  });
  it("más lento es 0.6 (con 0.8 casi no se notaba en el teléfono)", () => {
    const synth = stubSpeech([{ lang: "en-US", name: "Samantha" }]);
    useSpeechOutput().speak("Good morning.", true);
    expect(spokenWith(synth.speak).rate).toBe(0.6);
  });
  it("sin voz en-US usa otra voz en inglés", () => {
    const synth = stubSpeech([
      { lang: "es-MX", name: "Paulina" },
      { lang: "en-GB", name: "Daniel" },
    ]);
    useSpeechOutput().speak("Hello");
    expect(spokenWith(synth.speak).voice?.name).toBe("Daniel");
  });
  it("sin ninguna voz en inglés habla solo con el idioma", () => {
    const synth = stubSpeech([{ lang: "es-MX", name: "Paulina" }]);
    const { supported, speak } = useSpeechOutput();
    expect(supported).toBe(true);
    speak("Hello");
    expect(spokenWith(synth.speak).voice).toBeNull();
    expect(spokenWith(synth.speak).lang).toBe("en-US");
  });
  it("sin speechSynthesis no hay audio y speak no truena", () => {
    const { supported, speak } = useSpeechOutput();
    expect(supported).toBe(false);
    expect(() => speak("Hello")).not.toThrow();
  });
});
