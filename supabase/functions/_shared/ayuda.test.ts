import { describe, expect, it } from "vitest";
import {
  ayudaFor,
  conversationStats,
  lessHelp,
  moreHelp,
  nextAyuda,
} from "./ayuda.ts";
import type { PersonajeTurn, Turn } from "./sessionTypes.ts";

const personaje = (over: Partial<PersonajeTurn> = {}): PersonajeTurn => ({
  quien: "personaje",
  en: "Anything else?",
  es: "¿Algo más?",
  sugerencias: [
    { en: "Yes, please.", es: "Sí, por favor." },
    { en: "No, thanks.", es: "No, gracias." },
  ],
  correccion: null,
  terminada: false,
  ...over,
});
const fix = {
  original: "x",
  mejor: "y",
  mejor_es: "z",
  nota: "",
  guardada: true,
};

describe("nivel de ayuda", () => {
  it("sin ajuste todavía, depende del nivel", () => {
    expect(ayudaFor("L0", null)).toBe("guiada");
    expect(ayudaFor("A1", null)).toBe("guiada");
    expect(ayudaFor("A2", null)).toBe("con_ayuda");
    expect(ayudaFor("B1", null)).toBe("libre");
    expect(ayudaFor("B1", "guiada")).toBe("guiada");
  });
  it("sube y baja de a un paso, sin pasarse", () => {
    expect(moreHelp("libre")).toBe("con_ayuda");
    expect(moreHelp("guiada")).toBe("guiada");
    expect(lessHelp("guiada")).toBe("con_ayuda");
    expect(lessHelp("libre")).toBe("libre");
  });
  it("cuenta mensajes, correcciones y los que fueron una sugerencia", () => {
    const transcript: Turn[] = [
      personaje(),
      { quien: "persona", texto: "yes please" },
      personaje({ correccion: null }),
      { quien: "persona", texto: "I want a coke" },
      personaje({ correccion: fix, terminada: true }),
    ];
    expect(conversationStats(transcript)).toEqual({
      spoke: 2,
      corrected: 1,
      fromSuggestions: 1,
      finished: true,
    });
  });
  it("si le costó, la siguiente tiene más ayuda", () => {
    expect(
      nextAyuda("libre", {
        spoke: 4,
        corrected: 2,
        fromSuggestions: 0,
        finished: true,
      }),
    ).toEqual({ ayuda: "con_ayuda", struggled: true });
    expect(
      nextAyuda("con_ayuda", {
        spoke: 0,
        corrected: 0,
        fromSuggestions: 0,
        finished: false,
      }),
    ).toEqual({ ayuda: "guiada", struggled: true });
  });
  it("si le salió bien con sus palabras, la siguiente tiene menos ayuda", () => {
    expect(
      nextAyuda("con_ayuda", {
        spoke: 4,
        corrected: 1,
        fromSuggestions: 1,
        finished: false,
      }),
    ).toEqual({ ayuda: "libre", struggled: false });
  });
  it("en guiada, sube cuando llega al final de la escena", () => {
    const base = { spoke: 4, corrected: 0, fromSuggestions: 4 };
    expect(nextAyuda("guiada", { ...base, finished: true }).ayuda).toBe(
      "con_ayuda",
    );
    expect(nextAyuda("guiada", { ...base, finished: false }).ayuda).toBe(
      "guiada",
    );
  });
  it("con ayuda, si casi todo fue sugerencias, se queda igual", () => {
    expect(
      nextAyuda("con_ayuda", {
        spoke: 4,
        corrected: 0,
        fromSuggestions: 3,
        finished: true,
      }),
    ).toEqual({ ayuda: "con_ayuda", struggled: false });
  });
});
