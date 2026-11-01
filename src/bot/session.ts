type MessageRef = {
  chatId?: number;
  messageId?: number;
};

export type ExpenseDraft = {
  category: string;
  amount: number;
  note: string | null;
};

export type Pending =
  | ({
      kind: "amount";
      categorySlug: string;
    } & MessageRef)
  | ({
      kind: "pick";
      amount: number;
      note: string;
    } & MessageRef)
  | ({
      kind: "confirmDup";
      category: string;
      amount: number;
      note: string | null;
      spentAt: Date;
    } & MessageRef)
  | ({
      kind: "pickWhen";
      draft: ExpenseDraft;
    } & MessageRef)
  | ({
      kind: "pickDate";
      purpose: "add";
      draft: ExpenseDraft;
      year: number;
      month: number;
    } & MessageRef)
  | ({
      kind: "pickDate";
      purpose: "edit";
      expenseId: string;
      year: number;
      month: number;
    } & MessageRef)
  | ({
      kind: "editAmount";
      expenseId: string;
    } & MessageRef)
  | ({
      kind: "editNote";
      expenseId: string;
    } & MessageRef)
  | ({
      kind: "editCategory";
      expenseId: string;
    } & MessageRef);

export const PENDING_TTL_MS = 15 * 60 * 1000;

const pendingByUser = new Map<
  number,
  { pending: Pending; expiresAt: number }
>();

export function getPending(telegramId: number): Pending | undefined {
  const entry = pendingByUser.get(telegramId);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    pendingByUser.delete(telegramId);
    return undefined;
  }
  return entry.pending;
}

export function setPending(telegramId: number, pending: Pending): void {
  pendingByUser.set(telegramId, {
    pending,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

export function clearPending(telegramId: number): void {
  pendingByUser.delete(telegramId);
}
