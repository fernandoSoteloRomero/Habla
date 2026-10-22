import { describe, expect, it } from "vitest";
import { addDays, localDate, localDayStart, weekStart } from "./Dates";

describe("fechas locales", () => {
  it("localDate usa la fecha del teléfono, no la de UTC", () => {
    expect(localDate(new Date(2026, 9, 22, 23, 59))).toBe("2026-10-22");
    expect(localDate(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
  it("addDays cruza meses, años y febrero", () => {
    expect(addDays("2026-10-22", 1)).toBe("2026-10-23");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
    expect(addDays("2026-10-22", 25)).toBe("2026-11-16");
  });
  it("weekStart da el lunes de esa semana", () => {
    expect(weekStart("2026-10-22")).toBe("2026-10-19"); // jueves
    expect(weekStart("2026-10-19")).toBe("2026-10-19"); // lunes
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // domingo
    expect(weekStart("2027-01-01")).toBe("2026-12-28"); // cruza el año
  });
  it("localDayStart es la medianoche local de ese día", () => {
    const start = new Date(localDayStart("2026-10-22"));
    expect(localDate(start)).toBe("2026-10-22");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(localDayStart("2026-10-22")).toBe(
      new Date(2026, 9, 22).toISOString(),
    );
  });
});
