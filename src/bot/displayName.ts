import type { Context } from "telegraf";

export function displayName(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "Пользователь";
  return (
    [from.first_name, from.last_name].filter(Boolean).join(" ") ||
    from.username ||
    "Пользователь"
  );
}
