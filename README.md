# Budget Wallet Details Bot

Telegram-бот для общего учёта расходов. Трата пишется текстом или выбирается кнопкой категории. Статистика открывается в том же сообщении. Доступ только по Telegram ID и только в личке.

## Локально

```bash
npm install
cp .env.example .env
npm run db:up
npx prisma migrate deploy
npm run dev
```

Postgres поднимается в Docker на порту `5433`: логин, пароль и база `budget`. В `.env` нужны `BOT_TOKEN`, `DATABASE_URL` и `ALLOWED_TELEGRAM_IDS`. `TIMEZONE` по умолчанию `Europe/Moscow`. Свой ID можно узнать у [@userinfobot](https://t.me/userinfobot).

`/start` открывает меню: статистика, добавить трату, удалить запись.

Как на сервере, бот тоже в контейнере: `npm run app:up`. Перед этим остановите `npm run dev`: один токен, два процесса конфликтуют. Остановка: `npm run db:down`.

## CI и деплой

Push и pull request запускают проверки: формат, линтер, типы, тесты, сборку и Docker-образ.

Push в `master` выкатывает сервер: `git pull` и `docker compose --profile deploy up -d --build`. Ручной запуск там же: Actions → Deploy.

Секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`. На сервере рядом с кодом лежит `.env`. В контейнере `DATABASE_URL` подменяется на Postgres внутри Docker-сети. Приватный ключ в секрет вставляется целиком, от `BEGIN` до `END`.
