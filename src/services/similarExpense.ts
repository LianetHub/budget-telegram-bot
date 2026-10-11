import type { DateRange } from "./dates.js";

export type SimilarExpenseProbe = {
  category: string;
  amount: number;
  telegramId: bigint;
  createdAt: Date;
};

/** Same category + amount in range from another family member (not self). */
export function matchesSimilarExpenseToday(
  expense: SimilarExpenseProbe,
  input: {
    category: string;
    amount: number;
    excludeTelegramId: number;
    range: DateRange;
  },
): boolean {
  return (
    expense.category === input.category &&
    expense.amount === input.amount &&
    expense.telegramId !== BigInt(input.excludeTelegramId) &&
    expense.createdAt >= input.range.from &&
    expense.createdAt < input.range.to
  );
}
