import fs from "node:fs";
import path from "node:path";

const TEXT_CAP = 200;

export function getLogDir(): string {
  const override = process.env.BUDGET_LOG_DIR?.trim();
  if (override) return path.resolve(override);
  return path.resolve(process.cwd(), "logs");
}

function dayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function logFilePath(now = new Date()): string {
  return path.join(getLogDir(), `bot-${dayStamp(now)}.log`);
}

function ensureLogDir(): void {
  fs.mkdirSync(getLogDir(), { recursive: true });
}

export function clipLogText(value: string, max = TEXT_CAP): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function log(event: string, data: Record<string, unknown> = {}): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...data,
  };
  const line = JSON.stringify(entry);
  console.log(`[log] ${event}`, data);
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath(), `${line}\n`, "utf8");
  } catch (error) {
    console.error("Failed to write log file:", error);
  }
}

export function clearLogs(): { removed: number } {
  const dir = getLogDir();
  if (!fs.existsSync(dir)) {
    return { removed: 0 };
  }

  const names = fs.readdirSync(dir);
  let removed = 0;
  for (const name of names) {
    const full = path.join(dir, name);
    try {
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      fs.unlinkSync(full);
      removed += 1;
    } catch (error) {
      console.error(`Failed to remove log file ${name}:`, error);
    }
  }
  return { removed };
}

export function summarizeUpdate(update: {
  update_id: number;
  message?: { text?: string; from?: { id: number } };
  callback_query?: {
    data?: string;
    from?: { id: number };
    message?: { message_id?: number };
  };
  edited_message?: { text?: string; from?: { id: number } };
}): Record<string, unknown> {
  const base: Record<string, unknown> = { updateId: update.update_id };

  if (update.callback_query) {
    const cb = update.callback_query;
    return {
      ...base,
      type: "callback_query",
      telegramId: cb.from?.id,
      callbackData: cb.data,
      messageId: cb.message?.message_id,
    };
  }

  if (update.message) {
    return {
      ...base,
      type: "message",
      telegramId: update.message.from?.id,
      text: update.message.text ? clipLogText(update.message.text) : undefined,
    };
  }

  if (update.edited_message) {
    return {
      ...base,
      type: "edited_message",
      telegramId: update.edited_message.from?.id,
      text: update.edited_message.text
        ? clipLogText(update.edited_message.text)
        : undefined,
    };
  }

  return { ...base, type: "other" };
}
