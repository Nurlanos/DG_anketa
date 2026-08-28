# Авторизация дашборда

Дашборд использует email + пароль без внешнего auth-сервиса. Сессия хранится в подписанной `HttpOnly` cookie, а API проверяет роль пользователя на сервере.

## Переменные Vercel

Добавьте для Production:

- `DASH_SESSION_SECRET` — длинная случайная строка не менее 32 символов.
- `DASH_USERS_JSON` — JSON-массив пользователей с `scrypt`-хэшами паролей.

Формат пользователя:

```json
[
  {
    "email": "admin@example.com",
    "passwordHash": "scrypt$16384$SALT$HASH",
    "role": "admin",
    "managerId": ""
  },
  {
    "email": "manager@example.com",
    "passwordHash": "scrypt$16384$SALT$HASH",
    "role": "manager",
    "managerId": "n.omarov"
  }
]
```

Для создания хэша локально:

```bash
printf 'НовыйПароль\n' | npm run hash-password
```

После изменения Environment Variables нужно сделать новый deploy. Старые `DASH_USER` и `DASH_PWD` больше не используются.

Менеджер получает только записи со своим `managerId`. Администратор может видеть все записи и управлять менеджерами.
