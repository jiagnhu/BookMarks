# Bookmarks Server (Express + Prisma + MySQL)

A lightweight backend for the BookMarks app. Provides auth, pages (A/B), bookmarks, skins, settings, and quotas APIs.

## Quick Start

1) Copy environment variables

```bash
cp .env.example .env
# Edit .env to set DATABASE_URL (MySQL), JWT_SECRET, PORT
```

2) Install deps

```bash
npm i
```

3) Generate Prisma client and run migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

4) Start the dev server

```bash
npm run dev
```

- Server runs on `http://localhost:${PORT || 4000}`
- API base path: `/api/v1`

## Scripts

- `npm run dev` — start in watch mode (tsx)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled JS from `dist/`
- `npm run prisma:generate` — generate Prisma client
- `npm run prisma:migrate` — apply dev migrations
- `npm run prisma:deploy` — apply migrations in production

## Environment

- `DATABASE_URL` — MySQL connection string, e.g. `mysql://user:pass@localhost:3306/bookmarks`
- `PORT` — server port (default 4000)
- `JWT_SECRET` — secret for signing JWT tokens

## Data Model (Prisma)

- `User` — users with credentials
- `Page (A|B)` — per-user pages with title/motto and optional B password
- `Bookmark` — ordered bookmarks per page
- `Skin` — preset/custom skins and current selection
- `UserSettings` — appearance settings
- `Quota` — skin upload quota and usage

See `prisma/schema.prisma` for full schema.

## Auth

- Register: `POST /api/v1/auth/register`
  - body: `{ username, password }`
  - 201 → `{ token, user }`
- Login: `POST /api/v1/auth/login`
  - body: `{ username, password }`
  - 200 → `{ token, user }`
- Me: `GET /api/v1/auth/me` (Bearer token)

Authorization: `Authorization: Bearer <token>`

## Pages

- `GET /api/v1/pages` → list A/B with metadata
- `GET /api/v1/pages/:code` → get page by code (`A` or `B`)
- `PUT /api/v1/pages/:code` → update `{ title?, motto? }`
- `POST /api/v1/pages/B/password` → set/clear B-page password `{ password? }`
- `POST /api/v1/pages/B/verify` → verify `{ password }` → `{ ok }`

## Bookmarks

- `GET /api/v1/pages/:code/bookmarks`
- `PUT /api/v1/pages/:code/bookmarks` → bulk save `{ items:[{ id?, order, name, url }] }`
- `POST /api/v1/pages/:code/bookmarks`
- `PATCH /api/v1/bookmarks/:id`
- `DELETE /api/v1/bookmarks/:id`

## Skins

- `GET /api/v1/skins/preset` → preset list
- `GET /api/v1/skins/custom` (auth) → user custom list
- `POST /api/v1/skins/current` (auth) → set current
- `GET /api/v1/skins/current` (auth) → get current

## Settings

- `GET /api/v1/settings`
- `PUT /api/v1/settings`

## Quotas

- `GET /api/v1/quotas/skin-upload`

## Meta

- `GET /api/v1/meta/version`

## Notes

- Default user/pages are not auto-seeded. Register first via `/auth/register` to create a user with A/B pages, default settings, and quotas.
- For file uploads (custom skins), plan to add multipart handling and object storage. Currently only preset lists and current selection endpoints are implemented.
- Error format: `{ error: string }`. Global error handler logs to server console.

```text
Health check idea (add if needed): GET /api/v1/meta/version
```

