import type { Context, Middleware } from "telegraf";
import { log } from "../logger.js";
import { claimUpdate, releaseUpdate } from "../updateLedger.js";

/**
 * Telegram redelivers an update when the bot could not confirm it in time.
 * The second copy is dropped unless the first one failed.
 */
export const dedupeMiddleware: Middleware<Context> = async (ctx, next) => {
  const updateId = ctx.update.update_id;
  if (!claimUpdate(updateId)) {
    log("dedupe.skip", { updateId, telegramId: ctx.from?.id });
    return;
  }

  try {
    await next();
  } catch (error) {
    releaseUpdate(updateId);
    log("dedupe.release", {
      updateId,
      telegramId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
