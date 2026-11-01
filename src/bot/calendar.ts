import { Markup } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import {
  formatMonthTitle,
  parseDayKey,
  parseMonthKey,
  shiftMonth,
  zonedDayKey,
  zonedMonthKey,
} from "../services/dates.js";

const WEEKDAY_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday=0 … Sunday=6 for the 1st of the month. */
function mondayBasedWeekday(year: number, month: number): number {
  const sundayBased = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (sundayBased + 6) % 7;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dayKey(year: number, month: number, day: number): string {
  return `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
}

function clampMonthToRange(
  year: number,
  month: number,
  minMonth: string,
  maxMonth: string,
): { year: number; month: number } {
  const key = monthKey(year, month);
  if (key < minMonth) {
    return parseMonthKey(minMonth) ?? { year, month };
  }
  if (key > maxMonth) {
    return parseMonthKey(maxMonth) ?? { year, month };
  }
  return { year, month };
}

export function calendarKeyboard(input: {
  year: number;
  month: number;
  timeZone: string;
  minDate: Date;
  maxDate: Date;
  backCallback: string;
}) {
  const minKey = zonedDayKey(input.minDate, input.timeZone);
  const maxKey = zonedDayKey(input.maxDate, input.timeZone);
  const minMonth = minKey.slice(0, 7);
  const maxMonth = maxKey.slice(0, 7);
  const { year, month } = clampMonthToRange(
    input.year,
    input.month,
    minMonth,
    maxMonth,
  );

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const prevKey = monthKey(prev.year, prev.month);
  const nextKey = monthKey(next.year, next.month);

  const rows: InlineKeyboardButton[][] = [];
  rows.push([
    Markup.button.callback(
      formatMonthTitle(year, month, input.timeZone),
      "cal:noop",
    ),
  ]);
  rows.push(
    WEEKDAY_LABELS.map((label) => Markup.button.callback(label, "cal:noop")),
  );

  const totalDays = daysInMonth(year, month);
  const leading = mondayBasedWeekday(year, month);
  const cells: InlineKeyboardButton[] = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push(Markup.button.callback("·", "cal:noop"));
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const key = dayKey(year, month, day);
    if (key < minKey || key > maxKey) {
      cells.push(Markup.button.callback("·", "cal:noop"));
    } else {
      cells.push(Markup.button.callback(String(day), `cal:day:${key}`));
    }
  }
  while (cells.length % 7 !== 0) {
    cells.push(Markup.button.callback("·", "cal:noop"));
  }
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const nav: InlineKeyboardButton[] = [];
  nav.push(
    prevKey >= minMonth
      ? Markup.button.callback("‹", `cal:nav:${prevKey}`)
      : Markup.button.callback(" ", "cal:noop"),
  );
  nav.push(Markup.button.callback("Сегодня", `cal:day:${maxKey}`));
  nav.push(
    nextKey <= maxMonth
      ? Markup.button.callback("›", `cal:nav:${nextKey}`)
      : Markup.button.callback(" ", "cal:noop"),
  );
  rows.push(nav);
  rows.push([Markup.button.callback("← Назад", input.backCallback)]);

  return {
    keyboard: Markup.inlineKeyboard(rows),
    year,
    month,
  };
}

export function parseCalendarNav(
  key: string,
): { year: number; month: number } | null {
  return parseMonthKey(key);
}

export function parseCalendarDay(key: string) {
  return parseDayKey(key);
}

export function initialCalendarMonth(
  timeZone: string,
  maxDate = new Date(),
): { year: number; month: number } {
  const key = zonedMonthKey(maxDate, timeZone);
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error("Unable to read calendar month");
  return parsed;
}
