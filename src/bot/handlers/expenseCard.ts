import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
import {
  getCategoryByName,
  getCategoryBySlug,
} from "../../services/categories.js";
import {
  combineZonedDayAndClock,
  formatLongStamp,
  parseDayKey,
  zonedDayKey,
} from "../../services/dates.js";
import {
  deleteExpense,
  getEarliestSpendDate,
  getExpenseById,
  updateExpense,
} from "../../services/expenseService.js";
import {
  formatAmount,
  parseAmountInput,
} from "../../services/expenseParser.js";
import { calendarKeyboard, initialCalendarMonth } from "../calendar.js";
import {
  CALENDAR_PROMPT,
  EDIT_AMOUNT_PROMPT,
  EDIT_NOTE_PROMPT,
  EXPENSE_GONE,
  STALE_BUTTON,
  deleteConfirmText,
} from "../copy.js";
import { dayBackCallback, showNamedDayScreen } from "../dayScreen.js";
import { expenseSummary } from "../format.js";
import {
  backKeyboard,
  deleteConfirmKeyboard,
  editCategoryKeyboard,
  expenseCardKeyboard,
} from "../keyboards.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { callbackMessage, dismissPending, showScreen } from "../screen.js";
import { setPending, type Pending } from "../session.js";
import { once } from "../updateLedger.js";

function isExpenseId(id: string): boolean {
  return /^[a-z0-9]+$/u.test(id);
}

function cardText(expense: {
  category: string;
  amount: number;
  note: string | null;
  spentAt: Date;
  user: { name: string };
}): string {
  const known = getCategoryByName(expense.category);
  const title = known
    ? `${known.emoji} ${expense.category} — ${formatAmount(expense.amount)}`
    : `${expense.category} — ${formatAmount(expense.amount)}`;
  const lines = [title];
  if (expense.note) lines.push(expense.note);
  lines.push(`Когда: ${formatLongStamp(expense.spentAt, config.timezone)}`);
  lines.push(`Добавил(а): ${expense.user.name}`);
  return lines.join("\n");
}

async function returnToDay(ctx: Context, spentAt: Date): Promise<void> {
  const key = zonedDayKey(spentAt, config.timezone);
  const parts = parseDayKey(key);
  if (!parts) {
    await presentMain(ctx);
    return;
  }
  const monthKey = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
  await showNamedDayScreen(
    ctx,
    parts.year,
    parts.month,
    parts.day,
    `mo:${monthKey}`,
  );
}

export async function showExpenseCard(
  ctx: Context,
  expenseId: string,
): Promise<void> {
  const expense = await getExpenseById(expenseId);
  if (!expense) {
    await presentMain(ctx, EXPENSE_GONE);
    return;
  }
  await showScreen(
    ctx,
    cardText(expense),
    expenseCardKeyboard(expense.id, dayBackCallback(expense.spentAt)),
  );
}

async function calendarBounds(): Promise<{ minDate: Date; maxDate: Date }> {
  const maxDate = new Date();
  const earliest = await getEarliestSpendDate();
  const minDate = earliest ?? maxDate;
  return { minDate: minDate > maxDate ? maxDate : minDate, maxDate };
}

export async function showEditCalendar(
  ctx: Context,
  expenseId: string,
  year: number,
  month: number,
): Promise<void> {
  if (!ctx.from) return;
  const { minDate, maxDate } = await calendarBounds();
  const built = calendarKeyboard({
    year,
    month,
    timeZone: config.timezone,
    minDate,
    maxDate,
    backCallback: `ex:${expenseId}`,
  });
  const message = callbackMessage(ctx);
  setPending(ctx.from.id, {
    kind: "pickDate",
    purpose: "edit",
    expenseId,
    year: built.year,
    month: built.month,
    ...(message ?? {}),
  });
  await showScreen(ctx, CALENDAR_PROMPT, built.keyboard);
}

export async function applyExpenseDate(
  ctx: Context,
  expenseId: string,
  dayKey: string,
): Promise<void> {
  if (!ctx.from) return;
  await dismissPending(ctx, ctx.from.id);
  const spentAt = combineZonedDayAndClock(dayKey, config.timezone);
  const result = await once(ctx.update.update_id, "edit-date", () =>
    updateExpense(expenseId, { spentAt }),
  );
  log("expense.edit_date", {
    telegramId: ctx.from.id,
    expenseId,
    day: dayKey,
    status: result.status,
  });
  if (result.status === "missing") {
    await presentMain(ctx, EXPENSE_GONE);
    return;
  }
  await returnToDay(ctx, result.expense.spentAt);
}

export async function handleExpenseCardText(
  ctx: Context,
  pending: Extract<Pending, { kind: "editAmount" | "editNote" }>,
  text: string,
): Promise<void> {
  if (!ctx.from) return;

  if (pending.kind === "editAmount") {
    const parsed = parseAmountInput(text);
    if (!parsed) {
      await ctx.reply(EDIT_AMOUNT_PROMPT);
      return;
    }
    await dismissPending(ctx, ctx.from.id);
    const result = await once(ctx.update.update_id, "edit-amount", () =>
      updateExpense(pending.expenseId, {
        amount: parsed.amount,
        ...(parsed.note ? { note: parsed.note } : {}),
      }),
    );
    log("expense.edit_amount", {
      telegramId: ctx.from.id,
      expenseId: pending.expenseId,
      status: result.status,
    });
    if (result.status === "missing") {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    await returnToDay(ctx, result.expense.spentAt);
    return;
  }

  await dismissPending(ctx, ctx.from.id);
  const note = text.trim() === "-" ? null : text;
  const result = await once(ctx.update.update_id, "edit-note", () =>
    updateExpense(pending.expenseId, { note }),
  );
  log("expense.edit_note", {
    telegramId: ctx.from.id,
    expenseId: pending.expenseId,
    status: result.status,
  });
  if (result.status === "missing") {
    await presentMain(ctx, EXPENSE_GONE);
    return;
  }
  await returnToDay(ctx, result.expense.spentAt);
}

export function registerExpenseCardHandlers(bot: Telegraf<Context>) {
  bot.action(/^ex:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    log("expense.card", { telegramId: ctx.from?.id, expenseId: id });
    await showExpenseCard(ctx, id);
  });

  bot.action(/^ex:amt:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    const message = callbackMessage(ctx);
    setPending(ctx.from.id, {
      kind: "editAmount",
      expenseId: id,
      ...(message ?? {}),
    });
    await showScreen(ctx, EDIT_AMOUNT_PROMPT, backKeyboard(`ex:${id}`));
  });

  bot.action(/^ex:note:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    const message = callbackMessage(ctx);
    setPending(ctx.from.id, {
      kind: "editNote",
      expenseId: id,
      ...(message ?? {}),
    });
    await showScreen(ctx, EDIT_NOTE_PROMPT, backKeyboard(`ex:${id}`));
  });

  bot.action(/^ex:cat:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    await showScreen(ctx, "Новая категория?", editCategoryKeyboard(id));
  });

  bot.action(/^ex:catset:([a-z0-9]+):([a-z]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    const slug = ctx.match[2];
    if (!ctx.from || !id || !slug || !isExpenseId(id)) return;
    const category = getCategoryBySlug(slug);
    if (!category) {
      await presentMain(ctx, STALE_BUTTON);
      return;
    }
    const result = await once(ctx.update.update_id, "edit-cat", () =>
      updateExpense(id, { category: category.name }),
    );
    log("expense.edit_category", {
      telegramId: ctx.from.id,
      expenseId: id,
      category: category.name,
      status: result.status,
    });
    if (result.status === "missing") {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    await returnToDay(ctx, result.expense.spentAt);
  });

  bot.action(/^ex:date:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    const month = initialCalendarMonth(config.timezone, expense.spentAt);
    await showEditCalendar(ctx, id, month.year, month.month);
  });

  bot.action(/^ex:del:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    await showScreen(
      ctx,
      deleteConfirmText(
        [
          expenseSummary(expense),
          formatLongStamp(expense.spentAt, config.timezone),
          `Добавил(а): ${expense.user.name}`,
        ].join("\n"),
      ),
      deleteConfirmKeyboard(id),
    );
  });

  bot.action(/^ex:dy:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!ctx.from || !id || !isExpenseId(id)) return;

    const result = await once(ctx.update.update_id, "delete", () =>
      deleteExpense(id),
    );
    log("expense.delete", {
      telegramId: ctx.from.id,
      expenseId: id,
      status: result.status,
    });
    if (result.status === "missing") {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    const spentAt = result.expense.spentAt;
    await returnToDay(ctx, spentAt);
  });

  bot.action(/^ex:dn:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!id || !isExpenseId(id)) return;
    await showExpenseCard(ctx, id);
  });
}
