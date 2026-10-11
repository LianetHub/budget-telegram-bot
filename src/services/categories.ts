export type Category = {
  slug: string;
  name: string;
  emoji: string;
  names: readonly string[];
  details: readonly string[];
};

export type ResolvedCategory = {
  category: Category;
  note: string | null;
};

export const CATEGORIES: readonly Category[] = [
  {
    slug: "products",
    name: "Продукты",
    emoji: "🛒",
    names: ["продукты", "продукт", "еда", "магазин", "супермаркет"],
    details: [
      "пятерочка",
      "магнит",
      "перекресток",
      "лента",
      "ашан",
      "вкусвилл",
      "дикси",
      "овощи",
      "фрукты",
      "бакалея",
    ],
  },
  {
    slug: "cafe",
    name: "Кафе и рестораны",
    emoji: "🍽️",
    names: ["кафе", "ресторан", "рестораны", "столовая"],
    details: [
      "обед",
      "ужин",
      "завтрак",
      "бургер",
      "суши",
      "пицца",
      "додо",
      "шаурма",
      "фастфуд",
      "бар",
    ],
  },
  {
    slug: "coffee",
    name: "Кофе",
    emoji: "☕",
    names: ["кофе", "кофейня"],
    details: ["капучино", "латте", "американо", "эспрессо", "раф", "старбакс"],
  },
  {
    slug: "taxi",
    name: "Такси",
    emoji: "🚕",
    names: ["такси"],
    details: [
      "яндекс такси",
      "яндекс го",
      "ситимобил",
      "убер",
      "uber",
      "максим",
    ],
  },
  {
    slug: "transit",
    name: "Транспорт",
    emoji: "🚇",
    names: ["транспорт", "метро", "автобус", "проездной"],
    details: [
      "трамвай",
      "троллейбус",
      "электричка",
      "маршрутка",
      "аэроэкспресс",
    ],
  },
  {
    slug: "auto",
    name: "Авто",
    emoji: "⛽",
    names: ["авто", "бензин", "машина"],
    details: [
      "заправка",
      "парковка",
      "мойка",
      "шиномонтаж",
      "каршеринг",
      "делимобиль",
    ],
  },
  {
    slug: "housing",
    name: "Жильё",
    emoji: "🏠",
    names: ["жилье", "аренда", "ипотека", "квартира"],
    details: ["съем"],
  },
  {
    slug: "utilities",
    name: "Коммуналка",
    emoji: "💡",
    names: ["коммуналка", "жкх", "электричество", "отопление"],
    details: ["квартплата", "свет", "вода", "газ"],
  },
  {
    slug: "telecom",
    name: "Связь",
    emoji: "📱",
    names: ["связь", "интернет", "телефон"],
    details: [
      "мобильная связь",
      "мтс",
      "билайн",
      "мегафон",
      "теле2",
      "ростелеком",
      "вайфай",
    ],
  },
  {
    slug: "fun",
    name: "Развлечения",
    emoji: "🎬",
    names: ["развлечения", "развлечение", "досуг"],
    details: [
      "комиксы",
      "комикс",
      "кино",
      "фильм",
      "сериал",
      "игры",
      "игра",
      "концерт",
      "театр",
      "клуб",
      "бильярд",
      "боулинг",
      "квест",
      "музей",
      "цирк",
      "аттракционы",
    ],
  },
  {
    slug: "clothes",
    name: "Одежда",
    emoji: "👕",
    names: ["одежда", "обувь"],
    details: ["кроссовки", "куртка", "платье", "джинсы", "белье"],
  },
  {
    slug: "health",
    name: "Здоровье",
    emoji: "💊",
    names: ["здоровье", "аптека", "врач", "лекарства"],
    details: [
      "анализы",
      "стоматолог",
      "больница",
      "клиника",
      "таблетки",
      "витамины",
    ],
  },
  {
    slug: "beauty",
    name: "Красота",
    emoji: "💇",
    names: ["красота", "парикмахер", "косметика"],
    details: ["стрижка", "маникюр", "барбер", "педикюр"],
  },
  {
    slug: "sport",
    name: "Спорт",
    emoji: "🏋️",
    names: ["спорт", "фитнес", "тренажерный зал"],
    details: ["бассейн", "йога", "абонемент", "тренировка", "зал"],
  },
  {
    slug: "education",
    name: "Образование",
    emoji: "🎓",
    names: ["образование", "учеба", "курсы"],
    details: ["книга", "книги", "учебник", "репетитор"],
  },
  {
    slug: "gifts",
    name: "Подарки",
    emoji: "🎁",
    names: ["подарки", "подарок"],
    details: ["цветы", "сувенир", "открытка"],
  },
  {
    slug: "kids",
    name: "Дети",
    emoji: "👶",
    names: ["дети", "ребенок"],
    details: ["подгузники", "няня", "садик", "игрушки"],
  },
  {
    slug: "pets",
    name: "Питомцы",
    emoji: "🐾",
    names: ["питомцы", "питомец", "кот", "кошка", "собака"],
    details: ["корм", "ветеринар", "ветклиника", "наполнитель"],
  },
  {
    slug: "travel",
    name: "Поездки",
    emoji: "✈️",
    names: ["поездки", "поездка", "путешествие", "отпуск"],
    details: ["отель", "гостиница", "авиабилеты", "самолет"],
  },
  {
    slug: "subs",
    name: "Подписки",
    emoji: "🔁",
    names: ["подписки", "подписка"],
    details: [
      "нетфликс",
      "netflix",
      "спотифай",
      "spotify",
      "яндекс плюс",
      "кинопоиск",
      "ютуб премиум",
    ],
  },
  {
    slug: "household",
    name: "Дом и быт",
    emoji: "🛠️",
    names: ["быт", "хозтовары", "ремонт"],
    details: ["мебель", "икеа", "леруа", "посуда"],
  },
  {
    slug: "debt",
    name: "Долги",
    emoji: "💳",
    names: ["долги", "долг", "кредит"],
    details: ["рассрочка", "займ", "микрозайм"],
  },
  {
    slug: "other",
    name: "Прочее",
    emoji: "📦",
    names: ["прочее", "другое", "разное"],
    details: [],
  },
];

const MIN_MIDDLE_MATCH = 5;

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function wordPattern(keyword: string): RegExp {
  return new RegExp(`(?:^|\\s)${escapeRegExp(keyword)}(?:\\s|$)`, "u");
}

function matchesKeyword(label: string, keyword: string): boolean {
  if (keyword.length < 4 || !wordPattern(keyword).test(label)) return false;
  return keyword.length >= MIN_MIDDLE_MATCH || label.startsWith(`${keyword} `);
}

function stripKeyword(rawLabel: string, keyword: string): string {
  const words = rawLabel.trim().split(/\s+/u);
  const target = keyword.split(" ");
  for (let start = 0; start + target.length <= words.length; start += 1) {
    const hit = target.every(
      (part, offset) => normalize(words[start + offset] ?? "") === part,
    );
    if (hit) {
      words.splice(start, target.length);
      break;
    }
  }
  return words.join(" ");
}

function assertUniqueAliases(categories: readonly Category[]): void {
  const seen = new Map<string, string>();
  for (const category of categories) {
    const words = [category.name, ...category.names, ...category.details];
    for (const word of words) {
      const key = normalize(word);
      const owner = seen.get(key);
      if (owner && owner !== category.slug) {
        throw new Error(
          `Alias "${word}" belongs to both ${owner} and ${category.slug}`,
        );
      }
      seen.set(key, category.slug);
    }
  }
}

assertUniqueAliases(CATEGORIES);

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getCategoryByName(name: string): Category | undefined {
  return CATEGORIES.find((category) => category.name === name);
}

type AliasHit = {
  category: Category;
  keyword: string;
  kind: "name" | "detail";
};

function findPartial(label: string): AliasHit | null {
  let best: AliasHit | null = null;
  for (const category of CATEGORIES) {
    const groups = [
      { kind: "name" as const, words: [category.name, ...category.names] },
      { kind: "detail" as const, words: category.details },
    ];
    for (const group of groups) {
      for (const word of group.words) {
        const keyword = normalize(word);
        if (!matchesKeyword(label, keyword)) continue;
        if (!best || keyword.length > best.keyword.length) {
          best = { category, keyword, kind: group.kind };
        }
      }
    }
  }
  return best;
}

export function resolveCategory(rawLabel: string): ResolvedCategory | null {
  const label = normalize(rawLabel);
  if (!label) return null;

  for (const category of CATEGORIES) {
    const names = [category.name, ...category.names];
    if (names.some((name) => normalize(name) === label)) {
      return { category, note: null };
    }
  }

  for (const category of CATEGORIES) {
    if (category.details.some((detail) => normalize(detail) === label)) {
      return { category, note: rawLabel.trim() };
    }
  }

  const partial = findPartial(label);
  if (!partial) return null;

  if (partial.kind === "detail") {
    return { category: partial.category, note: rawLabel.trim() };
  }

  const rest = stripKeyword(rawLabel, partial.keyword);
  return { category: partial.category, note: rest || null };
}
