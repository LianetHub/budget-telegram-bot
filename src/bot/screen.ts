import type { Context } from "telegraf";
import { Markup, TelegramError } from "telegraf";
import type { InlineKeyboardMarkup } from "telegraf/types";
import { clearPending, getPending } from "./session.js";

type ScreenKeyboard = Markup.Markup<InlineKeyboardMarkup>;

export async function showScreen(
  ctx: Context,
  text: string,
  extra?: ScreenKeyboard,
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch (error) {
      if (isNotModified(error)) return;
      if (!isEditImpossible(error)) throw error;
    }
  }

  await ctx.reply(text, extra);
}

export async function dismissPending(
  ctx: Context,
  telegramId: number | undefined,
): Promise<void> {
  if (telegramId === undefined) return;
  const pending = getPending(telegramId);
  clearPending(telegramId);
  if (pending?.chatId === undefined || pending.messageId === undefined) return;
  await clearKeyboard(ctx, pending.chatId, pending.messageId);
}

export async function clearKeyboard(
  ctx: Context,
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await ctx.telegram.editMessageReplyMarkup(chatId, messageId, undefined, {
      inline_keyboard: [],
    });
  } catch (error) {
    if (error instanceof TelegramError) return;
    throw error;
  }
}

export function callbackMessage(
  ctx: Context,
): { chatId: number; messageId: number } | undefined {
  if (!ctx.chat || !ctx.callbackQuery || !("message" in ctx.callbackQuery)) {
    return undefined;
  }
  const message = ctx.callbackQuery.message;
  if (!message || !("message_id" in message)) return undefined;
  return { chatId: ctx.chat.id, messageId: message.message_id };
}

function descriptionOf(error: unknown): string {
  return error instanceof TelegramError ? error.description : "";
}

function isNotModified(error: unknown): boolean {
  return /message is not modified/i.test(descriptionOf(error));
}

function isEditImpossible(error: unknown): boolean {
  return /message can't be edited|message to edit not found|there is no text in the message|MESSAGE_ID_INVALID/i.test(
    descriptionOf(error),
  );
}
