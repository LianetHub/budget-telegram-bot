import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLogs,
  clipLogText,
  getLogDir,
  log,
  summarizeUpdate,
} from "../src/bot/logger.js";

describe("logger", () => {
  const previous = process.env.BUDGET_LOG_DIR;
  let tempDir: string | undefined;

  afterEach(() => {
    if (previous === undefined) delete process.env.BUDGET_LOG_DIR;
    else process.env.BUDGET_LOG_DIR = previous;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = undefined;
  });

  it("writes json lines and clears them", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "budget-logs-"));
    process.env.BUDGET_LOG_DIR = tempDir;

    log("test.event", { hello: 1 });
    const files = fs.readdirSync(getLogDir());
    expect(files).toHaveLength(1);
    const content = fs.readFileSync(path.join(getLogDir(), files[0]!), "utf8");
    expect(content).toContain('"event":"test.event"');
    expect(content).toContain('"hello":1');

    expect(clearLogs()).toEqual({ removed: 1 });
    expect(fs.readdirSync(getLogDir())).toHaveLength(0);
    expect(clearLogs()).toEqual({ removed: 0 });
  });

  it("summarizes callback and message updates", () => {
    expect(
      summarizeUpdate({
        update_id: 9,
        callback_query: {
          data: "st:cats",
          from: { id: 42 },
          message: { message_id: 7 },
        },
      }),
    ).toEqual({
      updateId: 9,
      type: "callback_query",
      telegramId: 42,
      callbackData: "st:cats",
      messageId: 7,
    });

    expect(
      summarizeUpdate({
        update_id: 10,
        message: {
          text: "x".repeat(250),
          from: { id: 5 },
        },
      }),
    ).toMatchObject({
      updateId: 10,
      type: "message",
      telegramId: 5,
      text: clipLogText("x".repeat(250)),
    });
  });
});
