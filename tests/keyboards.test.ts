import type { InlineKeyboardButton } from "telegraf/types";
import { describe, expect, it } from "vitest";
import { mainScreen } from "../src/bot/copy.js";
import {
  categoryKeyboard,
  deleteConfirmKeyboard,
  mainMenuKeyboard,
  statsMenuKeyboard,
} from "../src/bot/keyboards.js";

const CALLBACK_LIMIT = 64;

function callbackData(keyboard: {
  reply_markup: { inline_keyboard: InlineKeyboardButton[][] };
}): string[] {
  return keyboard.reply_markup.inline_keyboard.flatMap((row) =>
    row.flatMap((button) =>
      "callback_data" in button ? [button.callback_data] : [],
    ),
  );
}

describe("keyboards", () => {
  it("puts the three periods on the first row and the three cuts on the second", () => {
    const rows = statsMenuKeyboard().reply_markup.inline_keyboard;
    expect(rows[0]).toHaveLength(3);
    expect(rows[1]).toHaveLength(3);
    expect(rows[2]).toHaveLength(1);
  });

  it("shows only add-expense while the wallet is empty", () => {
    const empty = mainMenuKeyboard(false).reply_markup.inline_keyboard;
    expect(empty).toHaveLength(1);
    expect(callbackData(mainMenuKeyboard(false))).toEqual(["nav:add"]);
    expect(mainScreen(undefined, false)).toContain("Записей пока нет");
    expect(mainScreen(undefined, false)).not.toContain("Статистика");

    const full = mainMenuKeyboard(true).reply_markup.inline_keyboard;
    expect(full).toHaveLength(3);
    expect(mainScreen()).toContain("Статистика");
    expect(mainScreen()).toContain("Удалить запись");
  });

  it("keeps callback data within Telegram's 64-byte limit", () => {
    const keyboards = [
      categoryKeyboard(),
      statsMenuKeyboard(),
      mainMenuKeyboard(true),
      mainMenuKeyboard(false),
      deleteConfirmKeyboard("c".repeat(25)),
    ];
    const data = keyboards.flatMap((keyboard) => callbackData(keyboard));
    expect(data.length).toBeGreaterThan(0);
    for (const item of data) {
      expect(Buffer.byteLength(item, "utf8")).toBeLessThanOrEqual(
        CALLBACK_LIMIT,
      );
    }
  });
});
