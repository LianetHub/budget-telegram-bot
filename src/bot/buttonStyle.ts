import type { InlineKeyboardButton } from "telegraf/types";

/** Bot API styles for colored inline buttons (clients that support them). */
export type ButtonStyle = "primary" | "success" | "danger";

type StyledCallback = InlineKeyboardButton.CallbackButton & {
  style?: ButtonStyle;
};

export function styledCallback(
  text: string,
  callbackData: string,
  style?: ButtonStyle,
): InlineKeyboardButton {
  const button: StyledCallback = {
    text,
    callback_data: callbackData,
  };
  if (style) button.style = style;
  return button;
}
