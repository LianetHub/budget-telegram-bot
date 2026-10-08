import type { Context, Telegraf } from "telegraf";
import {
  getCategoryBySlug,
  resolveCategory,
} from "../../services/categories.js";
import { createExpense } from "../../services/expenseService.js";
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
  unknownCategoryPrompt,
} from "../copy.js";
import { displayName } from "../displayName.js";
import { expenseSummary, recordsCount } from "../format.js";
import { CALLBACK, backKeyboard, categoryKeyboard } from "../keyboards.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { callbackMessage, dismissPending, showScreen } from "../screen.js";
import { getPending, setPending } from "../session.js";

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

async function saveExpense(
  ctx: Context,
  input: { category: string; amount: number; note: string | null },
) {
  if (!ctx.from) return;
  const expense = await createExpense({
    telegramId: ctx.from.id,
    name: displayName(ctx),
    category: input.category,
    amount: input.amount,
    note: input.note,
  });
  const today = await getRangeTotals(getTodayRange());
  await presentMain(ctx, savedLead(expense, today));
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

    const pending = getPending(ctx.from.id);
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

  bot.on("text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const pending = getPending(ctx.from.id);
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
