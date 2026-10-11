import type { Context, Telegraf } from "telegraf";
import { hasAnyExpenses, upsertUser } from "../../services/expenseService.js";
import { CALLBACK, mainMenuKeyboard } from "../keyboards.js";
import { LOGS_CLEARED, LOGS_EMPTY, startText } from "../copy.js";
import { displayName } from "../displayName.js";
import { clearLogs, log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { dismissPending } from "../screen.js";

export function registerStartHandlers(bot: Telegraf<Context>) {
  bot.start(async (ctx) => {
    await dismissPending(ctx, ctx.from.id);
    const name = displayName(ctx);
    await upsertUser(ctx.from.id, name);
    const hasExpenses = await hasAnyExpenses();
    log("cmd.start", { telegramId: ctx.from.id });
    await ctx.reply(
      startText(name, hasExpenses),
      mainMenuKeyboard(hasExpenses),
    );
  });

  bot.command("menu", async (ctx) => {
    await dismissPending(ctx, ctx.from.id);
    log("cmd.menu", { telegramId: ctx.from.id });
    await presentMain(ctx);
  });

  bot.command("clearlogs", async (ctx) => {
    await dismissPending(ctx, ctx.from.id);
    const { removed } = clearLogs();
    log("cmd.clearlogs", { telegramId: ctx.from.id, removed });
    await ctx.reply(removed > 0 ? LOGS_CLEARED : LOGS_EMPTY);
  });

  bot.action(CALLBACK.MAIN, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await presentMain(ctx);
  });
}
