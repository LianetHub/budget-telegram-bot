import type { Context, Telegraf } from "telegraf";
import { STALE_BUTTON } from "../copy.js";
import { RETRY_PREFIX } from "../keyboards.js";
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

    const saved = takeFailedUpdate(ctx.match[1] ?? "");
    if (!saved) {
      await presentMain(ctx, STALE_BUTTON);
      return;
    }

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.warn("Could not remove the error message:", error);
    }

    // The saved update runs the same handlers again. Anything it already
    // wrote is reused, so the retry cannot add a second record.
    releaseUpdate(saved.update_id);
    await bot.handleUpdate(saved);
  });
}
