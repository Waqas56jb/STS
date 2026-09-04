-- ============================================================
-- STS — PostgreSQL schema (Supabase)
-- All tables are prefixed `sts_` so they never collide with any
-- other project sharing this database. Idempotent: safe to re-run.
-- The backend connects as the `postgres` role (bypasses RLS); RLS is
-- enabled so the public anon/PostgREST key cannot read these tables.
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- plans ----------
create table if not exists sts_plans (
  code        text primary key,
  name        text not null,
  category    text not null,                 -- whatsapp | instagram | voice | bundle | free
  quota_label text,
  price_kwd   numeric(8,2) not null,
  channels    text[] not null default '{}',  -- {wa,ig,vc}
  active      boolean default true,
  sort        int default 0
);

insert into sts_plans (code,name,category,quota_label,price_kwd,channels,sort) values
 ('wa_starter','WhatsApp Starter','whatsapp','2,500 msgs/mo',20.00,'{wa}',1),
 ('wa_growth','WhatsApp Growth','whatsapp','5,000 msgs/mo',25.00,'{wa}',2),
 ('wa_pro','WhatsApp Pro','whatsapp','10,000 msgs/mo',34.90,'{wa}',3),
 ('ig_starter','Instagram Starter','instagram','2,500 contacts/mo',20.00,'{ig}',4),
 ('ig_growth','Instagram Growth','instagram','5,000 contacts/mo',32.00,'{ig}',5),
 ('ig_business','Instagram Business','instagram','10,000 contacts/mo',55.00,'{ig}',6),
 ('voice_starter','Voice Starter (Standard)','voice','150 min/mo',39.00,'{vc}',7),
 ('voice_standard','Voice Standard (Standard)','voice','900 min/mo',119.00,'{vc}',8),
 ('voice_premium','Voice Premium (ElevenLabs)','voice','900 min/mo',329.00,'{vc}',9),
 ('social_starter','Social Starter','bundle','WA+IG Starter',34.00,'{wa,ig}',10),
 ('social_growth','Social Growth','bundle','WA+IG Growth',48.00,'{wa,ig}',11),
 ('social_pro','Social Pro','bundle','WA Pro + IG Business',76.00,'{wa,ig}',12),
 ('complete_starter','Complete Starter','bundle','All 3 — Starter',65.00,'{wa,ig,vc}',13),
 ('complete_growth','Complete Growth','bundle','All 3 — Growth',145.00,'{wa,ig,vc}',14),
 ('complete_pro','Complete Pro','bundle','All 3 — Pro',349.00,'{wa,ig,vc}',15),
 ('free','Free / Trial','free','Trial',0.00,'{wa}',16)
on conflict (code) do nothing;

-- ---------- businesses (tenants) ----------
create table if not exists sts_businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  whatsapp    text,
  plan_code   text references sts_plans(code) default 'free',
  status      text not null default 'free',         -- paid | free | suspended
  mrr         numeric(8,2) default 0,
  channels    text[] default '{wa}',
  widget_key  text unique default ('biz_' || substr(md5(random()::text),1,10)),
  hours       text,
  language    text default 'auto',
  owner_user_id uuid,
  created_at  timestamptz default now()
);
-- add profile columns to already-created databases (idempotent)
alter table sts_businesses add column if not exists hours text;
alter table sts_businesses add column if not exists language text default 'auto';
alter table sts_businesses add column if not exists owner_user_id uuid references sts_users(id) on delete set null;
create index if not exists idx_sts_biz_owner on sts_businesses(owner_user_id);

-- ---------- users (admin + client logins) ----------
create table if not exists sts_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  name          text,
  role          text not null default 'client',      -- admin | client
  business_id   uuid references sts_businesses(id) on delete cascade,
  password_hash text not null,
  password_enc  text,                                  -- reversible copy so admins can reveal the login password
  last_login    timestamptz,
  created_at    timestamptz default now()
);
create index if not exists idx_sts_users_business on sts_users(business_id);
-- add password_enc to already-created databases (idempotent)
alter table sts_users add column if not exists password_enc text;
alter table sts_users add column if not exists email_verified_at timestamptz;
alter table sts_users add column if not exists email_verify_token text;
alter table sts_users add column if not exists email_verify_expires timestamptz;

-- ---------- access requests (landing page form) ----------
create table if not exists sts_access_requests (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  contact_name    text,
  email           text not null,
  whatsapp        text,
  interested_plan text,
  message         text,
  status          text default 'new',                 -- new | approved | rejected
  created_at      timestamptz default now()
);

-- ---------- channel connection credentials (Meta / Twilio per business) ----------
-- Secret tokens are AES-256-GCM encrypted by the app layer and stored in
-- `secrets_enc`. `ext_ref` is a NON-secret routing key (phone number id /
-- ig account id / twilio number) so inbound webhooks can find the business.
create table if not exists sts_channel_configs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references sts_businesses(id) on delete cascade,
  channel     text not null,                          -- whatsapp | instagram | voice
  connected   boolean default false,
  ext_ref     text,
  secrets_enc text,
  qr_auth_enc text,                                    -- encrypted Baileys auth files; never sent to the browser
  updated_at  timestamptz default now(),
  unique(business_id, channel)
);
alter table sts_channel_configs add column if not exists qr_auth_enc text;
create index if not exists idx_sts_cfg_ext on sts_channel_configs(channel, ext_ref);

-- ---------- bot settings (per business + channel) ----------
create table if not exists sts_bot_settings (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references sts_businesses(id) on delete cascade,
  channel         text not null,                      -- whatsapp | instagram | voice | web
  auto_reply      boolean default true,
  human_handoff   boolean default true,
  after_hours_only boolean default false,
  greeting        text,
  tone            text default 'friendly',
  language        text default 'auto',                -- auto | ar | en
  widget_color    text default '#0FBE8F',
  widget_position text default 'bottom_right',
  rules           text,
  updated_at      timestamptz default now(),
  unique(business_id, channel)
);
alter table sts_bot_settings add column if not exists rules text;
alter table sts_bot_settings add column if not exists tts_voice text default 'alloy';

-- ---------- knowledge base ----------
create table if not exists sts_knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references sts_businesses(id) on delete cascade,
  type        text not null,                          -- file | url | qa
  title       text not null,
  content     text,
  source_url  text,
  meta        text,
  status      text default 'processing',              -- processing | trained | failed
  channel     text default 'all',                     -- all | whatsapp | instagram | website | voice
  created_at  timestamptz default now()
);
create index if not exists idx_sts_kb_business on sts_knowledge_sources(business_id);
-- per-agent knowledge scoping ('all' = shared across every agent)
alter table sts_knowledge_sources add column if not exists channel text default 'all';
create index if not exists idx_sts_kb_channel on sts_knowledge_sources(business_id, channel);

-- ---------- conversations & messages ----------
create table if not exists sts_conversations (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid references sts_businesses(id) on delete cascade,
  channel               text not null,                -- whatsapp | instagram | voice | web
  customer_handle       text not null,
  customer_name         text,
  customer_since        text,
  orders                int default 0,
  mode                  text default 'ai',            -- ai | human
  unread                int default 0,
  last_message_preview  text,
  last_message_at       timestamptz default now(),
  created_at            timestamptz default now(),
  unique(business_id, channel, customer_handle)
);
create index if not exists idx_sts_conv_business on sts_conversations(business_id, last_message_at desc);

create table if not exists sts_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references sts_conversations(id) on delete cascade,
  business_id     uuid references sts_businesses(id) on delete cascade,
  direction       text not null,                      -- in | out
  sender          text not null,                      -- customer | ai | human
  body            text,
  provider_msg_id text,                               -- WhatsApp/Meta message id, for webhook idempotency
  created_at      timestamptz default now()
);
create index if not exists idx_sts_msg_conv on sts_messages(conversation_id, created_at);
-- idempotency for inbound webhooks (dedupe Meta retries); many NULLs are fine
alter table sts_messages add column if not exists provider_msg_id text;
create unique index if not exists idx_sts_msg_provider on sts_messages(provider_msg_id);

-- ---------- voice call logs ----------
create table if not exists sts_call_logs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references sts_businesses(id) on delete cascade,
  caller       text,
  direction    text default 'inbound',                 -- inbound | outbound
  duration_sec int default 0,
  transcript   text,
  summary      text,
  from_number  text,
  to_number    text,
  status       text default 'initiated',               -- initiated | ringing | in_progress | completed | failed | no_answer
  provider_call_sid text,                               -- Twilio CallSid
  transcript_json jsonb default '[]'::jsonb,            -- [{role:'user'|'agent', text, at}]
  language     text,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz default now()
);
-- voice-agent columns for already-created databases (idempotent)
alter table sts_call_logs add column if not exists from_number text;
alter table sts_call_logs add column if not exists to_number text;
alter table sts_call_logs add column if not exists status text default 'initiated';
alter table sts_call_logs add column if not exists provider_call_sid text;
alter table sts_call_logs add column if not exists transcript_json jsonb default '[]'::jsonb;
alter table sts_call_logs add column if not exists language text;
alter table sts_call_logs add column if not exists started_at timestamptz;
alter table sts_call_logs add column if not exists ended_at timestamptz;
create index if not exists idx_sts_call_business on sts_call_logs(business_id, created_at desc);
create unique index if not exists idx_sts_call_sid on sts_call_logs(provider_call_sid);

-- ---------- leads ----------
create table if not exists sts_leads (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references sts_businesses(id) on delete cascade,
  name        text,
  contact     text,
  channel     text,
  status      text default 'new',                     -- new | warm | won
  note        text,
  created_at  timestamptz default now()
);
create index if not exists idx_sts_leads_business on sts_leads(business_id);

-- ---------- billing ----------
create table if not exists sts_invoices (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references sts_businesses(id) on delete cascade,
  number      text unique not null,
  description text,
  amount_kwd  numeric(8,2) not null,
  status      text default 'unpaid',                  -- unpaid | paid | overdue | void
  issued_at   timestamptz default now(),
  due_at      timestamptz
);
create index if not exists idx_sts_inv_business on sts_invoices(business_id);

create table if not exists sts_payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references sts_businesses(id) on delete cascade,
  invoice_id  uuid references sts_invoices(id),
  reference   text unique not null,
  method      text,                                   -- knet | card | transfer | link
  amount_kwd  numeric(8,2) not null,
  status      text default 'pending',                 -- pending | paid | failed | refunded
  created_at  timestamptz default now()
);

-- ---------- usage counters (quota tracking per month) ----------
create table if not exists sts_usage_counters (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references sts_businesses(id) on delete cascade,
  period      text not null,                          -- 'YYYY-MM'
  metric      text not null,                          -- wa_messages | ig_contacts | voice_minutes | web_messages
  used        int default 0,
  quota       int default 0,
  unique(business_id, period, metric)
);

-- ---------- platform settings (admin) ----------
create table if not exists sts_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now()
);
insert into sts_settings (key,value) values
 ('support_whatsapp','+965 510 22389'),
 ('support_email','sts@shgardiauto.com'),
 ('currency','KWD')
on conflict (key) do nothing;

-- ============================================================
-- Row Level Security — enable on every sts_ table. The backend uses the
-- postgres role (bypassrls=true) so it is unaffected; the public anon key
-- is blocked. Plans stay publicly readable for the landing page.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'sts_businesses','sts_users','sts_access_requests','sts_channel_configs',
    'sts_bot_settings','sts_knowledge_sources','sts_conversations','sts_messages',
    'sts_call_logs','sts_leads','sts_invoices','sts_payments','sts_usage_counters',
    'sts_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

alter table sts_plans enable row level security;
drop policy if exists "sts_plans_public_read" on sts_plans;
create policy "sts_plans_public_read" on sts_plans for select using (true);
