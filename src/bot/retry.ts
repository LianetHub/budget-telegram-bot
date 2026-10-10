import { randomBytes } from "node:crypto";
import type { Update } from "telegraf/types";

export const RETRY_TTL_MS = 10 * 60 * 1000;
export const RETRY_MAX_ENTRIES = 100;

const failed = new Map<string, { update: Update; expiresAt: number }>();

function prune(now: number): void {
  for (const [id, entry] of failed) {
    if (entry.expiresAt <= now) failed.delete(id);
  }
  while (failed.size > RETRY_MAX_ENTRIES) {
    const oldest = failed.keys().next();
    if (oldest.done) break;
    failed.delete(oldest.value);
  }
}

/** Keeps a failed update so the "Повторить" button can run it again. */
export function rememberFailedUpdate(update: Update, now = Date.now()): string {
  prune(now);
  const id = randomBytes(6).toString("hex");
  failed.set(id, { update, expiresAt: now + RETRY_TTL_MS });
  prune(now);
  return id;
}

/** Returns the update once. A second click on the same button gets nothing. */
export function takeFailedUpdate(
  id: string,
  now = Date.now(),
): Update | undefined {
  prune(now);
  const entry = failed.get(id);
  if (!entry) return undefined;
  failed.delete(id);
  return entry.update;
}

export function resetFailedUpdates(): void {
  failed.clear();
}
