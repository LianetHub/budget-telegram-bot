import { describe, expect, it } from "vitest";
import {
  formatAmount,
  parseAmountInput,
  parseExpenseText,
} from "../src/services/expenseParser.js";

describe("parseExpenseText", () => {
  it("reads a category and an amount", () => {
    expect(parseExpenseText("комиксы 2800")).toEqual({
      label: "комиксы",
      amount: 280_000,
    });
    expect(parseExpenseText("Продукты - 1500")).toEqual({
      label: "Продукты",
      amount: 150_000,
    });
    expect(parseExpenseText("Кофе 150,50")).toEqual({
      label: "Кофе",
      amount: 15_050,
    });
  });

  it("rejects text without an amount", () => {
    expect(parseExpenseText("")).toBeNull();
    expect(parseExpenseText("/start")).toBeNull();
    expect(parseExpenseText("просто слова")).toBeNull();
  });
});

describe("parseAmountInput", () => {
  it("reads an amount and an optional note", () => {
    expect(parseAmountInput("2800")).toEqual({ amount: 280_000, note: null });
    expect(parseAmountInput("1500,50 хлеб")).toEqual({
      amount: 150_050,
      note: "хлеб",
    });
    expect(parseAmountInput("2800 комиксы")).toEqual({
      amount: 280_000,
      note: "комиксы",
    });
  });

  it("rejects a line that starts with words", () => {
    expect(parseAmountInput("комиксы 2800")).toBeNull();
  });
});

describe("formatAmount", () => {
  it("prints rubles and kopecks", () => {
    expect(formatAmount(150_000)).toMatch(/^1[\s\u00a0\u202f]500 ₽$/u);
    expect(formatAmount(150_050)).toMatch(/^1[\s\u00a0\u202f]500,50 ₽$/u);
  });
});
