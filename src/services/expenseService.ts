import { prisma } from "../db/prisma.js";

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
}) {
  const user = await upsertUser(input.telegramId, input.name);

  return prisma.expense.create({
    data: {
      userId: user.id,
      category: input.category,
      amount: input.amount,
      note: cleanNote(input.note),
    },
    include: { user: true },
  });
}

export async function hasAnyExpenses(): Promise<boolean> {
  const first = await prisma.expense.findFirst({ select: { id: true } });
  return first !== null;
}

export async function getOwnRecentExpenses(telegramId: number, limit: number) {
  return prisma.expense.findMany({
    where: { user: { telegramId: BigInt(telegramId) } },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}

export async function getExpenseById(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function deleteOwnExpense(id: string, telegramId: number) {
  const existing = await prisma.expense.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return { status: "missing" as const };
  }

  if (existing.user.telegramId !== BigInt(telegramId)) {
    return { status: "forbidden" as const };
  }

  const removed = await prisma.expense.deleteMany({
    where: { id, userId: existing.userId },
  });
  if (removed.count === 0) {
    return { status: "missing" as const };
  }

  return { status: "deleted" as const, expense: existing };
}
