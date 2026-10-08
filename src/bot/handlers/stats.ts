import type { Context, Telegraf } from "telegraf";
import { config } from "../../config.js";
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
  listMonthSummaries,
} from "../../services/statsService.js";
import { clip, fitLines, monthsCount, recordsCount, share } from "../format.js";
import { presentMain } from "../presentMain.js";
import {
  CALLBACK,
  MONTH_BUTTON_LIMIT,
  backKeyboard,
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

async function renderCategories(): Promise<string> {
  const now = new Date();
  const parts = getCurrentMonthParts(now);
  const title = `По категориям — ${formatMonthTitle(parts.year, parts.month, config.timezone)}`;
  const categories = await getCategoryBreakdown(getCurrentMonthRange(now));
  if (categories.length === 0) {
    return `${title}\n\n${EMPTY}`;
  }
  const totals = categories.reduce(
    (sum, category) => ({
      total: sum.total + category.total,
      count: sum.count + category.count,
    }),
    { total: 0, count: 0 },
  );
  return fitLines(
    [title, "", totalsBlock(totals.total, totals.count)].join("\n"),
    categoryLines(categories, totals.total),
  );
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

export function registerStatsHandlers(bot: Telegraf<Context>) {
  bot.action(CALLBACK.STATS, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    if (!(await hasAnyExpenses())) {
      await presentMain(ctx);
      return;
    }
    await showScreen(
      ctx,
      "Что посмотреть?\nСегодня, месяц или вся история — и кто сколько потратил.",
      statsMenuKeyboard(),
    );
  });

  bot.action(CALLBACK.TODAY, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await showScreen(ctx, await renderToday(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(CALLBACK.MONTH, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const parts = getCurrentMonthParts();
    await showScreen(
      ctx,
      await renderMonth(parts.year, parts.month),
      backKeyboard(CALLBACK.STATS),
    );
  });

  bot.action(CALLBACK.ALL, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await showScreen(ctx, await renderAllTime(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(CALLBACK.MONTHS, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const months = await listMonthSummaries();
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
    await showScreen(
      ctx,
      await renderCategories(),
      backKeyboard(CALLBACK.STATS),
    );
  });

  bot.action(CALLBACK.PEOPLE, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    await showScreen(ctx, await renderPeople(), backKeyboard(CALLBACK.STATS));
  });

  bot.action(/^mo:(\d{4}-\d{2})$/u, async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await dismissPending(ctx, ctx.from?.id);
    const key = ctx.match[1];
    const parts = key ? parseMonthKey(key) : null;
    if (!parts) return;
    await showScreen(
      ctx,
      await renderMonth(parts.year, parts.month),
      backKeyboard(CALLBACK.MONTHS),
    );
  });
}
