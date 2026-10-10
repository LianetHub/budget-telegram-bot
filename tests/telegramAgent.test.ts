import { describe, expect, it } from "vitest";
import {
  TELEGRAM_API_HOST,
  TELEGRAM_API_IP,
  orderTelegramAddresses,
  telegramLookup,
} from "../src/bot/telegramAgent.js";

const DNS_ADDRESS = "149.154.166.110";

describe("orderTelegramAddresses", () => {
  it("puts the reachable address first and keeps DNS answers as fallback", () => {
    expect(
      orderTelegramAddresses([{ address: DNS_ADDRESS, family: 4 }]),
    ).toEqual([
      { address: TELEGRAM_API_IP, family: 4 },
      { address: DNS_ADDRESS, family: 4 },
    ]);
  });

  it("does not repeat an address and skips IPv6", () => {
    expect(
      orderTelegramAddresses([
        { address: TELEGRAM_API_IP, family: 4 },
        { address: "2001:67c:4e8:f004::9", family: 6 },
      ]),
    ).toEqual([{ address: TELEGRAM_API_IP, family: 4 }]);
  });
});

describe("telegramLookup", () => {
  it("returns every address when Node asks for all of them", () => {
    telegramLookup(
      TELEGRAM_API_HOST,
      { all: true },
      (error, address) => {
        expect(error).toBeNull();
        expect(address).toEqual([
          { address: TELEGRAM_API_IP, family: 4 },
          { address: DNS_ADDRESS, family: 4 },
        ]);
      },
      (_host, _options, done) => {
        done(null, [{ address: DNS_ADDRESS, family: 4 }]);
      },
    );
  });

  it("returns the reachable address for a single-address lookup", () => {
    telegramLookup(
      TELEGRAM_API_HOST,
      {},
      (error, address, family) => {
        expect(error).toBeNull();
        expect(address).toBe(TELEGRAM_API_IP);
        expect(family).toBe(4);
      },
      (_host, _options, done) => {
        done(null, [{ address: DNS_ADDRESS, family: 4 }]);
      },
    );
  });

  it("still works when DNS fails", () => {
    telegramLookup(
      TELEGRAM_API_HOST,
      { all: true },
      (error, address) => {
        expect(error).toBeNull();
        expect(address).toEqual([{ address: TELEGRAM_API_IP, family: 4 }]);
      },
      (_host, _options, done) => {
        done(new Error("dns down"), []);
      },
    );
  });
});
