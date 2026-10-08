import { config } from "../config.js";
import { prisma } from "../db/prisma.js";
import {
  currentMonthParts,
  currentMonthRange,
  monthRange,
  parseMonthKey,
  todayRange,
  zonedMonthKey,
  type DateRange,
} from "./dates.js";

export type Totals = {
  total: number;
  count: number;
};

export type CategoryTotal = {
  category: string;
  total: number;
  count: number;
};

export type SpenderTotal = {
  name: string;
  total: number;
  count: number;
};

export type MonthSummary = {
  key: string;
  year: number;
  month: number;
  total: number;
  count: number;
};

const expenseWithUser = { user: true } as const;

export function getTodayRange(now = new Date()): DateRange {
  return todayRange(config.timezone, now);
}

export function getCurrentMonthRange(now = new Date()): DateRange {
  return currentMonthRange(config.timezone, now);
}

export function getNamedMonthRange(year: number, month: number): DateRange {
  return monthRange(year, month, config.timezone);
}

export function getCurrentMonthParts(now = new Date()) {
  return currentMonthParts(config.timezone, now);
}

export async function getRangeTotals(range: DateRange): Promise<Totals> {
  const result = await prisma.expense.aggregate({
    where: { createdAt: { gte: range.from, lt: range.to } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return {
    total: result._sum.amount ?? 0,
    count: result._count._all,
  };
}

export async function getAllTimeTotals(): Promise<Totals> {
  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    _count: { _all: true },
  });

  return {
    total: result._sum.amount ?? 0,
    count: result._count._all,
  };
}

export async function getCategoryBreakdown(
  range: DateRange,
): Promise<CategoryTotal[]> {
  const groups = await prisma.expense.groupBy({
    by: ["category"],
    where: { createdAt: { gte: range.from, lt: range.to } },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  return groups.map((group) => ({
    category: group.category,
    total: group._sum.amount ?? 0,
    count: group._count._all,
  }));
}

export async function getSpenders(range: DateRange): Promise<SpenderTotal[]> {
  const groups = await prisma.expense.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: range.from, lt: range.to } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  if (groups.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((group) => group.userId) } },
  });
  const names = new Map(users.map((user) => [user.id, user.name]));

  return groups
    .map((group) => ({
      name: names.get(group.userId) ?? "Пользователь",
      total: group._sum.amount ?? 0,
      count: group._count._all,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function listExpenses(range: DateRange) {
  return prisma.expense.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    orderBy: { createdAt: "asc" },
    include: expenseWithUser,
  });
}

export async function listMonthSummaries(): Promise<MonthSummary[]> {
  const rows = await prisma.expense.findMany({
    select: { createdAt: true, amount: true },
  });

  const buckets = new Map<string, MonthSummary>();
  for (const row of rows) {
    const key = zonedMonthKey(row.createdAt, config.timezone);
    const parts = parseMonthKey(key);
    if (!parts) continue;

    const bucket = buckets.get(key) ?? {
      key,
      year: parts.year,
      month: parts.month,
      total: 0,
      count: 0,
    };
    bucket.total += row.amount;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}
