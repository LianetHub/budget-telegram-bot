import { describe, expect, it } from "vitest";
import { matchesSimilarExpenseToday } from "../src/services/similarExpense.js";

const range = {
  from: new Date("2026-04-01T00:00:00.000Z"),
  to: new Date("2026-04-02T00:00:00.000Z"),
};

describe("matchesSimilarExpenseToday", () => {
  it("flags another person's same category and amount today", () => {
    expect(
      matchesSimilarExpenseToday(
        {
          category: "Продукты",
          amount: 150_000,
          telegramId: 2n,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        {
          category: "Продукты",
          amount: 150_000,
          excludeTelegramId: 1,
          range,
        },
      ),
    ).toBe(true);
  });

  it("ignores the current user's own earlier entry", () => {
    expect(
      matchesSimilarExpenseToday(
        {
          category: "Продукты",
          amount: 150_000,
          telegramId: 1n,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        {
          category: "Продукты",
          amount: 150_000,
          excludeTelegramId: 1,
          range,
        },
      ),
    ).toBe(false);
  });

  it("ignores a different amount or category", () => {
    expect(
      matchesSimilarExpenseToday(
        {
          category: "Продукты",
          amount: 100_000,
          telegramId: 2n,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        {
          category: "Продукты",
          amount: 150_000,
          excludeTelegramId: 1,
          range,
        },
      ),
    ).toBe(false);

    expect(
      matchesSimilarExpenseToday(
        {
          category: "Такси",
          amount: 150_000,
          telegramId: 2n,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        {
          category: "Продукты",
          amount: 150_000,
          excludeTelegramId: 1,
          range,
        },
      ),
    ).toBe(false);
  });
});
