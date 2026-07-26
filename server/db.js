import 'dotenv/config'
import pg from 'pg'

/**
 * Postgres connection pool (Supabase, session pooler).
 *
 * The backend connects as the `postgres` role, which has BYPASSRLS, so it has
 * full access to the sts_ tables while RLS keeps the public anon key out.
 * All tables are `sts_`-prefixed to avoid colliding with other projects in the
 * same database.
 */
const { Pool } = pg

if (!process.env.SUPABASE_DB_URL) {
  console.error('FATAL: SUPABASE_DB_URL is not set (see server/.env)')
  process.exit(1)
}

export const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
})

pool.on('error', (err) => console.error('pg pool error:', err.message))

/** Run a parameterized query; returns the full pg result. */
export const query = (text, params) => pool.query(text, params)

/** Convenience: first row or null. */
export async function one(text, params) {
  const { rows } = await pool.query(text, params)
  return rows[0] || null
}

/** Convenience: all rows. */
export async function many(text, params) {
  const { rows } = await pool.query(text, params)
  return rows
}

/** Run fn inside a transaction with a dedicated client. */
export async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}
