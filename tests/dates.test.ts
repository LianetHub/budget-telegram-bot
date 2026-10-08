import { describe, expect, it } from "vitest";
import { monthRange, todayRange } from "../src/services/dates.js";

describe("todayRange", () => {
  it("starts the Moscow day at 21:00 UTC", () => {
    const range = todayRange(
      "Europe/Moscow",
      new Date("2026-10-07T21:30:00.000Z"),
    );
    expect(range.from.toISOString()).toBe("2026-10-07T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-08T21:00:00.000Z");
  });

  it("uses the given time zone instead of the machine clock", () => {
    const range = todayRange(
      "America/New_York",
      new Date("2026-10-08T03:30:00.000Z"),
    );
    expect(range.from.toISOString()).toBe("2026-10-07T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-08T04:00:00.000Z");
  });
});

describe("monthRange", () => {
  it("covers October in Moscow from the first instant to the next month", () => {
    const range = monthRange(2026, 10, "Europe/Moscow");
    expect(range.from.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });
});
