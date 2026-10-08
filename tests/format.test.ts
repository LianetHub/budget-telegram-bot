import { describe, expect, it } from "vitest";
import {
  expenseSummary,
  fitLines,
  plural,
  recordsCount,
  share,
} from "../src/bot/format.js";
import { formatAmount } from "../src/services/expenseParser.js";

describe("expenseSummary", () => {
  it("appends a note in parentheses", () => {
    expect(
      expenseSummary({
        category: "Развлечения",
        amount: 280_000,
        note: "комиксы",
      }),
    ).toBe(`Развлечения — ${formatAmount(280_000)} (комиксы)`);
  });
});

describe("plural", () => {
  it("picks the Russian form by the number", () => {
    const forms = ["запись", "записи", "записей"] as const;
    expect(plural(1, ...forms)).toBe("запись");
    expect(plural(2, ...forms)).toBe("записи");
    expect(plural(5, ...forms)).toBe("записей");
    expect(plural(11, ...forms)).toBe("записей");
    expect(plural(12, ...forms)).toBe("записей");
    expect(plural(21, ...forms)).toBe("запись");
    expect(plural(22, ...forms)).toBe("записи");
    expect(plural(0, ...forms)).toBe("записей");
    expect(recordsCount(3)).toBe("3 записи");
  });
});

describe("share", () => {
  it("rounds the percentage and marks tiny shares", () => {
    expect(share(1, 3)).toBe("33%");
    expect(share(1, 1000)).toBe("<1%");
    expect(share(0, 0)).toBe("0%");
  });
});

describe("fitLines", () => {
  it("drops the oldest lines when the message is too long", () => {
    const lines = Array.from({ length: 40 }, () => "строка ".repeat(30));
    const text = fitLines("Заголовок", lines, "Итог");
    expect(text.length).toBeLessThanOrEqual(3900);
    expect(text.startsWith("Заголовок")).toBe(true);
    expect(text.endsWith("Итог")).toBe(true);
    expect(text).toMatch(/… и ещё \d+ запис(?:ь|и|ей) раньше/u);
  });

  it("keeps a short message intact", () => {
    expect(fitLines("Заголовок", ["одна"], "Итог")).toBe(
      "Заголовок\n\nодна\n\nИтог",
    );
  });
});
