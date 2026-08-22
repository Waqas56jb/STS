import { pool } from '../db.js'
import { backfillTenantIsolation } from './tenant.js'

/** Idempotent columns + tenant backfill. Runs on every boot so Railway
 *  does not depend on a separate `npm run migrate` after a deploy. */
export async function ensureTrainingSchema() {
  await pool.query(`alter table sts_bot_settings add column if not exists rules text`)
  await pool.query(`alter table sts_knowledge_sources add column if not exists channel text default 'all'`)
  await pool.query(`alter table sts_businesses add column if not exists owner_user_id uuid references sts_users(id) on delete set null`)
  await pool.query(`create index if not exists idx_sts_biz_owner on sts_businesses(owner_user_id)`)
  await backfillTenantIsolation()
  console.log('✓ training schema + tenant isolation ready')
}
