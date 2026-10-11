import { Markup } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import { CATEGORIES } from "../services/categories.js";
import { clip } from "./format.js";

export const CALLBACK = {
  MAIN: "nav:main",
  STATS: "nav:stats",
  ADD: "nav:add",
  DELETE: "nav:del",
  TODAY: "st:today",
  MONTH: "st:month",
  ALL: "st:all",
  MONTHS: "st:months",
  CATEGORIES: "st:cats",
  PEOPLE: "st:people",
  DELETE_NO: "dn",
  DUP_YES: "cd:y",
  DUP_NO: "cd:n",
} as const;

export const RECENT_LIMIT = 6;
export const MONTH_BUTTON_LIMIT = 96;

export function mainMenuKeyboard(hasExpenses: boolean) {
  const add = Markup.button.callback("➕ Добавить трату", CALLBACK.ADD);
  if (!hasExpenses) {
    return Markup.inlineKeyboard([[add]]);
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Статистика", CALLBACK.STATS)],
    [add],
    [Markup.button.callback("🗑 Удалить запись", CALLBACK.DELETE)],
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

export function categoryKeyboard() {
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
  rows.push([Markup.button.callback("← Назад", CALLBACK.MAIN)]);
  return Markup.inlineKeyboard(rows);
}

export function monthListKeyboard(months: { key: string; label: string }[]) {
  const rows = months.map((month) => [
    Markup.button.callback(clip(month.label, 60), `mo:${month.key}`),
  ]);
  rows.push([Markup.button.callback("← Назад", CALLBACK.STATS)]);
  return Markup.inlineKeyboard(rows);
}

export function deleteListKeyboard(items: { id: string; label: string }[]) {
  const rows = items.map((item) => [
    Markup.button.callback(clip(item.label, 60), `dx:${item.id}`),
  ]);
  rows.push([Markup.button.callback("← Назад", CALLBACK.MAIN)]);
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
      Markup.button.callback("Да", `dy:${id}`),
      Markup.button.callback("Нет", CALLBACK.DELETE_NO),
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
