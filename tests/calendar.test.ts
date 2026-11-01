import { describe, expect, it } from "vitest";
import { calendarKeyboard } from "../src/bot/calendar.js";

describe("calendarKeyboard", () => {
  it("builds one month and keeps callbacks short", () => {
    const { keyboard, year, month } = calendarKeyboard({
      year: 2026,
      month: 11,
      timeZone: "Europe/Moscow",
      minDate: new Date("2026-10-01T00:00:00.000Z"),
      maxDate: new Date("2026-11-01T12:00:00.000Z"),
      backCallback: "when:back",
    });
    expect(year).toBe(2026);
    expect(month).toBe(11);
    const data = keyboard.reply_markup.inline_keyboard.flatMap((row) =>
      row.flatMap((button) =>
        "callback_data" in button && button.callback_data
          ? [button.callback_data]
          : [],
      ),
    );
    expect(data).toContain("cal:day:2026-11-01");
    expect(data).toContain("cal:nav:2026-10");
    expect(data).toContain("when:back");
    for (const item of data) {
      expect(Buffer.byteLength(item, "utf8")).toBeLessThanOrEqual(64);
    }
  });

  it("hides days outside the allowed range", () => {
    const { keyboard } = calendarKeyboard({
      year: 2026,
      month: 11,
      timeZone: "Europe/Moscow",
      minDate: new Date("2026-11-01T00:00:00.000Z"),
      maxDate: new Date("2026-11-01T12:00:00.000Z"),
      backCallback: "when:back",
    });
    const labels = keyboard.reply_markup.inline_keyboard.flatMap((row) =>
      row.flatMap((button) => ("text" in button ? [button.text] : [])),
    );
    expect(labels).toContain("1");
    expect(labels).not.toContain("2");
  });
});
