import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const G = `https://graph.facebook.com/${V}`
const tok = process.env.WHATSAPP_ACCESS_TOKEN
const phone = '843720255494731' // REAL number +965 510 22389
const method = process.argv[2] || 'SMS' // SMS | VOICE

async function j(u, o) {
  const r = await fetch(u, o)
  return { status: r.status, d: await r.json().catch(() => ({})) }
}

const st = await j(`${G}/${phone}?fields=display_phone_number,platform_type,code_verification_status&access_token=${tok}`)
console.log('status  :', JSON.stringify(st.d))

const rc = await j(`${G}/${phone}/request_code`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code_method: method, language: 'en' }),
})
console.log('request_code (%s) → HTTP %s  %s', method, rc.status, JSON.stringify(rc.d))
