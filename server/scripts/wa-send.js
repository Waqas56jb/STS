import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const tok = process.env.WHATSAPP_ACCESS_TOKEN
const phone = process.argv[2]                 // phone_number_id
const to = process.argv[3]                    // recipient (E.164, no +)
const text = process.argv[4] || 'STS WhatsApp agent test ✅ — reply and the AI will answer.'

const r = await fetch(`https://graph.facebook.com/${V}/${phone}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
})
const d = await r.json().catch(() => ({}))
console.log('send → HTTP', r.status, JSON.stringify(d))
