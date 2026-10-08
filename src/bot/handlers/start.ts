import type { Context, Telegraf } from "telegraf";
import { hasAnyExpenses, upsertUser } from "../../services/expenseService.js";
import { CALLBACK, mainMenuKeyboard } from "../keyboards.js";
import { startText } from "../copy.js";
import { displayName } from "../displayName.js";
import { presentMain } from "../presentMain.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { dismissPending } from "../screen.js";

export function registerStartHandlers(bot: Telegraf<Context>) {
  bot.start(async (ctx) => {
    await dismissPending(ctx, ctx.from.id);
    const name = displayName(ctx);
    await upsertUser(ctx.from.id, name);
    const hasExpenses = await hasAnyExpenses();
    await ctx.reply(
      startText(name, hasExpenses),
      mainMenuKeyboard(hasExpenses),
    );
  });

  bot.command("menu", async (ctx) => {
    await dismissPending(ctx, ctx.from.id);
    await presentMain(ctx);
  });

  bot.action(CALLBACK.MAIN, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await presentMain(ctx);
  });
}
