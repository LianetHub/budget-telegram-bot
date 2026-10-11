import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
import { formatLongStamp, formatShortStamp } from "../../services/dates.js";
import {
  deleteOwnExpense,
  getExpenseById,
  getOwnRecentExpenses,
  hasAnyExpenses,
} from "../../services/expenseService.js";
import {
  DELETE_PROMPT,
  EXPENSE_GONE,
  FOREIGN_EXPENSE,
  NO_OWN_EXPENSES,
  deleteConfirmText,
} from "../copy.js";
import {
  BUTTON_LABEL_LIMIT,
  expenseButtonLabel,
  expenseSummary,
} from "../format.js";
import {
  CALLBACK,
  RECENT_LIMIT,
  deleteConfirmKeyboard,
  deleteListKeyboard,
} from "../keyboards.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { dismissPending, showScreen } from "../screen.js";
import { once } from "../updateLedger.js";

function isExpenseId(id: string): boolean {
  return /^[a-z0-9]+$/u.test(id);
}

function belongsTo(telegramId: bigint, currentTelegramId: number): boolean {
  return telegramId === BigInt(currentTelegramId);
}

async function showDeleteList(ctx: Context) {
  if (!ctx.from) return;

  const expenses = await getOwnRecentExpenses(ctx.from.id, RECENT_LIMIT);
  if (expenses.length === 0) {
    const hasExpenses = await hasAnyExpenses();
    await presentMain(ctx, hasExpenses ? NO_OWN_EXPENSES : undefined);
    return;
  }

  const lines = expenses.map((expense, index) => {
    const stamp = formatLongStamp(expense.createdAt, config.timezone);
    return `${index + 1}. ${expenseSummary(expense)} · ${stamp}`;
  });
  await showScreen(
    ctx,
    [DELETE_PROMPT, "", ...lines].join("\n"),
    deleteListKeyboard(
      expenses.map((expense, index) => {
        const prefix = `${index + 1}. `;
        const stamp = formatShortStamp(expense.createdAt, config.timezone);
        return {
          id: expense.id,
          label: `${prefix}${expenseButtonLabel(expense, stamp, BUTTON_LABEL_LIMIT - prefix.length)}`,
        };
      }),
    ),
  );
}

export function registerDeleteHandlers(bot: Telegraf<Context>) {
  bot.action(CALLBACK.DELETE, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    log("delete.list", { telegramId: ctx.from?.id });
    await showDeleteList(ctx);
  });

  bot.action(/^dx:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!ctx.from || !id || !isExpenseId(id)) return;

    const expense = await getExpenseById(id);
    if (!expense) {
      await presentMain(ctx, EXPENSE_GONE);
      return;
    }
    if (!belongsTo(expense.user.telegramId, ctx.from.id)) {
      await presentMain(ctx, FOREIGN_EXPENSE);
      return;
    }

    const stamp = formatLongStamp(expense.createdAt, config.timezone);
    await showScreen(
      ctx,
      deleteConfirmText(
        [
          expenseSummary(expense),
          stamp,
          `Добавил(а): ${expense.user.name}`,
        ].join("\n"),
      ),
      deleteConfirmKeyboard(expense.id),
    );
  });

  bot.action(/^dy:([a-z0-9]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const id = ctx.match[1];
    if (!ctx.from || !id || !isExpenseId(id)) return;

    const userId = ctx.from.id;
    // A retry of this update reports the first result instead of "already gone".
    const result = await once(ctx.update.update_id, "delete", () =>
      deleteOwnExpense(id, userId),
    );
    log("delete.result", {
      telegramId: userId,
      expenseId: id,
      status: result.status,
    });
    const lead =
      result.status === "deleted"
        ? `🗑 Убрал: ${expenseSummary(result.expense)}`
        : result.status === "forbidden"
          ? FOREIGN_EXPENSE
          : EXPENSE_GONE;
    await presentMain(ctx, lead);
  });

  bot.action(CALLBACK.DELETE_NO, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await presentMain(ctx);
  });
}
