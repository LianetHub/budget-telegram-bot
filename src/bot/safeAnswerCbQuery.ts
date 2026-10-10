import type { Context } from "telegraf";
import { TelegramError } from "telegraf";

/**
 * Answering a button press only stops the spinner. The action itself must not
 * fail because that answer was late or lost, so every error is swallowed here.
 */
export async function safeAnswerCbQuery(ctx: Context): Promise<void> {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    if (isStaleCallbackError(error)) return;
    console.warn("Could not answer the button press:", describe(error));
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isStaleCallbackError(error: unknown): boolean {
  if (!(error instanceof TelegramError)) {
    return false;
  }
  return /query is too old|query ID is invalid/i.test(error.description);
}
