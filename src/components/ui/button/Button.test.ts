import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Button } from "./index";

describe("Button", () => {
  it("go es rosa y mide 52px", () => {
    const w = mount(Button, { slots: { default: "Empezar" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        "bg-rosa",
        "text-white",
        "min-h-[52px]",
        "rounded-[12px]",
      ]),
    );
  });
  it("line es blanco con borde negro", () => {
    const w = mount(Button, {
      props: { variant: "line" },
      slots: { default: "Google" },
    });
    expect(w.classes()).toEqual(
      expect.arrayContaining(["bg-white", "border-2", "border-ink"]),
    );
  });
  it("quiet es gris concreto", () => {
    const w = mount(Button, {
      props: { variant: "quiet" },
      slots: { default: "Ahora no" },
    });
    expect(w.classes()).toContain("bg-concrete");
  });
});
