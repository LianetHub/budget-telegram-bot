import dns from "node:dns";
import https from "node:https";
import tls from "node:tls";

/**
 * Beget resolves api.telegram.org to 149.154.166.110. From this VPS that
 * address accepts a TCP connection only now and then, so a button press waits
 * until the HTTP client gives up. 149.154.167.220 answers every time and
 * presents the same certificate, so it goes first and DNS answers follow as a
 * fallback.
 */
export const TELEGRAM_API_HOST = "api.telegram.org";
export const TELEGRAM_API_IP = "149.154.167.220";

/** Long poll waits 50s, so a healthy socket is never idle for longer. */
export const SOCKET_TIMEOUT_MS = 60_000;

/** How long one address gets before the next one is tried. */
export const ADDRESS_ATTEMPT_TIMEOUT_MS = 3_000;

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

type Resolver = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    addresses: dns.LookupAddress[],
  ) => void,
) => void;

const resolveFromDns: Resolver = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, callback);
};

export function orderTelegramAddresses(
  resolved: readonly dns.LookupAddress[],
): dns.LookupAddress[] {
  const addresses: dns.LookupAddress[] = [
    { address: TELEGRAM_API_IP, family: 4 },
  ];
  for (const entry of resolved) {
    if (entry.family !== 4) continue;
    if (addresses.some((known) => known.address === entry.address)) continue;
    addresses.push({ address: entry.address, family: 4 });
  }
  return addresses;
}

export function telegramLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback,
  resolve: Resolver = resolveFromDns,
): void {
  if (hostname !== TELEGRAM_API_HOST) {
    dns.lookup(hostname, options, (error, address, family) => {
      callback(error, address, family);
    });
    return;
  }

  resolve(hostname, { family: 4 }, (error, resolved) => {
    // A DNS failure is not fatal: the fixed address still works.
    const addresses = orderTelegramAddresses(error ? [] : resolved);
    if (options.all) {
      callback(null, addresses);
      return;
    }
    const first = addresses[0];
    callback(null, first?.address ?? TELEGRAM_API_IP, 4);
  });
}

export function createTelegramAgent(): https.Agent {
  // No keep-alive: a pooled socket that died during a quiet night would make
  // the first request wait for a timeout.
  const agent = new https.Agent({ keepAlive: false });

  agent.createConnection = (options) => {
    const hostname = options.servername ?? options.host ?? TELEGRAM_API_HOST;
    // Node accepts these net options in tls.connect; its typings omit them.
    const connectOptions: tls.ConnectionOptions & {
      autoSelectFamily: boolean;
      autoSelectFamilyAttemptTimeout: number;
    } = {
      host: hostname,
      port: Number(options.port ?? 443),
      servername: hostname,
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: ADDRESS_ATTEMPT_TIMEOUT_MS,
      lookup(host, lookupOptions, callback) {
        telegramLookup(host, lookupOptions, callback);
      },
    };
    const socket = tls.connect(connectOptions);

    socket.setTimeout(SOCKET_TIMEOUT_MS, () => {
      socket.destroy(new Error("Telegram API socket timed out"));
    });

    return socket;
  };

  return agent;
}
