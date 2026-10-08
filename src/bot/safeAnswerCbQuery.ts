import type { Context } from "telegraf";
import { TelegramError } from "telegraf";

/** Answer callback without crashing on stale button presses. */
export async function safeAnswerCbQuery(ctx: Context): Promise<void> {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    if (isStaleCallbackError(error)) {
      return;
    }
    throw error;
  }
}

function isStaleCallbackError(error: unknown): boolean {
  if (!(error instanceof TelegramError)) {
    return false;
  }
  return /query is too old|query ID is invalid/i.test(error.description);
}
