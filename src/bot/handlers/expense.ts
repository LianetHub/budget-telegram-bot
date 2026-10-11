import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
import {
  getCategoryBySlug,
  resolveCategory,
} from "../../services/categories.js";
import { formatClock } from "../../services/dates.js";
import {
  createExpense,
  findSimilarExpenseToday,
} from "../../services/expenseService.js";
import {
  formatAmount,
  parseAmountInput,
  parseExpenseText,
} from "../../services/expenseParser.js";
import { getRangeTotals, getTodayRange } from "../../services/statsService.js";
import {
  CATEGORY_PROMPT,
  PARSE_HELP,
  STALE_BUTTON,
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
} from "../keyboards.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { callbackMessage, dismissPending, showScreen } from "../screen.js";
import { getPending, setPending } from "../session.js";
import { once } from "../updateLedger.js";

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
  input: { category: string; amount: number; note: string | null },
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
    }),
  );
  log("expense.saved", {
    updateId: ctx.update.update_id,
    telegramId: from.id,
    category: input.category,
    amount: input.amount,
    expenseId: expense.id,
  });
  const today = await getRangeTotals(getTodayRange());
  await presentMain(ctx, savedLead(expense, today));
}

async function saveExpense(
  ctx: Context,
  input: { category: string; amount: number; note: string | null },
  options: { skipDupCheck?: boolean } = {},
) {
  if (!ctx.from) return;
  const from = ctx.from;

  if (!options.skipDupCheck) {
    const similar = await findSimilarExpenseToday({
      category: input.category,
      amount: input.amount,
      excludeTelegramId: from.id,
      range: getTodayRange(),
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
        ...(message ?? {}),
      });
      const stamp = formatClock(similar.createdAt, config.timezone);
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
    // Remembered per update: a retry must see the same pending input the first run saw.
    const pending = once(ctx.update.update_id, "pending", () =>
      getPending(userId),
    );
    if (pending?.kind === "pick") {
      const choice = pending;
      await dismissPending(ctx, ctx.from.id);
      await saveExpense(ctx, {
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

      await saveExpense(ctx, {
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
    await saveExpense(ctx, {
      category: resolved.category.name,
      amount: parsed.amount,
      note: resolved.note,
    });
  });
}
