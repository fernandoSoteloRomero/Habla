import { describe, expect, it } from "vitest";
import { chooseSpeechStrategy, isIOSDevice } from "./SpeechStrategy";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15";

describe("estrategia de voz", () => {
  it("detecta iPhone y iPad (que se presenta como Mac con pantalla táctil)", () => {
    expect(
      isIOSDevice({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5 }),
    ).toBe(true);
    expect(
      isIOSDevice({ userAgent: MAC, platform: "MacIntel", maxTouchPoints: 5 }),
    ).toBe(true);
  });
  it("Android, Windows y una Mac sin pantalla táctil no son iOS", () => {
    expect(
      isIOSDevice({ userAgent: ANDROID, platform: "Linux", maxTouchPoints: 5 }),
    ).toBe(false);
    expect(
      isIOSDevice({ userAgent: WINDOWS, platform: "Win32", maxTouchPoints: 0 }),
    ).toBe(false);
    expect(
      isIOSDevice({ userAgent: MAC, platform: "MacIntel", maxTouchPoints: 0 }),
    ).toBe(false);
  });
  it("usa el reconocimiento del navegador solo si existe y no es iOS", () => {
    expect(chooseSpeechStrategy({ hasRecognition: true, isIOS: false })).toBe(
      "webSpeech",
    );
    expect(chooseSpeechStrategy({ hasRecognition: true, isIOS: true })).toBe(
      "keyboardDictation",
    );
    expect(chooseSpeechStrategy({ hasRecognition: false, isIOS: false })).toBe(
      "keyboardDictation",
    );
    expect(chooseSpeechStrategy({ hasRecognition: false, isIOS: true })).toBe(
      "keyboardDictation",
    );
  });
});
