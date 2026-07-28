import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const phone = process.env.WHATSAPP_PHONE_NUMBER_ID
const tok = process.env.WHATSAPP_ACCESS_TOKEN
const pin = process.argv[2] || '123456'

const r = await fetch(`https://graph.facebook.com/${V}/${phone}/register`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
})
const d = await r.json().catch(() => ({}))
console.log('register → HTTP', r.status, 'ok:', r.ok)
console.log(JSON.stringify(d, null, 2))
