/**
 * Delete all customer (non-admin) businesses and pending access requests.
 * Usage: node scripts/purge-customers.js
 */
import 'dotenv/config'
import { pool, many } from '../db.js'

const rows = await many(
  `select b.id, b.name from sts_businesses b
    where b.id not in (
      select business_id from sts_users where role='admin' and business_id is not null
    )
    order by b.name`,
)

console.log(`Found ${rows.length} customer business(es) to delete:`)
rows.forEach((r) => console.log(' -', r.name, r.id))

if (rows.length) {
  const ids = rows.map((r) => r.id)
  const r = await pool.query(`delete from sts_businesses where id=any($1::uuid[])`, [ids])
  console.log(`✓ deleted ${r.rowCount} businesses (cascaded users, KB, chats, invoices…)`)
}

const ar = await pool.query(`delete from sts_access_requests where status='new'`)
console.log(`✓ cleared ${ar.rowCount} pending access requests`)

await pool.end()
