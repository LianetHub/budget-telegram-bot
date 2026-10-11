import type { Category } from "../services/categories.js";

export const TEXT_EXAMPLE = "Продукты 1500";

const FREE_WORDS_HINT =
  "Можно своими словами: «комиксы 2800» попадёт в «Развлечения», а слово «комиксы» сохранится как пояснение.";

export function mainScreen(lead?: string, hasExpenses = true): string {
  const body = hasExpenses
    ? [
        "📊 Статистика — сколько ушло сегодня, за месяц и по категориям.",
        "➕ Добавить трату — две кнопки, и расход записан.",
        "🗑 Удалить запись — убрать ошибочную трату.",
        "",
        `Быстрее всего написать сообщением: ${TEXT_EXAMPLE}`,
      ]
    : [
        "Записей пока нет. Первая трата займёт 5 секунд:",
        `нажми «Добавить трату» или напиши «${TEXT_EXAMPLE}».`,
      ];
  const text = body.join("\n");
  if (!lead) return text;
  return `${lead}\n\n${text}`;
}

export function startText(name: string, hasExpenses: boolean): string {
  return [
    `Привет, ${name}!`,
    hasExpenses
      ? "Здесь вся семья видит, куда уходят деньги, без таблиц и чеков."
      : "Здесь вся семья будет видеть, куда уходят деньги, без таблиц и чеков.",
    "",
    mainScreen(undefined, hasExpenses),
    "",
    FREE_WORDS_HINT,
  ].join("\n");
}

export const PARSE_HELP = [
  "Не понял, что записать.",
  "",
  `Напиши категорию и сумму: ${TEXT_EXAMPLE}`,
  "Или нажми «Добавить трату» и выбери категорию.",
].join("\n");

type CategoryLabel = Pick<Category, "emoji" | "name" | "details">;

function amountExamples(category: CategoryLabel | undefined): string[] {
  const detail = category?.details[0];
  return [
    "Напиши сумму, например: 1500",
    ...(detail ? [`С пояснением: 1500 ${detail}`] : []),
  ];
}

export function amountPrompt(category: CategoryLabel): string {
  return [
    `${category.emoji} ${category.name}`,
    "",
    ...amountExamples(category),
  ].join("\n");
}

export function amountHelp(category?: CategoryLabel): string {
  return ["Не понял сумму.", "", ...amountExamples(category)].join("\n");
}

export const CATEGORY_PROMPT = "На что потратили?\nВыбери категорию.";

export const DELETE_PROMPT =
  "Какую запись убрать? Нажми на неё.\nЗдесь только твои последние записи.";

export const STALE_BUTTON = "Кнопка устарела, открыл меню заново.";

export const EXPENSE_GONE = "Этой записи уже нет.";

export const FOREIGN_EXPENSE =
  "Эту запись добавил другой человек. Убрать можно только свою.";

export const NO_OWN_EXPENSES = "Твоих записей пока нет. Чужие убрать нельзя.";

export const ERROR_TEXT = "Что-то пошло не так. Попробуй ещё раз.";

export function accessDeniedText(telegramId: number | undefined): string {
  const lines = ["Этот бот только для своих: у тебя пока нет доступа."];
  if (telegramId !== undefined) {
    lines.push(
      `Твой Telegram ID: ${telegramId}. Передай его владельцу бота, чтобы получить доступ.`,
    );
  }
  return lines.join("\n");
}

export function unknownCategoryPrompt(
  label: string,
  amountLabel: string,
): string {
  return [
    `Не знаю, куда отнести «${label}».`,
    `Выбери категорию: сумма ${amountLabel} сохранится, а «${label}» станет пояснением.`,
  ].join("\n");
}

export function deleteConfirmText(details: string): string {
  return [
    "Убрать эту запись?",
    "",
    "Да — удалить. Нет — оставить.",
    "",
    details,
  ].join("\n");
}

export function duplicateConfirmText(details: string): string {
  return [
    "Член семьи уже внёс похожую трату за сегодня.",
    "Точно добавить такую же?",
    "",
    details,
  ].join("\n");
}

export const LOGS_CLEARED = "Логи очищены.";
export const LOGS_EMPTY = "Логов пока нет.";
