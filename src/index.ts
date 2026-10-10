import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { createTelegramAgent } from "./bot/telegramAgent.js";
import { installCallTimeouts } from "./bot/telegramCalls.js";
import { ERROR_TEXT } from "./bot/copy.js";
import { retryKeyboard } from "./bot/keyboards.js";
import { rememberFailedUpdate } from "./bot/retry.js";
import { authMiddleware } from "./bot/middleware/auth.js";
import { dedupeMiddleware } from "./bot/middleware/dedupe.js";
import { isRetryClick, registerRetryHandlers } from "./bot/handlers/retry.js";
import { registerStartHandlers } from "./bot/handlers/start.js";
import { registerExpenseHandlers } from "./bot/handlers/expense.js";
import { registerStatsHandlers } from "./bot/handlers/stats.js";
import { registerDeleteHandlers } from "./bot/handlers/delete.js";
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
  console.error(`Bot error for update ${ctx.update.update_id}:`, error);
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
    console.error("Failed to report the error to the user:", replyError);
  }
});

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
    console.log("Budget Wallet bot is running");
  });
}

main().catch(async (error) => {
  console.error("Failed to start bot:", error);
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
