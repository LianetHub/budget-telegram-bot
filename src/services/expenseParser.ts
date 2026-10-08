export type ParsedExpense = {
  label: string;
  /** Amount in kopecks */
  amount: number;
};

export type ParsedAmount = {
  /** Amount in kopecks */
  amount: number;
  note: string | null;
};

const MAX_KOPECKS = 2_147_483_647;

/**
 * Supports:
 * - "Продукты - 1500"
 * - "продукты 1500"
 * - "Такси—500"
 * - "Кофе 1500.50" / "Кофе 1500,50"
 * - "комиксы 2800"
 */
export function parseExpenseText(text: string): ParsedExpense | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("/")) {
    return null;
  }

  const match = trimmed.match(
    /^(.+?)(?:\s*[-–—]\s*|\s+)(\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?|rubles?)?$/iu,
  );

  if (!match) {
    return null;
  }

  const label = match[1]?.trim() ?? "";
  const amountRaw = match[2];

  if (!label || label.length > 100 || !amountRaw) {
    return null;
  }

  if (/^\d+(?:[.,]\d{1,2})?$/u.test(label)) {
    return null;
  }

  const amount = parseAmountToKopecks(amountRaw);
  if (amount === null) {
    return null;
  }

  return { label, amount };
}

/** Amount first, optional note: "2800", "2800 комиксы", "1500,50 хлеб". */
export function parseAmountInput(text: string): ParsedAmount | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("/")) {
    return null;
  }

  const match = trimmed.match(
    /^(\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?|rubles?)?(?:\s+(.+))?$/iu,
  );
  if (!match?.[1]) {
    return null;
  }

  const amount = parseAmountToKopecks(match[1]);
  if (amount === null) {
    return null;
  }

  const note = match[2]?.trim() || null;
  return { amount, note };
}

function parseAmountToKopecks(raw: string): number | null {
  const normalized = raw.replace(",", ".");
  const parts = normalized.split(".");

  if (parts.length > 2) {
    return null;
  }

  const rubles = Number(parts[0]);
  if (!Number.isInteger(rubles) || rubles < 0) {
    return null;
  }

  let kopecks = 0;
  if (parts.length === 2) {
    const fraction = parts[1] ?? "";
    if (!/^\d{1,2}$/u.test(fraction)) {
      return null;
    }
    kopecks = Number(fraction.padEnd(2, "0"));
  }

  const amount = rubles * 100 + kopecks;
  if (amount <= 0 || amount > MAX_KOPECKS) {
    return null;
  }

  return amount;
}

export function formatAmount(kopecks: number): string {
  const rubles = Math.trunc(kopecks / 100);
  const rest = Math.abs(kopecks % 100);
  if (rest === 0) {
    return `${rubles.toLocaleString("ru-RU")} ₽`;
  }
  return `${rubles.toLocaleString("ru-RU")},${String(rest).padStart(2, "0")} ₽`;
}
