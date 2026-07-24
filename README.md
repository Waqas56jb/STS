# STS — Conversational AI SaaS Platform

WhatsApp (official Meta API) + Instagram DM + AI Voice Agent + Website Widget — all in one multi-business dashboard, with a top-level admin panel. Bilingual English/Arabic (RTL) throughout.

## File structure
```
index.html            → Landing page (hero, services, pricing in KWD, Request Access form, login)
client/client.html    → Client dashboard (inbox, agents, knowledge base, widget, analytics, billing)
admin/admin.html      → Admin panel (requests, businesses, payments, invoices, plans, revenue charts)
server/server.js      → Node/Express API (JWT auth, Supabase, Meta webhooks, AI engine, widget API)
supabase/schema.sql   → Full database schema + seeded pricing plans
```

## Quick start
1. **Database** — create a Supabase project, open SQL Editor, paste and run `supabase/schema.sql`.
2. **Backend**
   ```bash
   cd server
   npm init -y
   npm i express cors bcryptjs jsonwebtoken @supabase/supabase-js dotenv
   ```
   Create `server/.env`:
   ```
   SUPABASE_URL=https://YOURPROJECT.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...   (Settings → API → service_role — server only!)
   JWT_SECRET=a-long-random-string
   PORT=4000
   OPENAI_API_KEY=sk-...         (optional: enables AI auto-replies)
   META_VERIFY_TOKEN=sts-verify-123
   META_WA_TOKEN=EAAG...         (Meta WhatsApp Cloud API token)
   ```
   Run: `node server.js`
   First run seeds the top-level admin: **admin@sts.app / Admin@2026!** — change it immediately.
3. **Frontend** — open `index.html` (or serve the folder with any static host). The dashboards work in demo mode without the server, and switch to live data automatically when the API is reachable at `http://localhost:4000/api` (override with `window.STS_API`).

## Flows
- **Landing → Request Access** → row in `access_requests` → shows in Admin → Access Requests with a red counter.
- **Admin approves** → "Add business" modal pre-filled → creates `businesses` row + client login + default bot settings per channel.
- **Client logs in** → unified inbox (WhatsApp / Instagram / Voice / Web), AI↔Human toggle per conversation, knowledge-base training, per-channel config, website widget embed code, usage bars, invoices.
- **Webhooks**: `GET/POST /api/webhooks/meta` serves both WhatsApp Cloud API and Instagram Messaging (they share one Meta app). Website widget posts to `/api/widget/:widgetKey/message`. Voice transcripts post to `/api/webhooks/voice`.

## Honest notes on the Meta side (from the client brief)
- WhatsApp uses the **official Meta Cloud API** — this requires Meta Business verification, a display-name review, and template approval for business-initiated messages. Timeline is typically days to ~2 weeks and is a manual review by Meta.
- **Per-business onboarding**: each business needs its own WhatsApp number and its own WABA, but they can all live under one central Meta Business/Tech-Provider setup, so onboarding is mostly admin work in this panel plus the Meta number registration — not a new development project each time. Instagram can share the same Meta app and webhook as WhatsApp (as wired in `server.js`).
- Voice runs on Twilio (per-minute telephony) with standard TTS, or ElevenLabs for the premium voice tier — matching the Voice Premium plan pricing.

## Production checklist
- Serve everything over HTTPS; set `window.STS_API` to your deployed API URL in all three HTML files.
- Replace `+96500000000` with the real WhatsApp number and drop in the real logo.
- Add Meta webhook URL + verify token in the Meta App dashboard (WhatsApp → Configuration, Instagram → Webhooks).
- Rotate the seeded admin password; consider 2FA for admin.
- KNET/MyFatoorah can be wired into `POST /api/admin/payments` for online payment collection — invoices and payments tables are already modeled for it.