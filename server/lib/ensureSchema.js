import { pool } from '../db.js'
import { backfillTenantIsolation } from './tenant.js'

/** Idempotent columns + tenant backfill. Runs on every boot so Railway
 *  does not depend on a separate `npm run migrate` after a deploy. */
export async function ensureTrainingSchema() {
  await pool.query(`alter table sts_bot_settings add column if not exists rules text`)
  await pool.query(`alter table sts_knowledge_sources add column if not exists channel text default 'all'`)
  await pool.query(`alter table sts_businesses add column if not exists owner_user_id uuid references sts_users(id) on delete set null`)
  await pool.query(`alter table sts_channel_configs add column if not exists qr_auth_enc text`)
  await pool.query(`create index if not exists idx_sts_biz_owner on sts_businesses(owner_user_id)`)
  // Old training saved one shared business card (channel=all). That leaked
  // WhatsApp form data onto Instagram/voice/web. Keep it on WhatsApp only.
  await pool.query(
    `update sts_knowledge_sources
        set channel='whatsapp'
      where meta='__business_profile__' and coalesce(channel,'all')='all'`,
  )
  await backfillTenantIsolation()
  await pool.query(
    `update sts_settings set value='+965 510 22389', updated_at=now()
      where key='support_whatsapp' and value in ('+965 0000 0000', '')`,
  )
  await pool.query(
    `insert into sts_settings (key, value) values ('support_whatsapp', '+965 510 22389')
     on conflict (key) do nothing`,
  )
  await pool.query(`
    create table if not exists sts_customer_memory (
      id            uuid primary key default gen_random_uuid(),
      business_id   uuid not null references sts_businesses(id) on delete cascade,
      customer_key  text not null,
      customer_name text,
      summary       text,
      facts         jsonb default '{}'::jsonb,
      message_count int default 0,
      first_seen    timestamptz default now(),
      last_seen     timestamptz default now(),
      last_channel  text,
      unique (business_id, customer_key)
    )`)
  await pool.query(`create index if not exists idx_customer_memory_biz on sts_customer_memory(business_id, customer_key)`)
  await pool.query(`alter table sts_bot_settings add column if not exists tts_voice text default 'alloy'`)
  await pool.query(`alter table sts_users add column if not exists email_verified_at timestamptz`)
  await pool.query(`alter table sts_users add column if not exists email_verify_token text`)
  await pool.query(`alter table sts_users add column if not exists email_verify_expires timestamptz`)
  const { ensureChatMenuSchema } = await import('./chatMenu.js')
  await ensureChatMenuSchema()
  const { ensureOrdersSchema } = await import('./orders.js')
  await ensureOrdersSchema()

  // Keep WhatsApp plan prices in sync with current public pricing
  await pool.query(`update sts_plans set price_kwd=14.990, name='WhatsApp Starter', quota_label='2,500 msgs/mo' where code='wa_starter'`)
  await pool.query(`update sts_plans set price_kwd=19.990, name='WhatsApp Growth', quota_label='5,000 msgs/mo' where code='wa_growth'`)
  await pool.query(`update sts_plans set price_kwd=27.990, name='WhatsApp Pro', quota_label='10,000 msgs/mo' where code='wa_pro'`)

  // Refresh stored website pricing so landing shows WhatsApp-only live plans
  try {
    const { one } = await import('../db.js')
    const { DEFAULT_SITE_CONFIG, parseSiteConfig } = await import('./siteConfig.js')
    const row = await one(`select value from sts_settings where key='site_config'`)
    const cfg = parseSiteConfig(row?.value)
    cfg.pricing = { 'p-wa': structuredClone(DEFAULT_SITE_CONFIG.pricing['p-wa']) }
    if (cfg.copy?.en) {
      cfg.copy.en.pr_p = DEFAULT_SITE_CONFIG.copy.en.pr_p
      cfg.copy.en.hero_h1 = DEFAULT_SITE_CONFIG.copy.en.hero_h1
      cfg.copy.en.hero_sub = DEFAULT_SITE_CONFIG.copy.en.hero_sub
    }
    if (cfg.copy?.ar) {
      cfg.copy.ar.pr_p = DEFAULT_SITE_CONFIG.copy.ar.pr_p
      cfg.copy.ar.hero_h1 = DEFAULT_SITE_CONFIG.copy.ar.hero_h1
      cfg.copy.ar.hero_sub = DEFAULT_SITE_CONFIG.copy.ar.hero_sub
    }
    await pool.query(
      `insert into sts_settings (key, value) values ('site_config', $1)
       on conflict (key) do update set value=excluded.value, updated_at=now()`,
      [JSON.stringify(cfg)],
    )
  } catch (e) {
    console.warn('[schema] site_config pricing refresh skipped:', e.message)
  }

  console.log('✓ training schema + tenant isolation + customer memory + orders ready')
}
