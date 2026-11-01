import { describe, expect, it } from "vitest";
import {
  dayRange,
  monthRange,
  parseDayKey,
  todayRange,
  zonedDayKey,
} from "../src/services/dates.js";

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

describe("dayRange", () => {
  it("covers one Moscow calendar day from midnight to midnight", () => {
    const range = dayRange(2026, 10, 8, "Europe/Moscow");
    expect(range.from.toISOString()).toBe("2026-10-07T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-08T21:00:00.000Z");
  });

  it("uses the given time zone instead of the machine clock", () => {
    const range = dayRange(2026, 10, 7, "America/New_York");
    expect(range.from.toISOString()).toBe("2026-10-07T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-08T04:00:00.000Z");
  });
});

describe("parseDayKey", () => {
  it("reads a calendar day key", () => {
    expect(parseDayKey("2026-11-01")).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
  });

  it("rejects impossible calendar days", () => {
    expect(parseDayKey("2026-02-31")).toBeNull();
    expect(parseDayKey("2026-11")).toBeNull();
  });
});

describe("zonedDayKey", () => {
  it("formats the local calendar day", () => {
    expect(
      zonedDayKey(new Date("2026-10-07T21:30:00.000Z"), "Europe/Moscow"),
    ).toBe("2026-10-08");
  });
});

describe("monthRange", () => {
  it("covers October in Moscow from the first instant to the next month", () => {
    const range = monthRange(2026, 10, "Europe/Moscow");
    expect(range.from.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });
});
