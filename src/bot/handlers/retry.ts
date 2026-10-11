import type { Context, Telegraf } from "telegraf";
import { STALE_BUTTON } from "../copy.js";
import { RETRY_PREFIX } from "../keyboards.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import { takeFailedUpdate } from "../retry.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { releaseUpdate } from "../updateLedger.js";

const RETRY_ACTION = new RegExp(`^${RETRY_PREFIX}([a-z0-9]+)$`, "u");

export function isRetryClick(update: Context["update"]): boolean {
  return (
    "callback_query" in update &&
    "data" in update.callback_query &&
    typeof update.callback_query.data === "string" &&
    update.callback_query.data.startsWith(RETRY_PREFIX)
  );
}

export function registerRetryHandlers(bot: Telegraf<Context>) {
  bot.action(RETRY_ACTION, async (ctx) => {
    await safeAnswerCbQuery(ctx);

    const retryId = ctx.match[1] ?? "";
    const saved = takeFailedUpdate(retryId);
    if (!saved) {
      log("retry.stale", { telegramId: ctx.from?.id, retryId });
      await presentMain(ctx, STALE_BUTTON);
      return;
    }

    try {
      await ctx.deleteMessage();
    } catch (error) {
      log("retry.delete_failed", {
        telegramId: ctx.from?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // The saved update runs the same handlers again. Anything it already
    // wrote is reused, so the retry cannot add a second record.
    log("retry.replay", {
      telegramId: ctx.from?.id,
      retryId,
      savedUpdateId: saved.update_id,
    });
    releaseUpdate(saved.update_id);
    await bot.handleUpdate(saved);
  });
}
