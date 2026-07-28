import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const GRAPH = `https://graph.facebook.com/${V}`
const appId = process.env.META_APP_ID
const appSecret = process.env.META_APP_SECRET
const appToken = `${appId}|${appSecret}`
const token = process.env.WHATSAPP_ACCESS_TOKEN
const wabaId = process.env.WHATSAPP_WABA_ID
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
const EXPECTED_CALLBACK = 'https://sts-backend-eight.vercel.app/api/webhooks/whatsapp'
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

async function g(url) {
  try {
    const r = await fetch(url)
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, d }
  } catch (e) {
    return { ok: false, d: { error: { message: e.message } } }
  }
}
const head = (n, label) => console.log(`\n===== ${n}. ${label} =====`)
const yes = (b) => (b ? 'YES ✅' : 'NO ❌')

// 1) token
head(1, 'Access token')
const dbg = (await g(`${GRAPH}/debug_token?input_token=${token}&access_token=${appToken}`)).d.data || {}
console.log('valid:', dbg.is_valid, '| type:', dbg.type, '| expires:', dbg.expires_at ? new Date(dbg.expires_at * 1000).toISOString() : '?')
console.log('scopes:', (dbg.scopes || []).join(', '))

// 2) app-level webhook subscription (callback URL + subscribed fields)
head(2, 'App webhook (callback URL + fields)')
const subs = await g(`${GRAPH}/${appId}/subscriptions?access_token=${appToken}`)
const waSub = (subs.d.data || []).find((s) => s.object === 'whatsapp_business_account')
if (waSub) {
  const fields = (waSub.fields || []).map((f) => f.name || f)
  console.log('active:', waSub.active)
  console.log('callback_url:', waSub.callback_url)
  console.log('  matches ours:', yes(waSub.callback_url === EXPECTED_CALLBACK), waSub.callback_url === EXPECTED_CALLBACK ? '' : `(want ${EXPECTED_CALLBACK})`)
  console.log('fields:', fields.join(', ') || '(none)')
  console.log('  subscribed to "messages":', yes(fields.includes('messages')))
} else {
  console.log('❌ No whatsapp_business_account webhook configured on this app.')
  console.log('  raw:', JSON.stringify(subs.d).slice(0, 300))
}

// 3) WABA details
head(3, 'WhatsApp Business Account')
const waba = await g(`${GRAPH}/${wabaId}?fields=name,currency,timezone_id,account_review_status,message_template_namespace&access_token=${token}`)
console.log(JSON.stringify(waba.d))

// 4) is OUR app subscribed to receive THIS WABA's events?
head(4, 'WABA → subscribed apps')
const sa = await g(`${GRAPH}/${wabaId}/subscribed_apps?access_token=${token}`)
const apps = sa.d.data || []
console.log('subscribed apps:', JSON.stringify(apps))
console.log('  our app subscribed:', yes(apps.some((a) => String(a?.whatsapp_business_api_data?.id || a?.id) === String(appId) || a?.whatsapp_business_api_data?.name)))

// 5) phone number status / registration
head(5, 'Phone number')
const ph = await g(`${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,name_status,throughput&access_token=${token}`)
console.log(JSON.stringify(ph.d))
console.log('  on Cloud API:', yes(ph.d.platform_type === 'CLOUD_API'))

// 6) message templates
head(6, 'Message templates')
const tpl = await g(`${GRAPH}/${wabaId}/message_templates?fields=name,status,category,language&limit=15&access_token=${token}`)
if (tpl.d.data) console.log('count:', tpl.d.data.length, '|', tpl.d.data.map((t) => `${t.name}[${t.status}]`).join(', ') || '(none)')
else console.log(JSON.stringify(tpl.d))

// checklist
head('✔', 'Local config (what we send to Meta)')
console.log('callback URL :', EXPECTED_CALLBACK)
console.log('verify token :', verifyToken)
