import type { InlineKeyboardButton, Update } from "telegraf/types";
import { beforeEach, describe, expect, it } from "vitest";
import { mainScreen } from "../src/bot/copy.js";
import {
  categoryKeyboard,
  deleteConfirmKeyboard,
  mainMenuKeyboard,
  retryKeyboard,
  statsMenuKeyboard,
} from "../src/bot/keyboards.js";
import {
  RETRY_MAX_ENTRIES,
  RETRY_TTL_MS,
  rememberFailedUpdate,
  resetFailedUpdates,
  takeFailedUpdate,
} from "../src/bot/retry.js";

const CALLBACK_LIMIT = 64;

function textUpdate(updateId: number): Update {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: 0,
      chat: { id: 1, type: "private", first_name: "Test" },
      from: { id: 1, is_bot: false, first_name: "Test" },
      text: "Продукты 1500",
    },
  };
}

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
      retryKeyboard(rememberFailedUpdate(textUpdate(1))),
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

describe("retry button", () => {
  beforeEach(() => {
    resetFailedUpdates();
  });

  it("carries the id of the stored update", () => {
    const id = rememberFailedUpdate(textUpdate(42));
    expect(callbackData(retryKeyboard(id))).toEqual([`rt:${id}`]);
    expect(id).toMatch(/^[a-z0-9]+$/u);
  });

  it("gives the update back once", () => {
    const update = textUpdate(42);
    const id = rememberFailedUpdate(update);

    expect(takeFailedUpdate(id)).toBe(update);
    expect(takeFailedUpdate(id)).toBeUndefined();
  });

  it("forgets an update after the time limit", () => {
    const start = 5_000;
    const id = rememberFailedUpdate(textUpdate(1), start);

    expect(takeFailedUpdate(id, start + RETRY_TTL_MS + 1)).toBeUndefined();
  });

  it("keeps only the newest updates", () => {
    const first = rememberFailedUpdate(textUpdate(0));
    for (let index = 1; index <= RETRY_MAX_ENTRIES; index += 1) {
      rememberFailedUpdate(textUpdate(index));
    }

    expect(takeFailedUpdate(first)).toBeUndefined();
  });
});
