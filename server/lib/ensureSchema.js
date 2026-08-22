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
  console.log('✓ training schema + tenant isolation ready')
}
