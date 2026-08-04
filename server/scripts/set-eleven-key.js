import 'dotenv/config'
import { pool, one } from '../db.js'
import { encryptJSON, decryptJSON } from '../lib/crypto.js'

const KEY = process.argv[2] || 'sk_a437187d53a950786d2de6137a79bfdabd650693ccb8f701'

// STS Official (platform) business
let pid = (await one("select value from sts_settings where key='platform_business_id'"))?.value
if (!pid) {
  let b = await one("select id from sts_businesses where name='STS Official' limit 1")
  if (!b) b = await one("insert into sts_businesses (name, plan_code, status) values ('STS Official','free','paid') returning id")
  pid = b.id
  await pool.query("insert into sts_settings (key,value) values ('platform_business_id',$1) on conflict (key) do update set value=excluded.value", [pid])
}

// merge ElevenLabs into the voice connection (keep any existing Twilio creds)
const row = await one("select secrets_enc from sts_channel_configs where business_id=$1 and channel='voice'", [pid])
const cur = row ? decryptJSON(row.secrets_enc) : {}
const merged = { ...cur, voice_provider: 'elevenlabs', elevenlabs_api_key: KEY }
const connected = !!(merged.account_sid && merged.auth_token && merged.twilio_number)
await pool.query(
  `insert into sts_channel_configs (business_id, channel, connected, ext_ref, secrets_enc, updated_at)
   values ($1,'voice',$2,$3,$4, now())
   on conflict (business_id, channel) do update set connected=excluded.connected, ext_ref=excluded.ext_ref, secrets_enc=excluded.secrets_enc, updated_at=now()`,
  [pid, connected, merged.twilio_number || null, encryptJSON(merged)],
)
console.log('✓ ElevenLabs key stored in STS Official voice connection (provider=elevenlabs)')
console.log('  twilio connected =', connected, '(add Twilio SID/token/number to make/receive calls)')
await pool.end()
