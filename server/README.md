# STS Backend API

Node.js + Express API backed by **Supabase Postgres** (connected directly with
`pg`). Serves the client dashboard and the admin panel.

All tables are prefixed `sts_` so they never collide with other projects in the
same database. The API connects as the `postgres` role (which bypasses RLS);
Row-Level Security is enabled on every table so the public anon key can't read
them.

## Setup

```bash
cd server
npm install
cp .env.example .env      # then fill in real values (already done in .env)
npm run setup             # runs migration + seed (idempotent)
npm start                 # API on http://localhost:4000
```

- `npm run migrate` — apply `schema.sql` (create/ensure tables)
- `npm run seed` — seed plans, the admin account, demo businesses + data
- `npm run dev` — start with `--watch` (auto-restart)

## Accounts (seeded)

| Role   | Email                        | Password     |
| ------ | ---------------------------- | ------------ |
| Admin  | `admin@gmail.com`            | `admin@123!` |
| Client | `owner@alnoorperfumes.com`   | `client@123!`|

(A client login is seeded for every demo business, all with `client@123!`.)

## How the frontends reach it

Both Vite apps proxy `/api` → `http://localhost:4000` in dev (see each
`vite.config.js`). In production, serve the API and point the apps' `/api` at
it (or set `window.STS_API`).

## Security

- Passwords: bcrypt.
- Sessions: JWT (`JWT_SECRET`), 7-day expiry.
- **Channel credentials** (Meta / Twilio secrets) are **AES-256-GCM encrypted**
  (`APP_ENCRYPTION_KEY`) and stored only as ciphertext in
  `sts_channel_configs.secrets_enc`. The API returns secret fields **masked**;
  the raw values never leave the server except to call the provider.

## Key endpoints

Auth: `POST /api/auth/login`, `GET /api/auth/me`
Public: `POST /api/requests`, `GET /api/plans`
Client (Bearer): `GET /api/me/summary|usage|invoices|leads|calls|connections`,
`GET/POST/PATCH /api/conversations[...]`, `GET/PUT /api/bots/:channel`,
`GET/POST/DELETE /api/knowledge[...]`
Admin (Bearer + admin): `GET /api/admin/summary|requests|businesses|payments|invoices|plans|analytics`,
`POST /api/admin/requests/:id/approve|reject`, `POST/PATCH /api/admin/businesses[...]`,
`GET /api/admin/connection-spec`,
`GET /api/admin/businesses/:id/connections`,
`PUT /api/admin/businesses/:id/connections/:channel`

## Channel connections

The admin enters each business's WhatsApp (Meta Cloud API), Instagram (Meta
Messaging API) and Voice (Twilio + optional ElevenLabs) credentials from the
**Businesses & Users → Connections** button. The form is driven by
`GET /api/admin/connection-spec`, so adding a field in `lib/channels.js` makes
it appear in the UI automatically. Leaving a secret field blank keeps the
stored value, so a connection never breaks on a partial edit.
