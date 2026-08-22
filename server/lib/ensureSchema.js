import { pool } from '../db.js'

/** Idempotent columns the training studio needs. Runs on every boot so Railway
 *  does not depend on a separate `npm run migrate` after a deploy. */
export async function ensureTrainingSchema() {
  await pool.query(`alter table sts_bot_settings add column if not exists rules text`)
  await pool.query(`alter table sts_knowledge_sources add column if not exists channel text default 'all'`)
  console.log('✓ training schema ready')
}
