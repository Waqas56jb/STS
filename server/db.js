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
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  // let idle connections close so a serverless function can freeze/exit cleanly
  allowExitOnIdle: true,
})

pool.on('error', (err) => console.error('pg pool error:', err.message))

/**
 * On Vercel, a serverless container can be frozen between requests and Supabase
 * may drop the idle connection. The first query on that dead socket then fails —
 * which is exactly the "cold start" 500 users hit. Retry transient connection
 * errors a couple of times (with small backoff) so a fresh connection is opened.
 */
function isTransient(e) {
  const code = e?.code
  const m = (e?.message || '').toLowerCase()
  return (
    code === 'ECONNRESET' || code === 'EPIPE' || code === 'ETIMEDOUT' ||
    code === '57P01' || code === '08006' || code === '08003' || code === '08P01' ||
    m.includes('connection terminated') || m.includes('connection timeout') ||
    m.includes('timeout exceeded') || m.includes('server closed the connection') ||
    m.includes('econnreset') || m.includes('terminating connection')
  )
}

async function run(text, params, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await pool.query(text, params)
    } catch (e) {
      if (attempt >= retries || !isTransient(e)) throw e
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }
  }
}

/** Run a parameterized query; returns the full pg result. */
export const query = (text, params) => run(text, params)

/** Convenience: first row or null. */
export async function one(text, params) {
  const { rows } = await run(text, params)
  return rows[0] || null
}

/** Convenience: all rows. */
export async function many(text, params) {
  const { rows } = await run(text, params)
  return rows
}

/** Run fn inside a transaction with a dedicated client (retries the initial connect). */
export async function tx(fn) {
  let client
  for (let attempt = 0; ; attempt++) {
    try { client = await pool.connect(); break }
    catch (e) {
      if (attempt >= 2 || !isTransient(e)) throw e
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }
  }
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
