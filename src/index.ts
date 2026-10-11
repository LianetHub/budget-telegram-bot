import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { createTelegramAgent } from "./bot/telegramAgent.js";
import { installCallTimeouts } from "./bot/telegramCalls.js";
import { ERROR_TEXT } from "./bot/copy.js";
import { retryKeyboard } from "./bot/keyboards.js";
import { rememberFailedUpdate } from "./bot/retry.js";
import { authMiddleware } from "./bot/middleware/auth.js";
import { dedupeMiddleware } from "./bot/middleware/dedupe.js";
import { loggingMiddleware } from "./bot/middleware/logging.js";
import { isRetryClick, registerRetryHandlers } from "./bot/handlers/retry.js";
import { registerStartHandlers } from "./bot/handlers/start.js";
import { registerExpenseHandlers } from "./bot/handlers/expense.js";
import { registerStatsHandlers } from "./bot/handlers/stats.js";
import { registerDeleteHandlers } from "./bot/handlers/delete.js";
import { log } from "./bot/logger.js";
import { prisma } from "./db/prisma.js";

const BOT_DESCRIPTION =
  "Семейный бюджет без таблиц и чеков. Трата записывается за 5 секунд: две кнопки или одно сообщение «Продукты 1500». Бот сам разложит расходы по категориям и покажет, сколько ушло сегодня, за месяц и кто сколько потратил.";

const BOT_ABOUT =
  "Семейные расходы без таблиц: запиши трату за 5 секунд и смотри, куда уходят деньги.";

installCallTimeouts();

const bot = new Telegraf(config.botToken, {
  telegram: { agent: createTelegramAgent() },
});

bot.catch(async (error, ctx) => {
  log("bot.error", {
    updateId: ctx.update.update_id,
    telegramId: ctx.from?.id,
    error: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
  if (!ctx.chat) return;
  try {
    // A failed retry click has nothing left to repeat, so it gets no button.
    if (isRetryClick(ctx.update)) {
      await ctx.reply(ERROR_TEXT);
      return;
    }
    const retryId = rememberFailedUpdate(ctx.update);
    await ctx.reply(ERROR_TEXT, retryKeyboard(retryId));
  } catch (replyError) {
    log("bot.error_reply_failed", {
      updateId: ctx.update.update_id,
      error:
        replyError instanceof Error ? replyError.message : String(replyError),
    });
  }
});

bot.use(loggingMiddleware);
bot.use(dedupeMiddleware);
bot.use(authMiddleware);

registerStartHandlers(bot);
registerRetryHandlers(bot);
registerStatsHandlers(bot);
registerDeleteHandlers(bot);
registerExpenseHandlers(bot);

const BOT_COMMANDS = [
  { command: "start", description: "Начать и показать возможности" },
  { command: "menu", description: "Главное меню" },
  { command: "clearlogs", description: "Очистить файлы логов" },
];

async function syncDescription(language?: string): Promise<void> {
  const current = await bot.telegram.getMyDescription(language);
  if (current.description !== BOT_DESCRIPTION) {
    await bot.telegram.setMyDescription(BOT_DESCRIPTION, language);
  }
}

async function syncShortDescription(language?: string): Promise<void> {
  const current = await bot.telegram.getMyShortDescription(language);
  if (current.short_description !== BOT_ABOUT) {
    await bot.telegram.setMyShortDescription(BOT_ABOUT, language);
  }
}

async function syncCommands(): Promise<void> {
  const current = await bot.telegram.getMyCommands();
  if (JSON.stringify(current) !== JSON.stringify(BOT_COMMANDS)) {
    await bot.telegram.setMyCommands(BOT_COMMANDS);
  }
}

async function publishProfileTexts(): Promise<void> {
  try {
    await Promise.all([
      syncDescription(),
      syncDescription("ru"),
      syncShortDescription(),
      syncShortDescription("ru"),
      syncCommands(),
    ]);
  } catch (error) {
    console.error("Failed to set bot profile texts:", error);
  }
}

async function main() {
  await publishProfileTexts();
  await bot.launch(() => {
    log("bot.started", {});
  });
}

main().catch(async (error) => {
  log("bot.start_failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  await prisma.$disconnect();
  process.exit(1);
});

process.once("SIGINT", () => {
  bot.stop("SIGINT");
  void prisma.$disconnect();
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  void prisma.$disconnect();
});
