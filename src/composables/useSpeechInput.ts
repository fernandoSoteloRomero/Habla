// Voz de entrada (spec 7: useSpeechInput). Elige la estrategia con SpeechStrategy:
// - webSpeech: se mantiene presionado el micrófono; start() al apretar y stop() al soltar.
//   Chrome manda el audio a Google (spec 11); a la app solo llega texto.
// - keyboardDictation: la pantalla muestra un cuadro de texto (dictado del teclado en iPhone).
// Si no hay permiso de micrófono, avisa y cambia sola a escribir.
import { getCurrentScope, onScopeDispose, ref } from "vue";
import type { Ref } from "vue";
import { chooseSpeechStrategy, isIOSDevice } from "@/common/SpeechStrategy";
import type { SpeechStrategy } from "@/common/SpeechStrategy";

// Lo que se usa de SpeechRecognition (Chrome lo tiene como webkitSpeechRecognition)
interface RecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

// Si el navegador no avisa que terminó (pasa en iOS y a veces en Chrome), se corta solo
const RESCUE_MS = 8000;

export function useSpeechInput(): {
  strategy: Ref<SpeechStrategy>;
  listening: Ref<boolean>;
  interim: Ref<string>;
  error: Ref<"" | "permiso" | "fallo">;
  start: () => void;
  stop: () => Promise<string>;
  cancel: () => void;
  useKeyboard: () => void;
} {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

  const strategy = ref<SpeechStrategy>(
    chooseSpeechStrategy({
      hasRecognition: !!Ctor,
      isIOS: isIOSDevice(navigator),
    }),
  );
  const listening = ref(false);
  const interim = ref("");
  const error = ref<"" | "permiso" | "fallo">("");

  let recognition: Recognition | null = null;
  let finalText = "";
  let resolveStop: ((text: string) => void) | null = null;
  let rescue: ReturnType<typeof setTimeout> | null = null;

  function finish(): void {
    if (rescue) clearTimeout(rescue);
    rescue = null;
    recognition = null;
    listening.value = false;
    const text = (finalText || interim.value).trim();
    interim.value = text;
    resolveStop?.(text);
    resolveStop = null;
  }

  function start(): void {
    if (!Ctor || strategy.value !== "webSpeech" || listening.value) return;
    error.value = "";
    interim.value = "";
    finalText = "";

    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    // Chrome Android lo ignora; se escucha mientras se mantiene presionado
    r.continuous = false;
    r.onresult = (e): void => {
      let all = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        all += text;
        if (e.results[i].isFinal) final += text;
      }
      interim.value = all.trim();
      if (final) finalText = final.trim();
    };
    r.onerror = (e): void => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        error.value = "permiso";
        strategy.value = "keyboardDictation";
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        error.value = "fallo";
      }
    };
    r.onend = finish;

    recognition = r;
    listening.value = true;
    try {
      r.start();
    } catch {
      recognition = null;
      listening.value = false;
      error.value = "fallo";
    }
  }

  // Lo que se entendió; si ya había terminado solo, regresa lo último que oyó
  function stop(): Promise<string> {
    const r = recognition;
    if (!r) return Promise.resolve(interim.value.trim());
    return new Promise((resolve) => {
      resolveStop = resolve;
      r.stop();
      rescue = setTimeout(() => {
        r.abort();
        finish();
      }, RESCUE_MS);
    });
  }

  // Antes de leer en voz alta: en iOS hablar mientras escucha mata el reconocimiento
  function cancel(): void {
    recognition?.abort();
    finish();
  }

  function useKeyboard(): void {
    cancel();
    error.value = "";
    strategy.value = "keyboardDictation";
  }

  if (getCurrentScope()) onScopeDispose(() => recognition?.abort());

  return {
    strategy,
    listening,
    interim,
    error,
    start,
    stop,
    cancel,
    useKeyboard,
  };
}
