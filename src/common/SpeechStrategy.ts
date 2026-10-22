// Cómo habla la persona (spec 7: voz intercambiable, sin cambiar las pantallas).
// - webSpeech: el reconocimiento del navegador (Chrome o Edge de computadora y Android).
// - keyboardDictation: un cuadro de texto; en iPhone se dicta con el micrófono del teclado.
// En iOS el reconocimiento del navegador tiene errores abiertos (solo la primera vez por pestaña,
// se cuelga sin onend), así que ahí siempre va el teclado. A futuro: cloudStt, de paga.

export type SpeechStrategy = "webSpeech" | "keyboardDictation";

// El iPad se presenta como una Mac, pero con pantalla táctil
export function isIOSDevice(nav: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  return (
    /iPhone|iPad|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
  );
}

export function chooseSpeechStrategy(env: {
  hasRecognition: boolean;
  isIOS: boolean;
}): SpeechStrategy {
  return env.hasRecognition && !env.isIOS ? "webSpeech" : "keyboardDictation";
}
