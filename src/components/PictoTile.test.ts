import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PictoTile from "./PictoTile.vue";

describe("PictoTile", () => {
  it("usa el símbolo del sprite", () => {
    const w = mount(PictoTile, { props: { name: "food" } });
    expect(w.find("use").attributes("href")).toBe("#i-food");
  });
  it("aplica tamaño chico y fondo azul", () => {
    const w = mount(PictoTile, {
      props: { name: "work", size: "sm", bg: "l1" },
    });
    expect(w.classes()).toEqual(
      expect.arrayContaining(["size-[30px]", "rounded-[7px]", "bg-l1"]),
    );
  });
  it("por defecto es mediano y negro", () => {
    const w = mount(PictoTile, { props: { name: "hand" } });
    expect(w.classes()).toEqual(
      expect.arrayContaining(["size-10", "rounded-[9px]", "bg-ink"]),
    );
  });
  it("sobre naranja (B1) el pictograma va en negro, no en blanco", () => {
    const w = mount(PictoTile, { props: { name: "plane", bg: "l3" } });
    expect(w.find("svg").classes()).toContain("fill-ink");
    expect(w.find("svg").classes()).not.toContain("fill-white");
  });
});
