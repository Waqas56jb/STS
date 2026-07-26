import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from '../db.js'

/** Apply schema.sql (idempotent) to the database. */
const here = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(here, '..', 'schema.sql'), 'utf8')

try {
  await pool.query(sql)
  const { rows } = await pool.query(
    `select table_name from information_schema.tables
       where table_schema='public' and table_name like 'sts_%' order by table_name`,
  )
  console.log('✓ migration applied. sts_ tables:')
  rows.forEach((r) => console.log('   -', r.table_name))
  await pool.end()
} catch (e) {
  console.error('✗ migration failed:', e.message)
  await pool.end()
  process.exit(1)
}
