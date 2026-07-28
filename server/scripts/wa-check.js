import 'dotenv/config'
import { generateReply } from '../lib/ai.js'
import { pool, one } from '../db.js'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const GRAPH = `https://graph.facebook.com/${V}`
const appId = process.env.META_APP_ID
const appSecret = process.env.META_APP_SECRET
const token = process.env.WHATSAPP_ACCESS_TOKEN
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
const recipient = process.argv[2] || '96500000000' // pass a real test number to try a genuine send

async function jget(url, opts) {
  const r = await fetch(url, opts)
  const d = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, d }
}

console.log('WhatsApp phone_number_id:', phoneId, '\n')

// 1) token validity
const dbg = await jget(`${GRAPH}/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`)
const info = dbg.d.data || {}
console.log('1) TOKEN   valid=%s  type=%s  expires=%s',
  info.is_valid, info.type, info.expires_at ? new Date(info.expires_at * 1000).toISOString() : '?')

// 2) phone number status
const ph = await jget(`${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type&access_token=${token}`)
console.log('2) PHONE   %s', JSON.stringify(ph.d))

// 3) live send probe (reveals registration state)
const send = await jget(`${GRAPH}/${phoneId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: 'STS agent test ✅' } }),
})
if (send.ok) {
  console.log('3) SEND    ✅ SENT to %s  id=%s', recipient, send.d.messages?.[0]?.id)
} else {
  const e = send.d.error || {}
  console.log('3) SEND    ❌ code=%s  "%s"', e.code, e.message)
  if (e.code === 133010) console.log('           → number NOT registered on Cloud API yet (POST /register with PIN)')
  if (e.code === 131030) console.log('           → number IS registered; recipient just not in the test allow-list')
}

// 4) OpenAI brain
if (process.env.OPENAI_API_KEY) {
  const oa = await jget('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Reply with only the word: OK' }], max_tokens: 5 }),
  })
  console.log('4) OPENAI  %s  %s', oa.ok ? '✅' : '❌', oa.ok ? oa.d.choices?.[0]?.message?.content?.trim() : oa.d.error?.message)
} else {
  console.log('4) OPENAI  (no key set)')
}

// 5) actual agent reply (grounded in Shgardi Auto KB + tone)
const biz = await one(`select business_id from sts_users where email='sts@shgardiauto.com'`)
const reply = await generateReply({
  businessId: biz.business_id, businessName: 'Shgardi Auto', channel: 'whatsapp',
  userText: 'Hello, what services do you offer and do you deliver in Kuwait?',
})
console.log('5) AGENT   reply → %s', reply)

await pool.end()
