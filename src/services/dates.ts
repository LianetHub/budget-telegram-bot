import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ru } from "date-fns/locale";

export type DateRange = {
  from: Date;
  to: Date;
};

function zonedMidnight(day: string, timeZone: string): Date {
  return fromZonedTime(`${day}T00:00:00`, timeZone);
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/u.exec(value);
  if (!match?.[1] || !match[2]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function startOfZonedDay(date: Date, timeZone: string): Date {
  return zonedMidnight(
    formatInTimeZone(date, timeZone, "yyyy-MM-dd"),
    timeZone,
  );
}

export function addZonedDays(date: Date, days: number, timeZone: string): Date {
  const day = formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(day);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Unable to read calendar day: ${day}`);
  }
  const shifted = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return zonedMidnight(`${yyyy}-${mm}-${dd}`, timeZone);
}

export function todayRange(timeZone: string, now = new Date()): DateRange {
  const from = startOfZonedDay(now, timeZone);
  return { from, to: addZonedDays(from, 1, timeZone) };
}

export function monthRange(
  year: number,
  month: number,
  timeZone: string,
): DateRange {
  const mm = String(month).padStart(2, "0");
  const from = zonedMidnight(`${year}-${mm}-01`, timeZone);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMm = String(nextMonth).padStart(2, "0");
  return { from, to: zonedMidnight(`${nextYear}-${nextMm}-01`, timeZone) };
}

export function currentMonthParts(
  timeZone: string,
  now = new Date(),
): { year: number; month: number } {
  const parsed = parseYearMonth(formatInTimeZone(now, timeZone, "yyyy-MM"));
  if (!parsed) {
    throw new Error("Unable to read the current month");
  }
  return parsed;
}

export function currentMonthRange(
  timeZone: string,
  now = new Date(),
): DateRange {
  const { year, month } = currentMonthParts(timeZone, now);
  return monthRange(year, month, timeZone);
}

export function parseMonthKey(
  key: string,
): { year: number; month: number } | null {
  return parseYearMonth(key);
}

export function zonedMonthKey(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM");
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1);
}

export function formatDayTitle(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "d MMMM", { locale: ru });
}

export function formatMonthTitle(
  year: number,
  month: number,
  timeZone: string,
): string {
  const mm = String(month).padStart(2, "0");
  const anchor = fromZonedTime(`${year}-${mm}-15T12:00:00`, timeZone);
  return capitalize(
    formatInTimeZone(anchor, timeZone, "LLLL yyyy", { locale: ru }),
  );
}

export function formatClock(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

export function formatShortStamp(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "dd.MM.yy HH:mm");
}

export function formatLongStamp(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "d MMMM yyyy, HH:mm", { locale: ru });
}
