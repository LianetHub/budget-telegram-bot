import type { Context, Middleware } from "telegraf";
import { claimUpdate, releaseUpdate } from "../updateLedger.js";

/**
 * Telegram redelivers an update when the bot could not confirm it in time.
 * The second copy is dropped unless the first one failed.
 */
export const dedupeMiddleware: Middleware<Context> = async (ctx, next) => {
  const updateId = ctx.update.update_id;
  if (!claimUpdate(updateId)) {
    console.warn(`Skipping repeated update ${updateId}`);
    return;
  }

  try {
    await next();
  } catch (error) {
    releaseUpdate(updateId);
    throw error;
  }
};
