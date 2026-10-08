import { describe, expect, it } from "vitest";
import * as copy from "../src/bot/copy.js";
import { CATEGORIES, getCategoryBySlug } from "../src/services/categories.js";

function allTexts(): string[] {
  const products = getCategoryBySlug("products");
  if (!products) throw new Error("products category is missing");
  return [
    copy.mainScreen(),
    copy.mainScreen("Лид", false),
    copy.startText("Анна", true),
    copy.startText("Анна", false),
    copy.PARSE_HELP,
    copy.amountPrompt(products),
    copy.amountHelp(products),
    copy.amountHelp(),
    copy.CATEGORY_PROMPT,
    copy.DELETE_PROMPT,
    copy.STALE_BUTTON,
    copy.EXPENSE_GONE,
    copy.FOREIGN_EXPENSE,
    copy.NO_OWN_EXPENSES,
    copy.ERROR_TEXT,
    copy.accessDeniedText(123),
    copy.accessDeniedText(undefined),
    copy.unknownCategoryPrompt("штука", "100 ₽"),
    copy.deleteConfirmText("детали"),
  ];
}

describe("copy", () => {
  it("talks to the user informally everywhere", () => {
    for (const text of allTexts()) {
      expect(text).not.toMatch(
        /(?:^|[^а-яё])(?:вы|вас|вам|ваш\p{L}*)(?![а-яё])/iu,
      );
    }
  });

  it("explains free words right in the start message", () => {
    const text = copy.startText("Анна", true);
    expect(text).toContain("«комиксы 2800» попадёт в «Развлечения»");
    expect(copy.mainScreen()).not.toContain("комиксы");
  });

  it("suggests a note that fits the chosen category", () => {
    for (const category of CATEGORIES) {
      const prompt = copy.amountPrompt(category);
      const detail = category.details[0];
      if (detail) {
        expect(prompt).toContain(`1500 ${detail}`);
      } else {
        expect(prompt).not.toContain("С пояснением");
      }
    }
    const products = getCategoryBySlug("products");
    expect(products && copy.amountPrompt(products)).not.toContain("комиксы");
  });

  it("shows the Telegram ID to a stranger", () => {
    expect(copy.accessDeniedText(42)).toContain("42");
  });
});
