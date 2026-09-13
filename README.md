# DataPulse

Веб-бэкенд и защищённая админ-панель для Pulse: учёт аккаунтов, данных подключения к 1С и логов состояния.

## Возможности

- Админка `/admin` — обзор, список аккаунтов, детали 1С-подключений, логи
- API `/api/v1/*` — регистрация аккаунтов и репортинг статуса/логов с клиентов Pulse
- Пароли 1С в БД шифруются AES-256-GCM
- Вход в админку: httpOnly-сессия, CSRF, rate limit / lockout, опциональный IP allowlist

## Быстрый старт

```bash
cp .env.example .env
# заполните ADMIN_PASSWORD_HASH, SESSION_SECRET, CREDENTIALS_ENCRYPTION_KEY

npm install
npx prisma migrate dev
npm run db:seed   # демо-данные (опционально)
npm run dev
```

Админка: http://localhost:3000/admin  
Демо-логин по умолчанию из `.env`: `admin` / пароль, для которого вы сгенерировали hash.

### Генерация секретов

```bash
# пароль админа → строка для .env (с экранированием $ для Next.js)
npm run admin:hash -- "your-strong-password"

# session + encryption keys
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # CREDENTIALS_ENCRYPTION_KEY
```

> **Важно:** bcrypt-hash содержит `$`. В `.env` для Next.js каждый `$` нужно писать как `\$`, иначе логин не сработает. Скрипт `admin:hash` выводит уже экранированную строку.

## Безопасность админки

| Мера | Детали |
|------|--------|
| Учётные данные | Только из env (`ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH`), не в БД |
| Сессия | Зашифрованная cookie (`iron-session`), 8 часов, `httpOnly`, `SameSite=Strict` |
| CSRF | Токен в сессии, обязателен для мутирующих `/api/admin/*` |
| Brute-force | 5 неудач / 15 мин → блокировка IP на 30 мин |
| IP allowlist | `ADMIN_ALLOWED_IPS` (опционально) |
| Заголовки | CSP, `X-Frame-Options: DENY`, HSTS в production |
| Секреты 1С | AES-256-GCM at rest |

Рекомендуется держать админку за VPN/HTTPS и задать `ADMIN_ALLOWED_IPS`.

## Client API (Pulse)

Регистрация (опционально защитите `CLIENT_REGISTRATION_SECRET`):

```http
POST /api/v1/accounts/register
Content-Type: application/json
X-Registration-Secret: <optional>

{
  "email": "user@example.com",
  "displayName": "Имя",
  "deviceId": "device-1",
  "connection": {
    "serverUrl": "http://1c.local/base",
    "baseName": "ERP",
    "username": "obmen",
    "password": "secret",
    "protocol": "http"
  }
}
```

Ответ содержит одноразовый `apiToken` — дальше:

```http
Authorization: Bearer <apiToken>
POST /api/v1/connections/:id/status
POST /api/v1/logs
```

## Стек

Next.js (App Router) · Prisma · SQLite · TypeScript
