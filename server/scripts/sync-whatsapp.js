import 'dotenv/config'
import { pool, one } from '../db.js'
import { encryptJSON } from '../lib/crypto.js'
import { isConnected } from '../lib/channels.js'

/**
 * Push the WhatsApp credentials from .env into a business's encrypted channel
 * connection, so inbound webhooks (routed by phone_number_id) reach the AI
 * agent. Usage: node scripts/sync-whatsapp.js [business-login-email]
 * Defaults to Shgardi Auto (sts@shgardiauto.com).
 */
const email = process.argv[2] || 'sts@shgardiauto.com'

const u = await one(`select business_id from sts_users where email=$1`, [email])
if (!u?.business_id) {
  console.error('✗ no business found for', email)
  await pool.end()
  process.exit(1)
}

const creds = {
  app_id: process.env.META_APP_ID || '',
  app_secret: process.env.META_APP_SECRET || '',
  phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  waba_id: process.env.WHATSAPP_WABA_ID || '',
  access_token: process.env.WHATSAPP_ACCESS_TOKEN || '',
  verify_token: process.env.WHATSAPP_VERIFY_TOKEN || '',
  display_number: process.env.WHATSAPP_DISPLAY_NUMBER || '',
}
if (!creds.phone_number_id || !creds.access_token) {
  console.error('✗ WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing in .env')
  await pool.end()
  process.exit(1)
}

const connected = isConnected('whatsapp', creds)
await pool.query(
  `insert into sts_channel_configs (business_id, channel, connected, ext_ref, secrets_enc, updated_at)
   values ($1,'whatsapp',$2,$3,$4, now())
   on conflict (business_id, channel) do update set
     connected=excluded.connected, ext_ref=excluded.ext_ref, secrets_enc=excluded.secrets_enc, updated_at=now()`,
  [u.business_id, connected, creds.phone_number_id, encryptJSON(creds)],
)

// make sure auto-reply is on for whatsapp
await pool.query(
  `insert into sts_bot_settings (business_id, channel, auto_reply) values ($1,'whatsapp', true)
   on conflict (business_id, channel) do update set auto_reply=true`,
  [u.business_id],
)

console.log(`✓ WhatsApp connected for ${email}`)
console.log(`  business_id     = ${u.business_id}`)
console.log(`  phone_number_id = ${creds.phone_number_id} (${creds.display_number})`)
console.log(`  connected       = ${connected}`)
await pool.end()
