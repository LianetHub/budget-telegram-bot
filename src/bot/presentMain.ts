import type { Context } from "telegraf";
import { hasAnyExpenses } from "../services/expenseService.js";
import { mainScreen } from "./copy.js";
import { mainMenuKeyboard } from "./keyboards.js";
import { showScreen } from "./screen.js";

export async function presentMain(ctx: Context, lead?: string): Promise<void> {
  const hasExpenses = await hasAnyExpenses();
  const text = mainScreen(lead, hasExpenses);
  const keyboard = mainMenuKeyboard(hasExpenses);
  if (ctx.callbackQuery) {
    await showScreen(ctx, text, keyboard);
    return;
  }
  await ctx.reply(text, keyboard);
}
