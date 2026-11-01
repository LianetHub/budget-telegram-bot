import { Markup } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import { CATEGORIES } from "../services/categories.js";
import { styledCallback } from "./buttonStyle.js";
import { clip } from "./format.js";

export const CALLBACK = {
  MAIN: "nav:main",
  STATS: "nav:stats",
  ADD: "nav:add",
  TODAY: "st:today",
  MONTH: "st:month",
  ALL: "st:all",
  MONTHS: "st:months",
  CATEGORIES: "st:cats",
  PEOPLE: "st:people",
  WHEN_TODAY: "when:today",
  WHEN_PICK: "when:pick",
  WHEN_BACK: "when:back",
  DUP_YES: "cd:y",
  DUP_NO: "cd:n",
} as const;

export const MONTH_BUTTON_LIMIT = 96;

export function mainMenuKeyboard(hasExpenses: boolean) {
  const add = Markup.button.callback("➕ Добавить трату", CALLBACK.ADD);
  if (!hasExpenses) {
    return Markup.inlineKeyboard([[add]]);
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Статистика", CALLBACK.STATS)],
    [add],
  ]);
}

export function statsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📅 Сегодня", CALLBACK.TODAY),
      Markup.button.callback("🗓️ Месяц", CALLBACK.MONTH),
      Markup.button.callback("♾️ Всё время", CALLBACK.ALL),
    ],
    [
      Markup.button.callback("📋 По месяцам", CALLBACK.MONTHS),
      Markup.button.callback("🏷️ Категории", CALLBACK.CATEGORIES),
      Markup.button.callback("👥 Кто потратил", CALLBACK.PEOPLE),
    ],
    [Markup.button.callback("← Назад", CALLBACK.MAIN)],
  ]);
}

export function backKeyboard(callbackData: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("← Назад", callbackData)],
  ]);
}

export function categoryKeyboard(backCallback = CALLBACK.MAIN) {
  const rows: InlineKeyboardButton[][] = [];
  for (let index = 0; index < CATEGORIES.length; index += 3) {
    rows.push(
      CATEGORIES.slice(index, index + 3).map((category) =>
        Markup.button.callback(
          `${category.emoji} ${category.name}`,
          `add:${category.slug}`,
        ),
      ),
    );
  }
  rows.push([Markup.button.callback("← Назад", backCallback)]);
  return Markup.inlineKeyboard(rows);
}

export function editCategoryKeyboard(expenseId: string) {
  const rows: InlineKeyboardButton[][] = [];
  for (let index = 0; index < CATEGORIES.length; index += 3) {
    rows.push(
      CATEGORIES.slice(index, index + 3).map((category) =>
        Markup.button.callback(
          `${category.emoji} ${category.name}`,
          `ex:catset:${expenseId}:${category.slug}`,
        ),
      ),
    );
  }
  rows.push([Markup.button.callback("← Назад", `ex:${expenseId}`)]);
  return Markup.inlineKeyboard(rows);
}

export function whenKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Сегодня", CALLBACK.WHEN_TODAY),
      Markup.button.callback("Выбрать дату", CALLBACK.WHEN_PICK),
    ],
    [Markup.button.callback("← Назад", CALLBACK.WHEN_BACK)],
  ]);
}

export function monthListKeyboard(months: { key: string; label: string }[]) {
  const rows = months.map((month) => [
    Markup.button.callback(clip(month.label, 60), `mo:${month.key}`),
  ]);
  rows.push([Markup.button.callback("← Назад", CALLBACK.STATS)]);
  return Markup.inlineKeyboard(rows);
}

export const RETRY_PREFIX = "rt:";

export function retryKeyboard(id: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔄 Повторить", `${RETRY_PREFIX}${id}`)],
  ]);
}

export function deleteConfirmKeyboard(id: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Да", `ex:dy:${id}`),
      Markup.button.callback("Нет", `ex:dn:${id}`),
    ],
  ]);
}

export function dupConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Да, добавить", CALLBACK.DUP_YES),
      Markup.button.callback("Нет", CALLBACK.DUP_NO),
    ],
  ]);
}

export function categoryStatsKeyboard(
  categories: { slug: string; label: string }[],
) {
  const rows = categories.map((category) => [
    Markup.button.callback(clip(category.label, 60), `st:cat:${category.slug}`),
  ]);
  rows.push([Markup.button.callback("← Назад", CALLBACK.STATS)]);
  return Markup.inlineKeyboard(rows);
}

export function monthDaysKeyboard(
  days: { key: string; label: string }[],
  backCallback: string,
) {
  const rows = days.map((day) => [
    Markup.button.callback(clip(day.label, 60), `st:day:${day.key}`),
  ]);
  rows.push([Markup.button.callback("← Назад", backCallback)]);
  return Markup.inlineKeyboard(rows);
}

export function dayExpensesKeyboard(
  expenses: { id: string; label: string }[],
  backCallback: string,
) {
  const rows = expenses.map((expense) => [
    Markup.button.callback(clip(expense.label, 60), `ex:${expense.id}`),
  ]);
  rows.push([Markup.button.callback("← Назад", backCallback)]);
  return Markup.inlineKeyboard(rows);
}

export function expenseCardKeyboard(expenseId: string, backCallback: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💰 Изменить сумму", `ex:amt:${expenseId}`)],
    [Markup.button.callback("🏷️ Изменить категорию", `ex:cat:${expenseId}`)],
    [Markup.button.callback("📝 Изменить заметку", `ex:note:${expenseId}`)],
    [Markup.button.callback("📅 Изменить дату", `ex:date:${expenseId}`)],
    [styledCallback("🗑 Удалить", `ex:del:${expenseId}`, "danger")],
    [Markup.button.callback("← Назад", backCallback)],
  ]);
}
