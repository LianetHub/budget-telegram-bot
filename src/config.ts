import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value.trim();
}

function parseAllowedIds(raw: string): Set<number> {
  const ids = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(
      "ALLOWED_TELEGRAM_IDS must be a comma-separated list of positive integers",
    );
  }

  return new Set(ids);
}

function parseTimeZone(raw: string | undefined): string {
  const timeZone = raw?.trim() || "Europe/Moscow";
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`Invalid TIMEZONE: ${timeZone}`);
  }
  return timeZone;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  databaseUrl: required("DATABASE_URL"),
  allowedTelegramIds: parseAllowedIds(required("ALLOWED_TELEGRAM_IDS")),
  timezone: parseTimeZone(process.env.TIMEZONE),
};
