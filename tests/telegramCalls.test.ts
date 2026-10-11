import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TelegramError } from "telegraf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callWithRetry,
  MAX_ATTEMPTS,
  canRepeat,
  isConnectFailure,
} from "../src/bot/telegramCalls.js";

const previousLogDir = process.env.BUDGET_LOG_DIR;
let tempLogDir: string | undefined;

beforeEach(() => {
  tempLogDir = fs.mkdtempSync(path.join(os.tmpdir(), "budget-tg-logs-"));
  process.env.BUDGET_LOG_DIR = tempLogDir;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (previousLogDir === undefined) delete process.env.BUDGET_LOG_DIR;
  else process.env.BUDGET_LOG_DIR = previousLogDir;
  if (tempLogDir && fs.existsSync(tempLogDir)) {
    fs.rmSync(tempLogDir, { recursive: true, force: true });
  }
  tempLogDir = undefined;
});

function fetchError(code: string, sysCall?: string): Error {
  const error = new Error("request failed") as Error & {
    code: string;
    erroredSysCall?: string;
  };
  error.name = "FetchError";
  error.code = code;
  if (sysCall) error.erroredSysCall = sysCall;
  return error;
}

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

describe("canRepeat", () => {
  it("repeats edits and answers after a network failure", () => {
    expect(canRepeat("editMessageText", abortError())).toBe(true);
    expect(canRepeat("answerCallbackQuery", abortError())).toBe(true);
  });

  it("does not repeat sendMessage after the request may have been sent", () => {
    expect(canRepeat("sendMessage", abortError())).toBe(false);
    expect(canRepeat("sendMessage", fetchError("ECONNRESET", "read"))).toBe(
      false,
    );
  });

  it("repeats sendMessage when the connection was never made", () => {
    expect(canRepeat("sendMessage", fetchError("ETIMEDOUT", "connect"))).toBe(
      true,
    );
    expect(isConnectFailure(fetchError("ECONNREFUSED"))).toBe(true);
  });

  it("repeats sendMessage when the TLS handshake was dropped", () => {
    const error = fetchError("ECONNRESET");
    error.message =
      "Client network socket disconnected before secure TLS connection was established";
    expect(canRepeat("sendMessage", error)).toBe(true);
  });

  it("never repeats an answer from Telegram", () => {
    const error = new TelegramError({
      error_code: 400,
      description: "Bad Request: message is not modified",
    });
    expect(canRepeat("editMessageText", error)).toBe(false);
  });
});

describe("callWithRetry", () => {
  it("returns the result of the second attempt", async () => {
    const attempt = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(abortError())
      .mockResolvedValueOnce("ok");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(callWithRetry("editMessageText", attempt)).resolves.toBe("ok");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("gives up after the attempt limit", async () => {
    const attempt = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValue(abortError());
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(callWithRetry("editMessageText", attempt)).rejects.toThrow(
      "aborted",
    );
    expect(attempt).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("makes a single attempt for a send that may have gone through", async () => {
    const attempt = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValue(abortError());

    await expect(callWithRetry("sendMessage", attempt)).rejects.toThrow(
      "aborted",
    );
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
