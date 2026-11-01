import type { Context } from "telegraf";
import { config } from "../config.js";
import {
  formatClock,
  formatDayTitle,
  zonedDayKey,
} from "../services/dates.js";
import { formatAmount } from "../services/expenseParser.js";
import {
  getNamedDayRange,
  getTodayRange,
  listExpenses,
} from "../services/statsService.js";
import { BUTTON_LABEL_LIMIT, clip, recordsCount } from "./format.js";
import { dayExpensesKeyboard, backKeyboard } from "./keyboards.js";
import { showScreen } from "./screen.js";

const EMPTY = "Записей нет.";

function totalsBlock(total: number, count: number): string {
  return `Сумма: ${formatAmount(total)} — ${recordsCount(count)}`;
}

function expenseButtonLabel(expense: {
  spentAt: Date;
  category: string;
  amount: number;
  note: string | null;
  user: { name: string };
}): string {
  const clock = formatClock(expense.spentAt, config.timezone);
  const note = expense.note ? ` · ${clip(expense.note, 20)}` : "";
  return clip(
    `${clock} · ${expense.category} · ${formatAmount(expense.amount)}${note}`,
    BUTTON_LABEL_LIMIT,
  );
}

export function dayBackCallback(spentAt: Date): string {
  return `st:day:${zonedDayKey(spentAt, config.timezone)}`;
}

export async function showDayScreen(
  ctx: Context,
  input: {
    year: number;
    month: number;
    day: number;
    title: string;
    emptyMessage: string;
    backCallback: string;
  },
): Promise<void> {
  const range = getNamedDayRange(input.year, input.month, input.day);
  const expenses = await listExpenses(range);
  if (expenses.length === 0) {
    await showScreen(
      ctx,
      `${input.title}\n\n${input.emptyMessage}`,
      backKeyboard(input.backCallback),
    );
    return;
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const text = [
    input.title,
    "",
    totalsBlock(total, expenses.length),
    "",
    "Нажми трату — изменить или удалить.",
  ].join("\n");

  await showScreen(
    ctx,
    text,
    dayExpensesKeyboard(
      expenses.map((expense) => ({
        id: expense.id,
        label: expenseButtonLabel(expense),
      })),
      input.backCallback,
    ),
  );
}

export async function showTodayScreen(
  ctx: Context,
  backCallback: string,
): Promise<void> {
  const now = new Date();
  const range = getTodayRange(now);
  const key = zonedDayKey(range.from, config.timezone);
  const [year, month, day] = key.split("-").map(Number);
  await showDayScreen(ctx, {
    year: year!,
    month: month!,
    day: day!,
    title: `Сегодня, ${formatDayTitle(now, config.timezone)}`,
    emptyMessage: "Сегодня трат ещё нет.",
    backCallback,
  });
}

export async function showNamedDayScreen(
  ctx: Context,
  year: number,
  month: number,
  day: number,
  backCallback: string,
): Promise<void> {
  const range = getNamedDayRange(year, month, day);
  await showDayScreen(ctx, {
    year,
    month,
    day,
    title: formatDayTitle(range.from, config.timezone),
    emptyMessage: EMPTY,
    backCallback,
  });
}
