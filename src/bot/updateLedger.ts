/**
 * In-memory record of what already happened for a Telegram update. It lets a
 * repeated or replayed update show its result again without writing twice.
 * It is cleared on restart.
 */
export const LEDGER_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;

const claimed = new Map<number, number>();
const remembered = new Map<string, { value: unknown; expiresAt: number }>();

function prune<K, V extends { expiresAt: number } | number>(
  store: Map<K, V>,
  now: number,
): void {
  for (const [key, entry] of store) {
    const expiresAt = typeof entry === "number" ? entry : entry.expiresAt;
    if (expiresAt <= now) store.delete(key);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/** True the first time an update is seen, false for a repeated delivery. */
export function claimUpdate(updateId: number, now = Date.now()): boolean {
  prune(claimed, now);
  if (claimed.has(updateId)) return false;
  claimed.set(updateId, now + LEDGER_TTL_MS);
  return true;
}

/** Lets the update run again, for a failure or an explicit retry. */
export function releaseUpdate(updateId: number): void {
  claimed.delete(updateId);
}

/**
 * Runs `compute` once per update and key. A second run of the same update gets
 * the first result, so a retry cannot create or delete a record twice. A
 * failed attempt is not remembered.
 */
export function once<T>(
  updateId: number,
  key: string,
  compute: () => T,
  now = Date.now(),
): T {
  prune(remembered, now);
  const id = `${updateId}:${key}`;
  const known = remembered.get(id);
  if (known) return known.value as T;

  const value = compute();
  remembered.set(id, { value, expiresAt: now + LEDGER_TTL_MS });
  if (value instanceof Promise) {
    value.catch(() => {
      if (remembered.get(id)?.value === value) remembered.delete(id);
    });
  }
  return value;
}

export function resetLedger(): void {
  claimed.clear();
  remembered.clear();
}
