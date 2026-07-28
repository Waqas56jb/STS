import 'dotenv/config'
import { pool } from '../db.js'
import { encryptJSON } from '../lib/crypto.js'

const key = process.env.OPENAI_API_KEY
if (!key) { console.error('✗ OPENAI_API_KEY not set in .env'); await pool.end(); process.exit(1) }

await pool.query(
  `insert into sts_settings (key, value, updated_at) values ('openai_key', $1, now())
   on conflict (key) do update set value=excluded.value, updated_at=now()`,
  [encryptJSON({ v: key })],
)
console.log('✓ openai_key stored encrypted in sts_settings — the deployed backend will use it for AI replies')
await pool.end()
