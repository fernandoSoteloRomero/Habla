// Audio en inglés con la voz del navegador (spec 7: useSpeechOutput, normal o lento 0.8×).
// - Gratis: usa speechSynthesis; no manda nada a ningún servidor de la app.
// - Las voces se buscan al momento de hablar, porque getVoices() puede llegar vacío al principio.
// - Siempre se cancela lo anterior antes de hablar: así se recupera la cola atorada de iOS.
// - El primer speak() debe salir de un toque (iOS y Chrome lo exigen); los botones ya lo son.

const SLOW_RATE = 0.8;

export function useSpeechOutput(): {
  supported: boolean;
  speak: (text: string, slow?: boolean) => void;
} {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  function speak(text: string, slow = false): void {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = slow ? SLOW_RATE : 1;
    utterance.voice = voice;

    synth.cancel();
    synth.speak(utterance);
  }

  return { supported, speak };
}
