import { describe, expect, it } from "vitest";
import { budgetMonthText } from "./BudgetMonth";

describe("budgetMonthText", () => {
  it("da el mes actual y el día en que vuelve el presupuesto", () => {
    expect(budgetMonthText(new Date(2026, 9, 21))).toEqual({
      mes: "octubre",
      siguiente: "1 de noviembre",
    });
  });
  it("en diciembre vuelve el 1 de enero", () => {
    expect(budgetMonthText(new Date(2026, 11, 5))).toEqual({
      mes: "diciembre",
      siguiente: "1 de enero",
    });
  });
});
