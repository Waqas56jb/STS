-- ============================================================
-- STS — Supabase schema  (run in Supabase SQL Editor)
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- plans (seeded from the pricing sheet) ----------
create table if not exists plans (
  code        text primary key,
  name        text not null,
  category    text not null,             -- whatsapp | instagram | voice | bundle
  quota_label text,
  price_kwd   numeric(8,2) not null,
  channels    text[] not null default '{}',  -- {wa,ig,vc}
  active      boolean default true,
  sort        int default 0
);

insert into plans (code,name,category,quota_label,price_kwd,channels,sort) values
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
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  whatsapp    text,
  plan_code   text references plans(code) default 'free',
  status      text not null default 'free',        -- paid | free | suspended
  mrr         numeric(8,2) default 0,
  channels    text[] default '{wa}',
  widget_key  text unique default ('biz_' || substr(md5(random()::text),1,10)),
  created_at  timestamptz default now()
);

-- ---------- users (admin + client logins) ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  name          text,
  role          text not null default 'client',   -- admin | client
  business_id   uuid references businesses(id) on delete cascade,
  password_hash text not null,
  last_login    timestamptz,
  created_at    timestamptz default now()
);
create index if not exists idx_users_business on users(business_id);

-- ---------- access requests (landing page form) ----------
create table if not exists access_requests (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  contact_name    text,
  email           text not null,
  whatsapp        text,
  interested_plan text,
  message         text,
  status          text default 'new',              -- new | approved | rejected
  created_at      timestamptz default now()
);

-- ---------- channel configs (Meta / Twilio credentials per business) ----------
create table if not exists channel_configs (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid references businesses(id) on delete cascade,
  channel               text not null,             -- whatsapp | instagram | voice
  meta_phone_number_id  text,                      -- WhatsApp Cloud API
  meta_waba_id          text,
  ig_account_id         text,                      -- Instagram business account
  page_access_token     text,
  twilio_number         text,
  voice_provider        text default 'standard',   -- standard | elevenlabs
  unique(business_id, channel)
);
create index if not exists idx_cfg_phone on channel_configs(meta_phone_number_id);
create index if not exists idx_cfg_ig on channel_configs(ig_account_id);

-- ---------- bot settings ----------
create table if not exists bot_settings (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete cascade,
  channel       text not null,                     -- whatsapp | instagram | voice | web
  auto_reply    boolean default true,
  human_handoff boolean default true,
  after_hours_only boolean default false,
  greeting      text,
  tone          text default 'friendly',
  language      text default 'auto',               -- auto | ar | en
  widget_color  text default '#0FBE8F',
  widget_position text default 'bottom_right',
  updated_at    timestamptz default now(),
  unique(business_id, channel)
);

-- ---------- knowledge base ----------
create table if not exists knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  type        text not null,                       -- file | url | qa
  title       text not null,
  content     text,
  source_url  text,
  status      text default 'processing',           -- processing | trained | failed
  created_at  timestamptz default now()
);
create index if not exists idx_kb_business on knowledge_sources(business_id);

-- ---------- conversations & messages ----------
create table if not exists conversations (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid references businesses(id) on delete cascade,
  channel               text not null,             -- whatsapp | instagram | voice | web
  customer_handle       text not null,             -- phone / ig id / visitor id
  customer_name         text,
  mode                  text default 'ai',         -- ai | human
  unread                int default 0,
  last_message_preview  text,
  last_message_at       timestamptz default now(),
  created_at            timestamptz default now(),
  unique(business_id, channel, customer_handle)
);
create index if not exists idx_conv_business on conversations(business_id, last_message_at desc);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  business_id     uuid references businesses(id) on delete cascade,
  direction       text not null,                   -- in | out
  sender          text not null,                   -- customer | ai | human
  body            text,
  created_at      timestamptz default now()
);
create index if not exists idx_msg_conv on messages(conversation_id, created_at);

-- ---------- voice call logs ----------
create table if not exists call_logs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete cascade,
  caller       text,
  direction    text default 'inbound',
  duration_sec int default 0,
  transcript   text,
  summary      text,
  created_at   timestamptz default now()
);

-- ---------- leads ----------
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name        text,
  contact     text,
  channel     text,
  note        text,
  created_at  timestamptz default now()
);

-- ---------- billing ----------
create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  number      text unique not null,
  description text,
  amount_kwd  numeric(8,2) not null,
  status      text default 'unpaid',               -- unpaid | paid | overdue | void
  issued_at   timestamptz default now(),
  due_at      timestamptz
);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  invoice_id  uuid references invoices(id),
  reference   text unique not null,
  method      text,                                -- knet | card | transfer | link
  amount_kwd  numeric(8,2) not null,
  status      text default 'pending',              -- pending | paid | failed | refunded
  created_at  timestamptz default now()
);

-- ---------- usage counters (quota tracking per month) ----------
create table if not exists usage_counters (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  period      text not null,                       -- 'YYYY-MM'
  metric      text not null,                       -- wa_messages | ig_contacts | voice_minutes | web_messages
  used        int default 0,
  quota       int default 0,
  unique(business_id, period, metric)
);

-- ============================================================
-- Row Level Security: the API uses the service_role key, so RLS
-- mainly guards against accidental anon access. Enable + lock down:
-- ============================================================
alter table businesses enable row level security;
alter table users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_sources enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table channel_configs enable row level security;
alter table bot_settings enable row level security;
alter table call_logs enable row level security;
alter table leads enable row level security;
alter table usage_counters enable row level security;
alter table access_requests enable row level security;
-- (no anon policies created on purpose — only the server's service key can read/write)

-- plans stay publicly readable for the landing page
alter table plans enable row level security;
create policy "plans are public" on plans for select using (true);