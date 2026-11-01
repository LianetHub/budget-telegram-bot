import { prisma } from "../db/prisma.js";
import type { DateRange } from "./dates.js";

export async function upsertUser(telegramId: number, name: string) {
  return prisma.user.upsert({
    where: { telegramId: BigInt(telegramId) },
    create: {
      telegramId: BigInt(telegramId),
      name,
    },
    update: {
      name,
    },
  });
}

export function cleanNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const clean = note.replace(/\s+/gu, " ").trim();
  if (!clean) return null;
  return clean.length > 200 ? `${clean.slice(0, 199)}…` : clean;
}

export async function createExpense(input: {
  telegramId: number;
  name: string;
  category: string;
  amount: number;
  note?: string | null;
  spentAt: Date;
}) {
  const user = await upsertUser(input.telegramId, input.name);

  return prisma.expense.create({
    data: {
      userId: user.id,
      category: input.category,
      amount: input.amount,
      note: cleanNote(input.note),
      spentAt: input.spentAt,
    },
    include: { user: true },
  });
}

/** Same category + amount on the spent day from another family member. */
export async function findSimilarExpenseToday(input: {
  category: string;
  amount: number;
  excludeTelegramId: number;
  range: DateRange;
}) {
  return prisma.expense.findFirst({
    where: {
      category: input.category,
      amount: input.amount,
      spentAt: { gte: input.range.from, lt: input.range.to },
      user: { telegramId: { not: BigInt(input.excludeTelegramId) } },
    },
    orderBy: { spentAt: "desc" },
    include: { user: true },
  });
}

export async function hasAnyExpenses(): Promise<boolean> {
  const first = await prisma.expense.findFirst({ select: { id: true } });
  return first !== null;
}

export async function getExpenseById(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function updateExpense(
  id: string,
  data: {
    amount?: number;
    category?: string;
    note?: string | null;
    spentAt?: Date;
  },
) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return { status: "missing" as const };
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.note !== undefined ? { note: cleanNote(data.note) } : {}),
      ...(data.spentAt !== undefined ? { spentAt: data.spentAt } : {}),
    },
    include: { user: true },
  });
  return { status: "updated" as const, expense };
}

/** Any family member may delete any expense. */
export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return { status: "missing" as const };
  }

  const removed = await prisma.expense.deleteMany({ where: { id } });
  if (removed.count === 0) {
    return { status: "missing" as const };
  }

  return { status: "deleted" as const, expense: existing };
}

/** Earliest spent day for the calendar lower bound. */
export async function getEarliestSpendDate(): Promise<Date | null> {
  const earliestExpense = await prisma.expense.findFirst({
    orderBy: { spentAt: "asc" },
    select: { spentAt: true },
  });
  if (earliestExpense) return earliestExpense.spentAt;

  const earliestUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return earliestUser?.createdAt ?? null;
}
