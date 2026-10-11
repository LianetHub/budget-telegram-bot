import { describe, expect, it } from "vitest";
import {
  getCategoryByName,
  resolveCategory,
} from "../src/services/categories.js";

describe("resolveCategory", () => {
  it("keeps a category name without a note", () => {
    const resolved = resolveCategory("Продукты");
    expect(resolved?.category.name).toBe("Продукты");
    expect(resolved?.note).toBeNull();
  });

  it("maps a detail word to its category and keeps the word", () => {
    const resolved = resolveCategory("комиксы");
    expect(resolved?.category.name).toBe("Развлечения");
    expect(resolved?.note).toBe("комиксы");
  });

  it("keeps a longer detail phrase as the note", () => {
    const resolved = resolveCategory("Комиксы марвел");
    expect(resolved?.category.name).toBe("Развлечения");
    expect(resolved?.note).toBe("Комиксы марвел");
  });

  it("does not invent a category for an unknown word", () => {
    expect(resolveCategory("левая штука")).toBeNull();
  });

  it("does not confuse coffee with a cafe", () => {
    expect(resolveCategory("кофе")?.category.name).toBe("Кофе");
    expect(resolveCategory("кафе")?.category.name).toBe("Кафе и рестораны");
    const withNote = resolveCategory("кофе с собой");
    expect(withNote?.category.name).toBe("Кофе");
    expect(withNote?.note).toBe("с собой");
  });

  it("keeps the original case of the note after a category name", () => {
    const resolved = resolveCategory("Продукты Хлеб Бородинский");
    expect(resolved?.category.name).toBe("Продукты");
    expect(resolved?.note).toBe("Хлеб Бородинский");
  });
});

describe("getCategoryByName", () => {
  it("maps a stored category name to its slug", () => {
    expect(getCategoryByName("Продукты")?.slug).toBe("products");
    expect(getCategoryByName("нет такой")).toBeUndefined();
  });
});
