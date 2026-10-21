import { describe, expect, it } from "vitest";
import { getStationState } from "./StationStates";

describe("getStationState", () => {
  it("lo anterior está logrado, lo actual es aquí y lo siguiente es próximo", () => {
    expect(getStationState("a2-trabajo", "a2-restaurante")).toBe("lograda");
    expect(getStationState("a2-restaurante", "a2-restaurante")).toBe("aqui");
    expect(getStationState("a2-direcciones", "a2-restaurante")).toBe("proxima");
  });
  it("los niveles anteriores cuentan como logrados", () => {
    expect(getStationState("l0-saludar", "a1-quien-eres")).toBe("lograda");
    expect(getStationState("b1-viaje", "a1-quien-eres")).toBe("proxima");
  });
});
