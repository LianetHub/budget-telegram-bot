import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
import {
  getCategoryByName,
  getCategoryBySlug,
} from "../../services/categories.js";
import { hasAnyExpenses } from "../../services/expenseService.js";
import { formatAmount } from "../../services/expenseParser.js";
import {
  formatClock,
  formatDayTitle,
  formatMonthTitle,
  parseMonthKey,
} from "../../services/dates.js";
import {
  getAllTimeTotals,
  getCategoryBreakdown,
  getCurrentMonthParts,
  getCurrentMonthRange,
  getNamedMonthRange,
  getRangeTotals,
  getSpenders,
  getTodayRange,
  listExpenses,
  listExpensesByCategory,
  listMonthSummaries,
} from "../../services/statsService.js";
import { clip, fitLines, monthsCount, recordsCount, share } from "../format.js";
import { log } from "../logger.js";
import { presentMain } from "../presentMain.js";
import {
  CALLBACK,
  MONTH_BUTTON_LIMIT,
  backKeyboard,
  categoryStatsKeyboard,
  monthListKeyboard,
  statsMenuKeyboard,
} from "../keyboards.js";
import { safeAnswerCbQuery } from "../safeAnswerCbQuery.js";
import { dismissPending, showScreen } from "../screen.js";

const EMPTY = "Записей нет.";

function totalsBlock(total: number, count: number): string {
  return `Сумма: ${formatAmount(total)} — ${recordsCount(count)}`;
}

function shareLine(
  label: string,
  part: { total: number; count: number },
  total: number,
): string {
  return `• ${label}: ${formatAmount(part.total)} · ${share(part.total, total)} · ${recordsCount(part.count)}`;
}

function categoryLines(
  categories: { category: string; total: number; count: number }[],
  total: number,
): string[] {
  return categories.map((category) =>
    shareLine(category.category, category, total),
  );
}

async function renderToday(): Promise<string> {
  const now = new Date();
  const range = getTodayRange(now);
  const expenses = await listExpenses(range);
  const title = `Сегодня, ${formatDayTitle(now, config.timezone)}`;
  if (expenses.length === 0) {
    return `${title}\n\nСегодня трат ещё нет.`;
  }

  const lines = expenses.map((expense) => {
    const note = expense.note ? ` — ${clip(expense.note, 80)}` : "";
    return `• ${formatClock(expense.createdAt, config.timezone)} — ${expense.category}: ${formatAmount(expense.amount)}${note} (${expense.user.name})`;
  });
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return fitLines(title, lines, totalsBlock(total, expenses.length));
}

async function renderMonth(year: number, month: number): Promise<string> {
  const range = getNamedMonthRange(year, month);
  const title = formatMonthTitle(year, month, config.timezone);
  const totals = await getRangeTotals(range);
  if (totals.count === 0) {
    return `${title}\n\n${EMPTY}`;
  }

  const categories = await getCategoryBreakdown(range);
  return fitLines(
    [title, "", totalsBlock(totals.total, totals.count)].join("\n"),
    ["По категориям:", ...categoryLines(categories, totals.total)],
  );
}

async function renderAllTime(): Promise<string> {
  const totals = await getAllTimeTotals();
  if (totals.count === 0) {
    return `За всё время\n\n${EMPTY}`;
  }
  return ["За всё время", "", totalsBlock(totals.total, totals.count)].join(
    "\n",
  );
}

async function renderCategories(): Promise<{
  text: string;
  buttons: { slug: string; label: string }[];
}> {
  const now = new Date();
  const parts = getCurrentMonthParts(now);
  const title = `По категориям — ${formatMonthTitle(parts.year, parts.month, config.timezone)}`;
  const categories = await getCategoryBreakdown(getCurrentMonthRange(now));
  if (categories.length === 0) {
    return { text: `${title}\n\n${EMPTY}`, buttons: [] };
  }
  const totals = categories.reduce(
    (sum, category) => ({
      total: sum.total + category.total,
      count: sum.count + category.count,
    }),
    { total: 0, count: 0 },
  );
  const text = fitLines(
    [title, "", totalsBlock(totals.total, totals.count)].join("\n"),
    [
      ...categoryLines(categories, totals.total),
      "",
      "Нажми категорию — кто и когда.",
    ],
  );
  const buttons = categories.flatMap((item) => {
    const known = getCategoryByName(item.category);
    if (!known) return [];
    return [
      {
        slug: known.slug,
        label: `${known.emoji} ${known.name} · ${formatAmount(item.total)}`,
      },
    ];
  });
  return { text, buttons };
}

async function renderCategoryDetail(slug: string): Promise<string | null> {
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  const now = new Date();
  const parts = getCurrentMonthParts(now);
  const title = `${category.emoji} ${category.name} — ${formatMonthTitle(parts.year, parts.month, config.timezone)}`;
  const expenses = await listExpensesByCategory(
    getCurrentMonthRange(now),
    category.name,
  );
  if (expenses.length === 0) {
    return `${title}\n\n${EMPTY}`;
  }

  const lines = expenses.map((expense) => {
    const note = expense.note ? ` — ${clip(expense.note, 80)}` : "";
    return `• ${formatClock(expense.createdAt, config.timezone)} — ${formatAmount(expense.amount)}${note} (${expense.user.name})`;
  });
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return fitLines(title, lines, totalsBlock(total, expenses.length));
}

async function renderPeople(): Promise<string> {
  const now = new Date();
  const parts = getCurrentMonthParts(now);
  const title = `Кто потратил — ${formatMonthTitle(parts.year, parts.month, config.timezone)}`;
  const spenders = await getSpenders(getCurrentMonthRange(now));
  if (spenders.length === 0) {
    return `${title}\n\n${EMPTY}`;
  }
  const total = spenders.reduce((sum, spender) => sum + spender.total, 0);
  const count = spenders.reduce((sum, spender) => sum + spender.count, 0);
  const lines = spenders.map((spender) =>
    shareLine(spender.name, spender, total),
  );
  return [title, "", totalsBlock(total, count), "", ...lines].join("\n");
}

async function showCategoriesScreen(ctx: Context): Promise<void> {
  const { text, buttons } = await renderCategories();
  await showScreen(
    ctx,
    text,
    buttons.length > 0
      ? categoryStatsKeyboard(buttons)
      : backKeyboard(CALLBACK.STATS),
  );
}

export function registerStatsHandlers(bot: Telegraf<Context>) {
  bot.action(CALLBACK.STATS, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    if (!(await hasAnyExpenses())) {
      await presentMain(ctx);
      return;
    }
    log("stats.menu", { telegramId: ctx.from?.id });
    await showScreen(
      ctx,
      "Что посмотреть?\nСегодня, месяц или вся история — и кто сколько потратил.",
      statsMenuKeyboard(),
    );
  });

  bot.action(CALLBACK.TODAY, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    log("stats.today", { telegramId: ctx.from?.id });
    await showScreen(ctx, await renderToday(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(CALLBACK.MONTH, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const parts = getCurrentMonthParts();
    log("stats.month", { telegramId: ctx.from?.id });
    await showScreen(
      ctx,
      await renderMonth(parts.year, parts.month),
      backKeyboard(CALLBACK.STATS),
    );
  });

  bot.action(CALLBACK.ALL, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    log("stats.all", { telegramId: ctx.from?.id });
    await showScreen(ctx, await renderAllTime(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(CALLBACK.MONTHS, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const months = await listMonthSummaries();
    log("stats.months", { telegramId: ctx.from?.id, count: months.length });
    if (months.length === 0) {
      await showScreen(
        ctx,
        `По месяцам\n\n${EMPTY}`,
        backKeyboard(CALLBACK.STATS),
      );
      return;
    }

    const visible = months.slice(0, MONTH_BUTTON_LIMIT);
    const hidden = months.length - visible.length;
    const intro = [
      "По месяцам",
      "",
      hidden > 0
        ? `Показаны последние ${monthsCount(visible.length)}. Выбери месяц.`
        : "Выбери месяц.",
    ].join("\n");
    await showScreen(
      ctx,
      intro,
      monthListKeyboard(
        visible.map((month) => ({
          key: month.key,
          label: `${formatMonthTitle(month.year, month.month, config.timezone)} · ${formatAmount(month.total)}`,
        })),
      ),
    );
  });

  bot.action(CALLBACK.CATEGORIES, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    log("stats.categories", { telegramId: ctx.from?.id });
    await showCategoriesScreen(ctx);
  });

  bot.action(/^st:cat:([a-z]+)$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const slug = ctx.match[1];
    if (!slug) return;
    log("stats.category_detail", { telegramId: ctx.from?.id, slug });
    const text = await renderCategoryDetail(slug);
    if (!text) {
      await showCategoriesScreen(ctx);
      return;
    }
    await showScreen(ctx, text, backKeyboard(CALLBACK.CATEGORIES));
  });

  bot.action(CALLBACK.PEOPLE, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    log("stats.people", { telegramId: ctx.from?.id });
    await showScreen(ctx, await renderPeople(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(/^mo:(\d{4}-\d{2})$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const key = ctx.match[1];
    const parts = key ? parseMonthKey(key) : null;
    if (!parts) return;
    log("stats.named_month", { telegramId: ctx.from?.id, key });
    await showScreen(
      ctx,
      await renderMonth(parts.year, parts.month),
      backKeyboard(CALLBACK.MONTHS),
    );
  });
}
