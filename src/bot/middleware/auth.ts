import type { Middleware } from "telegraf";
import type { Context } from "telegraf";
import { config } from "../../config.js";
import { accessDeniedText } from "../copy.js";
import { log } from "../logger.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";

export const authMiddleware: Middleware<Context> = async (ctx, next) => {
  if (ctx.chat?.type !== "private") {
    log("auth.skip_non_private", {
      updateId: ctx.update.update_id,
      chatType: ctx.chat?.type,
    });
    return;
  }

  const telegramId = ctx.from?.id;
  if (!telegramId || !config.allowedTelegramIds.has(telegramId)) {
    log("auth.denied", {
      updateId: ctx.update.update_id,
      telegramId,
    });
    if (ctx.callbackQuery) await safeAnswerCbQuery(ctx);
    await ctx.reply(accessDeniedText(telegramId));
    return;
  }
  return next();
};
