import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_TTL_MS,
  clearPending,
  getPending,
  setPending,
} from "../src/bot/session.js";

describe("pending input", () => {
  afterEach(() => {
    clearPending(1);
    vi.useRealTimers();
  });

  it("forgets a forgotten category choice after the timeout", () => {
    vi.useFakeTimers();
    setPending(1, { kind: "amount", categorySlug: "products" });
    vi.advanceTimersByTime(PENDING_TTL_MS - 1);
    expect(getPending(1)?.kind).toBe("amount");
    vi.advanceTimersByTime(1);
    expect(getPending(1)).toBeUndefined();
  });
});
