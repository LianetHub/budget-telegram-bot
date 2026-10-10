import { formatAmount } from "../services/expenseParser.js";

const TEXT_LIMIT = 3900;

export function expenseSummary(expense: {
  category: string;
  amount: number;
  note: string | null;
}): string {
  const note = expense.note ? ` (${clip(expense.note, 80)})` : "";
  return `${expense.category} — ${formatAmount(expense.amount)}${note}`;
}

export const BUTTON_LABEL_LIMIT = 60;

/**
 * Button text for one expense: category and amount first, then the note, then
 * the date. Telegram cuts long labels from the end, so the date goes last and
 * the note is the first thing to shrink.
 */
export function expenseButtonLabel(
  expense: { category: string; amount: number; note: string | null },
  stamp: string,
  max = BUTTON_LABEL_LIMIT,
): string {
  const core = `${expense.category} · ${formatAmount(expense.amount)}`;
  const tail = ` · ${stamp}`;
  const noteSpace = max - core.length - tail.length - " · ".length;
  if (!expense.note || noteSpace < 4) return clip(`${core}${tail}`, max);
  return `${core} · ${clip(expense.note, noteSpace)}${tail}`;
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function recordsCount(count: number): string {
  return `${count} ${plural(count, "запись", "записи", "записей")}`;
}

export function monthsCount(count: number): string {
  return `${count} ${plural(count, "месяц", "месяца", "месяцев")}`;
}

export function share(part: number, total: number): string {
  if (total <= 0) return "0%";
  const percent = Math.round((part * 100) / total);
  if (percent === 0 && part > 0) return "<1%";
  return `${percent}%`;
}

export function fitLines(
  header: string,
  lines: string[],
  footer?: string,
): string {
  for (let hiddenOldest = 0; hiddenOldest <= lines.length; hiddenOldest += 1) {
    const visible = lines.slice(hiddenOldest);
    const notice =
      hiddenOldest > 0 ? `… и ещё ${recordsCount(hiddenOldest)} раньше` : null;
    const text = [
      header,
      "",
      ...visible,
      notice,
      footer ? "" : null,
      footer ?? null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
    if (text.length <= TEXT_LIMIT) return text;
  }

  return clip(header, TEXT_LIMIT);
}
