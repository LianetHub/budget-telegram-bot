import { Telegram, TelegramError } from "telegraf";
import { log } from "./logger.js";

/** Short calls (answer, edit, send) must not hang for minutes. */
export const CALL_TIMEOUT_MS = 15_000;
export const MAX_ATTEMPTS = 3;

/** Long poll manages its own abort signal and socket timeout. */
const UNBOUNDED_METHODS = new Set(["getUpdates"]);

/** Repeating these never changes the outcome a second time. */
const REPEATABLE_METHODS = new Set([
  "answerCallbackQuery",
  "editMessageText",
  "editMessageReplyMarkup",
  "deleteMessage",
]);

/** The request never left this machine, so any method can be repeated. */
const CONNECT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);

type NetworkError = Error & { code?: string; erroredSysCall?: string };

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) || error instanceof TelegramError) return false;
  return (
    error.name === "FetchError" ||
    error.name === "AbortError" ||
    error.name === "TimeoutError"
  );
}

/** Raised when the peer drops the connection during the TLS handshake. */
const HANDSHAKE_DROPPED = /before secure TLS connection was established/i;

export function isConnectFailure(error: unknown): boolean {
  if (!isNetworkError(error)) return false;
  if (HANDSHAKE_DROPPED.test((error as Error).message)) return true;
  const { code, erroredSysCall } = error as NetworkError;
  if (!code || !CONNECT_ERROR_CODES.has(code)) return false;
  return erroredSysCall === undefined || erroredSysCall === "connect";
}

export function canRepeat(method: string, error: unknown): boolean {
  if (!isNetworkError(error)) return false;
  return REPEATABLE_METHODS.has(method) || isConnectFailure(error);
}

export async function callWithRetry<T>(
  method: string,
  attempt: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; maxAttempts?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? CALL_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;

  for (let number = 1; ; number += 1) {
    const started = Date.now();
    try {
      const result = await attempt(AbortSignal.timeout(timeoutMs));
      if (number > 1) {
        log("telegram.retry_ok", {
          method,
          attempt: number,
          durationMs: Date.now() - started,
        });
      }
      return result;
    } catch (error) {
      log("telegram.call_failed", {
        method,
        attempt: number,
        maxAttempts,
        durationMs: Date.now() - started,
        error: errorLabel(error),
        willRetry: number < maxAttempts && canRepeat(method, error),
      });
      if (number >= maxAttempts || !canRepeat(method, error)) throw error;
    }
  }
}

function errorLabel(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type CallApi = (
  this: Telegram,
  method: string,
  payload: object,
  extra?: { signal?: unknown },
) => Promise<unknown>;

let installed = false;

/**
 * Telegraf builds a new Telegram client for every update, so the limit has to
 * sit on the class, not on `bot.telegram`.
 */
export function installCallTimeouts(): void {
  if (installed) return;
  installed = true;

  const original = Reflect.get(Telegram.prototype, "callApi") as CallApi;
  const limited: CallApi = function (method, payload, extra) {
    if (UNBOUNDED_METHODS.has(method) || extra?.signal) {
      return original.call(this, method, payload, extra);
    }
    return callWithRetry(method, (signal) =>
      original.call(this, method, payload, { signal }),
    );
  };

  Telegram.prototype.callApi = limited as unknown as Telegram["callApi"];
}
