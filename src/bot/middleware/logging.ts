import type { Context, Middleware } from "telegraf";
import { log, summarizeUpdate } from "../logger.js";

export const loggingMiddleware: Middleware<Context> = async (ctx, next) => {
  const started = Date.now();
  const summary = summarizeUpdate(ctx.update);
  log("update.in", summary);
  try {
    await next();
    log("update.out", {
      ...summary,
      ok: true,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    log("update.out", {
      ...summary,
      ok: false,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
    });
    throw error;
  }
};
