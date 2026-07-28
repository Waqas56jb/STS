import 'dotenv/config'

const V = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const G = `https://graph.facebook.com/${V}`
const tok = process.env.WHATSAPP_ACCESS_TOKEN
const j = async (u) => (await fetch(u)).json().catch(() => ({}))

const me = await j(`${G}/me?fields=id,name&access_token=${tok}`)
console.log('me:', JSON.stringify(me))

const bizs = await j(`${G}/me/businesses?access_token=${tok}`)
const list = bizs.data || []
console.log('businesses:', list.map((b) => `${b.name}(${b.id})`).join(', ') || JSON.stringify(bizs))

for (const b of list) {
  for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
    const w = await j(`${G}/${b.id}/${edge}?access_token=${tok}`)
    for (const waba of (w.data || [])) {
      const ph = await j(`${G}/${waba.id}/phone_numbers?fields=display_phone_number,id,platform_type,code_verification_status&access_token=${tok}`)
      for (const p of (ph.data || [])) {
        console.log(`  [${edge}] WABA ${waba.id} "${waba.name}"  →  ${p.display_phone_number}  id=${p.id}  platform=${p.platform_type}  verified=${p.code_verification_status}`)
      }
    }
  }
}
