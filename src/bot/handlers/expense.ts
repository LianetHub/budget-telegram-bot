import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
import {
  getCategoryBySlug,
  resolveCategory,
} from "../../services/categories.js";
import {
  combineZonedDayAndClock,
  formatClock,
  todayRange,
} from "../../services/dates.js";
import {
  createExpense,
  findSimilarExpenseToday,
  getEarliestSpendDate,
} from "../../services/expenseService.js";
import {
  formatAmount,
  parseAmountInput,
  parseExpenseText,
} from "../../services/expenseParser.js";
import { getRangeTotals, getTodayRange } from "../../services/statsService.js";
import {
  calendarKeyboard,
  initialCalendarMonth,
  parseCalendarDay,
  parseCalendarNav,
} from "../calendar.js";
import {
  CALENDAR_PROMPT,
  CATEGORY_PROMPT,
  PARSE_HELP,
  STALE_BUTTON,
  WHEN_PROMPT,
  amountHelp,
  amountPrompt,
  duplicateConfirmText,
  unknownCategoryPrompt,
} from "../copy.js";
import { displayName } from "../displayName.js";
import { expenseSummary, recordsCount } from "../format.js";
import {
  CALLBACK,
  backKeyboard,
  categoryKeyboard,
  dupConfirmKeyboard,
  whenKeyboard,
} from "../keyboards.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { callbackMessage, dismissPending, showScreen } from "../screen.js";
import { getPending, setPending, type ExpenseDraft } from "../session.js";
import { once } from "../updateLedger.js";
import {
  applyExpenseDate,
  handleExpenseCardText,
  showEditCalendar,
} from "./expenseCard.js";

function savedLead(
  expense: {
    category: string;
    amount: number;
    note: string | null;
    user: { name: string };
  },
  today: { total: number; count: number },
): string {
  return [
    `✅ Записал: ${expenseSummary(expense)}`,
    `Добавил(а): ${expense.user.name}`,
    `Сегодня всего: ${formatAmount(today.total)} — ${recordsCount(today.count)}`,
  ].join("\n");
}

async function persistExpense(
  ctx: Context,
  input: {
    category: string;
    amount: number;
    note: string | null;
    spentAt: Date;
  },
) {
  if (!ctx.from) return;
  const from = ctx.from;
  const expense = await once(ctx.update.update_id, "save", () =>
    createExpense({
      telegramId: from.id,
      name: displayName(ctx),
      category: input.category,
      amount: input.amount,
      note: input.note,
      spentAt: input.spentAt,
    }),
  );
  log("expense.saved", {
    updateId: ctx.update.update_id,
    telegramId: from.id,
    category: input.category,
    amount: input.amount,
    spentAt: input.spentAt.toISOString(),
    expenseId: expense.id,
  });
  const today = await getRangeTotals(getTodayRange());
  await presentMain(ctx, savedLead(expense, today));
}

async function saveExpense(
  ctx: Context,
  input: {
    category: string;
    amount: number;
    note: string | null;
    spentAt: Date;
  },
  options: { skipDupCheck?: boolean } = {},
) {
  if (!ctx.from) return;
  const from = ctx.from;
  const range = todayRange(config.timezone, input.spentAt);

  if (!options.skipDupCheck) {
    const similar = await findSimilarExpenseToday({
      category: input.category,
      amount: input.amount,
      excludeTelegramId: from.id,
      range,
    });
    if (similar) {
      log("expense.dup_prompt", {
        updateId: ctx.update.update_id,
        telegramId: from.id,
        category: input.category,
        amount: input.amount,
        similarId: similar.id,
        similarUser: similar.user.name,
      });
      const message = callbackMessage(ctx);
      setPending(from.id, {
        kind: "confirmDup",
        category: input.category,
        amount: input.amount,
        note: input.note,
        spentAt: input.spentAt,
        ...(message ?? {}),
      });
      const stamp = formatClock(similar.spentAt, config.timezone);
      await showScreen(
        ctx,
        duplicateConfirmText(
          `${expenseSummary(similar)} (${similar.user.name}, ${stamp})`,
        ),
        dupConfirmKeyboard(),
      );
      return;
    }
  }

  await persistExpense(ctx, input);
}

async function askWhen(ctx: Context, draft: ExpenseDraft): Promise<void> {
  if (!ctx.from) return;
  const message = callbackMessage(ctx);
  setPending(ctx.from.id, {
    kind: "pickWhen",
    draft,
    ...(message ?? {}),
  });
  await showScreen(ctx, WHEN_PROMPT, whenKeyboard());
}

async function calendarBounds(): Promise<{ minDate: Date; maxDate: Date }> {
  const maxDate = new Date();
  const earliest = await getEarliestSpendDate();
  const minDate = earliest ?? maxDate;
  return { minDate: minDate > maxDate ? maxDate : minDate, maxDate };
}

async function showAddCalendar(
  ctx: Context,
  draft: ExpenseDraft,
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
    backCallback: CALLBACK.WHEN_BACK,
  });
  const message = callbackMessage(ctx);
  setPending(ctx.from.id, {
    kind: "pickDate",
    purpose: "add",
    draft,
    year: built.year,
    month: built.month,
    ...(message ?? {}),
  });
  await showScreen(ctx, CALENDAR_PROMPT, built.keyboard);
}

export function registerExpenseHandlers(bot: Telegraf<Context>) {
  bot.action(CALLBACK.ADD, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await showScreen(ctx, CATEGORY_PROMPT, categoryKeyboard());
  });

  bot.action(/^add:([a-z]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;

    const slug = ctx.match[1];
    const category = slug ? getCategoryBySlug(slug) : undefined;
    if (!category) {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }

    const userId = ctx.from.id;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (pending?.kind === "pick") {
      const choice = pending;
      await dismissPending(ctx, ctx.from.id);
      await askWhen(ctx, {
        category: category.name,
        amount: choice.amount,
        note: choice.note,
      });
      return;
    }

    await dismissPending(ctx, ctx.from.id);
    const message = callbackMessage(ctx);
    setPending(ctx.from.id, {
      kind: "amount",
      categorySlug: category.slug,
      ...(message ?? {}),
    });
    await showScreen(ctx, amountPrompt(category), backKeyboard(CALLBACK.ADD));
  });

  bot.action(CALLBACK.WHEN_TODAY, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const userId = ctx.from.id;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (pending?.kind !== "pickWhen") {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }
    const draft = pending.draft;
    await dismissPending(ctx, ctx.from.id);
    await saveExpense(ctx, { ...draft, spentAt: new Date() });
  });

  bot.action(CALLBACK.WHEN_PICK, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const userId = ctx.from.id;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (pending?.kind !== "pickWhen") {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }
    const draft = pending.draft;
    const month = initialCalendarMonth(config.timezone);
    await showAddCalendar(ctx, draft, month.year, month.month);
  });

  bot.action(CALLBACK.WHEN_BACK, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const pending = getPending(ctx.from.id);
    if (pending?.kind === "pickDate" && pending.purpose === "add") {
      await askWhen(ctx, pending.draft);
      return;
    }
    if (pending?.kind === "pickWhen") {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx);
      return;
    }
    await dismissPending(ctx, ctx.from.id);
    await presentMain(ctx, STALE_BUTTON);
  });

  bot.action("cal:noop", async (ctx) => {
    await safeAnswerCbQuery(ctx);
  });

  bot.action(/^cal:nav:(\d{4}-\d{2})$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const key = ctx.match[1];
    const parts = key ? parseCalendarNav(key) : null;
    const pending = getPending(ctx.from.id);
    if (!parts || pending?.kind !== "pickDate") {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }
    if (pending.purpose === "add") {
      await showAddCalendar(ctx, pending.draft, parts.year, parts.month);
      return;
    }
    await showEditCalendar(ctx, pending.expenseId, parts.year, parts.month);
  });

  bot.action(/^cal:day:(\d{4}-\d{2}-\d{2})$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    const userId = ctx.from.id;
    const key = ctx.match[1];
    const parts = key ? parseCalendarDay(key) : null;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (!parts || !key || pending?.kind !== "pickDate") {
      await dismissPending(ctx, ctx.from.id);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }

    if (pending.purpose === "add") {
      const draft = pending.draft;
      await dismissPending(ctx, ctx.from.id);
      const spentAt = combineZonedDayAndClock(key, config.timezone);
      log("expense.date_picked", {
        telegramId: ctx.from.id,
        day: key,
      });
      await saveExpense(ctx, { ...draft, spentAt });
      return;
    }

    await applyExpenseDate(ctx, pending.expenseId, key);
  });

  bot.action(CALLBACK.DUP_YES, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;

    const userId = ctx.from.id;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (pending?.kind !== "confirmDup") {
      await dismissPending(ctx, userId);
      await presentMain(ctx, STALE_BUTTON);
      return;
    }

    const draft = pending;
    await dismissPending(ctx, userId);
    log("expense.dup_confirm", {
      updateId: ctx.update.update_id,
      telegramId: userId,
      category: draft.category,
      amount: draft.amount,
    });
    await persistExpense(ctx, {
      category: draft.category,
      amount: draft.amount,
      note: draft.note,
      spentAt: draft.spentAt,
    });
  });

  bot.action(CALLBACK.DUP_NO, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    if (!ctx.from) return;
    log("expense.dup_cancel", {
      updateId: ctx.update.update_id,
      telegramId: ctx.from.id,
    });
    await dismissPending(ctx, ctx.from.id);
    await presentMain(ctx);
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const userId = ctx.from.id;
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );

    if (pending?.kind === "editAmount" || pending?.kind === "editNote") {
      await handleExpenseCardText(ctx, pending, text);
      return;
    }

    if (pending?.kind === "amount") {
      const category = getCategoryBySlug(pending.categorySlug);
      const parsed = parseAmountInput(text);
      if (!parsed) {
        await ctx.reply(amountHelp(category));
        return;
      }

      await dismissPending(ctx, ctx.from.id);
      if (!category) {
        await presentMain(ctx, STALE_BUTTON);
        return;
      }

      await askWhen(ctx, {
        category: category.name,
        amount: parsed.amount,
        note: parsed.note,
      });
      return;
    }

    const parsed = parseExpenseText(text);
    if (!parsed) {
      await ctx.reply(PARSE_HELP);
      return;
    }

    const resolved = resolveCategory(parsed.label);
    if (!resolved) {
      await dismissPending(ctx, ctx.from.id);
      const sent = await ctx.reply(
        unknownCategoryPrompt(parsed.label, formatAmount(parsed.amount)),
        categoryKeyboard(),
      );
      setPending(ctx.from.id, {
        kind: "pick",
        amount: parsed.amount,
        note: parsed.label,
        chatId: sent.chat.id,
        messageId: sent.message_id,
      });
      return;
    }

    await dismissPending(ctx, ctx.from.id);
    await askWhen(ctx, {
      category: resolved.category.name,
      amount: parsed.amount,
      note: resolved.note,
    });
  });
}
