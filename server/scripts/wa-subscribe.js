import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const appId = process.env.META_APP_ID
const appToken = `${appId}|${process.env.META_APP_SECRET}`
const callback = 'https://sts-backend-eight.vercel.app/api/webhooks/whatsapp'
const verify = process.env.WHATSAPP_VERIFY_TOKEN

const params = new URLSearchParams({
  object: 'whatsapp_business_account',
  callback_url: callback,
  verify_token: verify,
  fields: 'messages',
  access_token: appToken,
})
const r = await fetch(`https://graph.facebook.com/${V}/${appId}/subscriptions`, { method: 'POST', body: params })
console.log('subscribe "messages" → HTTP', r.status, JSON.stringify(await r.json().catch(() => ({}))))

const c = await fetch(`https://graph.facebook.com/${V}/${appId}/subscriptions?access_token=${appToken}`)
const cd = await c.json().catch(() => ({}))
const wa = (cd.data || []).find((s) => s.object === 'whatsapp_business_account')
console.log('now fields:', wa ? (wa.fields || []).map((f) => f.name || f).join(', ') || '(none)' : 'no subscription')
