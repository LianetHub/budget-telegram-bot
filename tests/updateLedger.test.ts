import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEDGER_TTL_MS,
  claimUpdate,
  once,
  releaseUpdate,
  resetLedger,
} from "../src/bot/updateLedger.js";

beforeEach(() => {
  resetLedger();
});

describe("claimUpdate", () => {
  it("accepts an update once and rejects a repeated delivery", () => {
    expect(claimUpdate(1)).toBe(true);
    expect(claimUpdate(1)).toBe(false);
    expect(claimUpdate(2)).toBe(true);
  });

  it("accepts the update again after it was released", () => {
    expect(claimUpdate(1)).toBe(true);
    releaseUpdate(1);
    expect(claimUpdate(1)).toBe(true);
  });

  it("forgets an update after the time limit", () => {
    const start = 1_000;
    expect(claimUpdate(1, start)).toBe(true);
    expect(claimUpdate(1, start + LEDGER_TTL_MS + 1)).toBe(true);
  });
});

describe("once", () => {
  it("runs the work a single time for the same update and key", async () => {
    const work = vi.fn(() => Promise.resolve({ id: "e1" }));

    const first = await once(7, "save", work);
    const second = await once(7, "save", work);

    expect(work).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("keeps different updates and keys apart", () => {
    const work = vi.fn(() => "x");

    once(7, "save", work);
    once(8, "save", work);
    once(7, "delete", work);

    expect(work).toHaveBeenCalledTimes(3);
  });

  it("does not remember a failed attempt", async () => {
    const work = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce("saved");

    await expect(once(9, "save", work)).rejects.toThrow("db down");
    await Promise.resolve();
    await expect(once(9, "save", work)).resolves.toBe("saved");
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("remembers an empty result", () => {
    const work = vi.fn((): string | undefined => undefined);

    once(3, "pending", work);
    once(3, "pending", work);

    expect(work).toHaveBeenCalledTimes(1);
  });
});
