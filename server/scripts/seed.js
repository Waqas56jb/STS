import 'dotenv/config'
import { pool, one, many } from '../db.js'
import { hashPassword } from '../lib/auth.js'
import { encryptJSON } from '../lib/crypto.js'

/**
 * Idempotent seed:
 *  - the admin account (from .env)
 *  - demo businesses + client logins
 *  - full per-business data for "Al Noor Perfumes" (conversations, messages,
 *    knowledge, leads, calls, usage, bot settings)
 *  - platform-wide invoices / payments / access requests
 * so both dashboards render real data straight from the database.
 */

const CLIENT_PW = 'client@123!'

async function upsertUser({ email, name, role, business_id = null, password }) {
  const hash = await hashPassword(password)
  await pool.query(
    `insert into sts_users (email, name, role, business_id, password_hash, password_enc)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (email) do update
       set name=excluded.name, role=excluded.role,
           business_id=excluded.business_id, password_hash=excluded.password_hash,
           password_enc=excluded.password_enc`,
    [email.toLowerCase(), name, role, business_id, hash, encryptJSON({ p: password })],
  )
}

async function getOrCreateBusiness(b) {
  let row = await one('select id from sts_businesses where name=$1', [b.name])
  if (!row) {
    row = await one(
      `insert into sts_businesses (name, whatsapp, plan_code, status, mrr, channels)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [b.name, b.whatsapp || null, b.plan_code, b.status, b.mrr, b.channels],
    )
  } else {
    await pool.query(
      `update sts_businesses set plan_code=$2, status=$3, mrr=$4, channels=$5, whatsapp=$6 where id=$1`,
      [row.id, b.plan_code, b.status, b.mrr, b.channels, b.whatsapp || null],
    )
  }
  return row.id
}

const BUSINESSES = [
  { name: 'Al Noor Perfumes', email: 'owner@alnoorperfumes.com', plan_code: 'complete_growth', status: 'paid', mrr: 145, channels: ['wa', 'ig', 'vc'], whatsapp: '+965 5000 1234' },
  { name: 'Shgardi Auto', email: 'sts@shgardiauto.com', plan_code: 'complete_pro', status: 'paid', mrr: 349, channels: ['wa', 'ig', 'vc'] },
  { name: 'Dar Al Teeb', email: 'info@daralteeb.com', plan_code: 'social_pro', status: 'paid', mrr: 76, channels: ['wa', 'ig'] },
  { name: 'Kuwait Dental Co.', email: 'admin@kwdental.com', plan_code: 'complete_growth', status: 'paid', mrr: 145, channels: ['wa', 'ig', 'vc'] },
  { name: 'Bayt Al Halwa', email: 'hala@baytalhalwa.com', plan_code: 'wa_growth', status: 'paid', mrr: 25, channels: ['wa'] },
  { name: 'Marina Cafe', email: 'mgr@marinacafe.kw', plan_code: 'free', status: 'free', mrr: 0, channels: ['wa'] },
  { name: 'Zahra Boutique', email: 'zahra@zboutique.com', plan_code: 'ig_growth', status: 'paid', mrr: 32, channels: ['ig'] },
  { name: 'GulfTech Repairs', email: 'ops@gulftech.kw', plan_code: 'wa_starter', status: 'suspended', mrr: 20, channels: ['wa'] },
]

const CONVERSATIONS = [
  {
    channel: 'whatsapp', handle: '+965 66xx 1122', name: 'Sara Al-Mutairi', since: 'Mar 2026', orders: 7, mode: 'ai', unread: 2,
    prev: 'Is the new oud collection available?',
    msgs: [
      { s: 'customer', b: 'Hi! Is the new oud collection available for delivery?' },
      { s: 'ai', b: 'Hala Sara! 👋 Yes — the Royal Oud collection arrived this week. 50ml is 45 KWD and 100ml is 79 KWD. Would you like me to reserve one?' },
      { s: 'customer', b: 'Yes please, 50ml. Do you deliver to Salmiya?' },
      { s: 'ai', b: 'We do! Delivery to Salmiya is 1.5 KWD, arriving same day for orders before 6 PM. Shall I confirm your order?' },
    ],
  },
  {
    channel: 'instagram', handle: '@khalid.kw', name: '@khalid.kw', since: 'Jul 2026', orders: 0, mode: 'ai', unread: 1,
    prev: 'How much is the premium package?',
    msgs: [
      { s: 'customer', b: 'How much is the premium gift package?' },
      { s: 'ai', b: 'Ahlan! The premium gift box (3 x 30ml + candle) is 62 KWD, with free engraving this week ✨' },
    ],
  },
  {
    channel: 'voice', handle: '+965 55xx 7788', name: '+965 55xx 7788', since: '—', orders: 1, mode: 'ai', unread: 0,
    prev: 'Call · 1:58 · resolved by AI',
    msgs: [
      { s: 'customer', b: '[Transcript] What time do you close today?' },
      { s: 'ai', b: '[Transcript] We are open until 10 PM tonight. Anything else I can help with?' },
    ],
  },
  {
    channel: 'web', handle: 'visitor-8812', name: 'Website visitor #8812', since: '—', orders: 0, mode: 'human', unread: 0,
    prev: 'Do you ship internationally?',
    msgs: [
      { s: 'customer', b: 'Do you ship internationally?' },
      { s: 'ai', b: 'Currently we deliver inside Kuwait. For GCC shipping, let me connect you with our team.' },
      { s: 'human', b: 'Hi! We can arrange GCC shipping via Aramex — where would you like it sent?' },
    ],
  },
  {
    channel: 'whatsapp', handle: '+965 99xx 4451', name: 'Fatima H.', since: 'Jan 2026', orders: 12, mode: 'ai', unread: 0,
    prev: 'Shukran! Order received 🌸',
    msgs: [
      { s: 'ai', b: 'Your order #1042 is out for delivery 🚚' },
      { s: 'customer', b: 'Shukran! Order received 🌸' },
    ],
  },
]

const KB = [
  { type: 'file', title: 'Price-List-2026.pdf', meta: '42 products · trained 2 days ago', status: 'trained' },
  { type: 'file', title: 'Delivery-Policy.docx', meta: 'Areas & fees · trained 2 days ago', status: 'trained' },
  { type: 'url', title: 'alnoorperfumes.com/faq', meta: '18 Q&As imported', status: 'trained', source_url: 'https://alnoorperfumes.com/faq' },
  { type: 'qa', title: 'Manual Q&As', meta: '31 custom answers', status: 'trained' },
  { type: 'file', title: 'Ramadan-Offers.xlsx', meta: 'Uploading…', status: 'processing' },
]

const LEADS = [
  { name: 'Sara Al-Mutairi', contact: '+965 66xx 1122', channel: 'whatsapp', status: 'won', note: 'Royal Oud 50ml' },
  { name: '@khalid.kw', contact: 'IG DM', channel: 'instagram', status: 'warm', note: 'Premium gift box' },
  { name: 'Fatima H.', contact: '+965 99xx 4451', channel: 'whatsapp', status: 'won', note: 'Repeat customer' },
]

const CALLS = [
  { caller: '+965 66xx 1122', direction: 'inbound', duration_sec: 222, summary: 'Asked about oud collection — interested in 50ml Royal Oud, quoted 45 KWD, requested WhatsApp follow-up.' },
  { caller: '+965 55xx 7788', direction: 'inbound', duration_sec: 118, summary: 'Store hours question — resolved by AI, no handoff needed.' },
  { caller: '+965 99xx 3344', direction: 'outbound', duration_sec: 255, summary: 'Outbound reminder call — order #1042 ready for pickup, customer confirmed.' },
]

const BOT_CHANNELS = [
  { channel: 'whatsapp', greeting: "Hala! 👋 Welcome to Al Noor Perfumes. I'm your AI assistant — how can I help you today?" },
  { channel: 'instagram', greeting: 'Ahlan! Thanks for reaching out to Al Noor Perfumes ✨' },
  { channel: 'voice', greeting: 'Thank you for calling Al Noor Perfumes. This is the AI assistant — how may I help you?' },
  { channel: 'web', greeting: 'Hala! 👋 Ask me anything about our perfumes.' },
]

const INVOICES = [
  { biz: 'Shgardi Auto', number: 'INV-2026-0112', description: 'Complete Pro — July', amount: 349.0, status: 'paid', due: '2026-07-01' },
  { biz: 'Al Noor Perfumes', number: 'INV-2026-0107', description: 'Complete Growth — July', amount: 145.0, status: 'paid', due: '2026-07-01' },
  { biz: 'Al Noor Perfumes', number: 'INV-2026-0086', description: 'Complete Growth — June', amount: 145.0, status: 'paid', due: '2026-06-01' },
  { biz: 'Al Noor Perfumes', number: 'INV-2026-0061', description: 'Complete Growth — May', amount: 145.0, status: 'paid', due: '2026-05-01' },
  { biz: 'Al Noor Perfumes', number: 'INV-2026-0043', description: 'Social Growth — April', amount: 48.0, status: 'paid', due: '2026-04-01' },
  { biz: 'Kuwait Dental Co.', number: 'INV-2026-0104', description: 'Complete Growth — July', amount: 145.0, status: 'unpaid', due: '2026-07-01' },
  { biz: 'GulfTech Repairs', number: 'INV-2026-0101', description: 'WhatsApp Starter — July', amount: 20.0, status: 'overdue', due: '2026-07-01' },
  { biz: 'Marina Cafe', number: 'INV-2026-0099', description: 'Setup fee', amount: 48.0, status: 'overdue', due: '2026-06-25' },
]

const PAYMENTS = [
  { biz: 'Shgardi Auto', reference: 'PAY-8841', method: 'knet', amount: 349.0, status: 'paid' },
  { biz: 'Al Noor Perfumes', reference: 'PAY-8836', method: 'card', amount: 145.0, status: 'paid' },
  { biz: 'Dar Al Teeb', reference: 'PAY-8830', method: 'transfer', amount: 76.0, status: 'paid' },
  { biz: 'GulfTech Repairs', reference: 'PAY-8822', method: 'knet', amount: 20.0, status: 'failed' },
  { biz: 'Zahra Boutique', reference: 'PAY-8817', method: 'link', amount: 32.0, status: 'pending' },
]

const REQUESTS = [
  { business_name: 'Lulu Flowers KW', contact_name: 'Noura S.', email: 'noura@luluflowers.com', whatsapp: '+965 66x 1189', interested_plan: 'bundle_social', message: 'We get 100+ Instagram DMs a day and miss most of them. Need auto-replies in Arabic and English.' },
  { business_name: 'Q8 Fitness Hub', contact_name: 'Bader A.', email: 'bader@q8fitness.com', whatsapp: '+965 99x 5521', interested_plan: 'bundle_complete', message: 'Want WhatsApp bot for class bookings plus a voice agent to answer calls about membership.' },
  { business_name: 'Mama Ghanima Kitchen', contact_name: 'Ghanima F.', email: 'orders@mamaghanima.com', whatsapp: '+965 55x 7710', interested_plan: 'whatsapp', message: 'Daily menu orders on WhatsApp are overwhelming us. Can the bot take orders?' },
]

const period = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function run() {
  // 1. admin — private workspace (never share STS Official across admin logins)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com'
  let adminBiz = await one(`select id from sts_businesses where name='STS Official' limit 1`)
  if (!adminBiz) {
    adminBiz = await one(
      `insert into sts_businesses (name, plan_code, status) values ('STS Official','free','paid') returning id`,
    )
  }
  await upsertUser({
    email: adminEmail,
    name: process.env.ADMIN_NAME || 'STS Admin',
    role: 'admin',
    business_id: adminBiz.id,
    password: process.env.ADMIN_PASSWORD || 'admin@123!',
  })
  const adminRow = await one(`select id from sts_users where email=$1`, [adminEmail.toLowerCase()])
  if (adminRow) {
    await pool.query(`update sts_businesses set owner_user_id=$1 where id=$2`, [adminRow.id, adminBiz.id])
  }
  console.log('✓ admin account:', adminEmail)

  // 2. businesses + client users
  const bizId = {}
  for (const b of BUSINESSES) {
    const id = await getOrCreateBusiness(b)
    bizId[b.name] = id
    await upsertUser({ email: b.email, name: b.name + ' Owner', role: 'client', business_id: id, password: CLIENT_PW })
  }
  console.log('✓ businesses + client logins:', BUSINESSES.length)

  const alNoor = bizId['Al Noor Perfumes']

  // 3. Al Noor conversations + messages (only if not already seeded)
  const convCount = await one('select count(*)::int n from sts_conversations where business_id=$1', [alNoor])
  if (convCount.n === 0) {
    for (const c of CONVERSATIONS) {
      const conv = await one(
        `insert into sts_conversations
           (business_id, channel, customer_handle, customer_name, customer_since, orders, mode, unread, last_message_preview)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [alNoor, c.channel, c.handle, c.name, c.since, c.orders, c.mode, c.unread, c.prev],
      )
      for (const m of c.msgs) {
        await pool.query(
          `insert into sts_messages (conversation_id, business_id, direction, sender, body)
           values ($1,$2,$3,$4,$5)`,
          [conv.id, alNoor, m.s === 'customer' ? 'in' : 'out', m.s, m.b],
        )
      }
    }
    console.log('✓ conversations + messages seeded')
  } else {
    console.log('• conversations already present — skipped')
  }

  // 4. knowledge (only if empty)
  const kbCount = await one('select count(*)::int n from sts_knowledge_sources where business_id=$1', [alNoor])
  if (kbCount.n === 0) {
    for (const k of KB) {
      await pool.query(
        `insert into sts_knowledge_sources (business_id, type, title, meta, source_url, status)
         values ($1,$2,$3,$4,$5,$6)`,
        [alNoor, k.type, k.title, k.meta, k.source_url || null, k.status],
      )
    }
    console.log('✓ knowledge sources seeded')
  }

  // 5. leads (only if empty)
  const leadCount = await one('select count(*)::int n from sts_leads where business_id=$1', [alNoor])
  if (leadCount.n === 0) {
    for (const l of LEADS) {
      await pool.query(
        `insert into sts_leads (business_id, name, contact, channel, status, note) values ($1,$2,$3,$4,$5,$6)`,
        [alNoor, l.name, l.contact, l.channel, l.status, l.note],
      )
    }
    console.log('✓ leads seeded')
  }

  // 6. calls (only if empty)
  const callCount = await one('select count(*)::int n from sts_call_logs where business_id=$1', [alNoor])
  if (callCount.n === 0) {
    for (const c of CALLS) {
      await pool.query(
        `insert into sts_call_logs (business_id, caller, direction, duration_sec, summary) values ($1,$2,$3,$4,$5)`,
        [alNoor, c.caller, c.direction, c.duration_sec, c.summary],
      )
    }
    console.log('✓ call logs seeded')
  }

  // 7. bot settings (upsert)
  for (const bc of BOT_CHANNELS) {
    await pool.query(
      `insert into sts_bot_settings (business_id, channel, greeting)
       values ($1,$2,$3)
       on conflict (business_id, channel) do update set greeting=excluded.greeting`,
      [alNoor, bc.channel, bc.greeting],
    )
  }
  console.log('✓ bot settings seeded')

  // 8. usage counters (upsert)
  const usage = [
    { metric: 'wa_messages', used: 3412, quota: 5000 },
    { metric: 'ig_contacts', used: 2105, quota: 5000 },
    { metric: 'voice_minutes', used: 512, quota: 900 },
  ]
  for (const u of usage) {
    await pool.query(
      `insert into sts_usage_counters (business_id, period, metric, used, quota)
       values ($1,$2,$3,$4,$5)
       on conflict (business_id, period, metric) do update set used=excluded.used, quota=excluded.quota`,
      [alNoor, period(), u.metric, u.used, u.quota],
    )
  }
  console.log('✓ usage counters seeded')

  // 9. invoices (upsert by number)
  for (const inv of INVOICES) {
    await pool.query(
      `insert into sts_invoices (business_id, number, description, amount_kwd, status, due_at)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (number) do update set status=excluded.status, amount_kwd=excluded.amount_kwd`,
      [bizId[inv.biz], inv.number, inv.description, inv.amount, inv.status, inv.due],
    )
  }
  console.log('✓ invoices seeded')

  // 10. payments (upsert by reference)
  for (const p of PAYMENTS) {
    await pool.query(
      `insert into sts_payments (business_id, reference, method, amount_kwd, status)
       values ($1,$2,$3,$4,$5)
       on conflict (reference) do update set status=excluded.status`,
      [bizId[p.biz], p.reference, p.method, p.amount, p.status],
    )
  }
  console.log('✓ payments seeded')

  // 11. access requests (only if none pending)
  const reqCount = await one("select count(*)::int n from sts_access_requests where status='new'", [])
  if (reqCount.n === 0) {
    for (const r of REQUESTS) {
      await pool.query(
        `insert into sts_access_requests (business_name, contact_name, email, whatsapp, interested_plan, message)
         values ($1,$2,$3,$4,$5,$6)`,
        [r.business_name, r.contact_name, r.email, r.whatsapp, r.interested_plan, r.message],
      )
    }
    console.log('✓ access requests seeded')
  }

  // 12. default platform settings (admin can edit later; keep existing values)
  const defaultSettings = {
    support_whatsapp: '+965 0000 0000',
    support_email: 'sts@shgardiauto.com',
    currency: 'KWD',
  }
  for (const [key, value] of Object.entries(defaultSettings)) {
    await pool.query(
      `insert into sts_settings (key, value) values ($1,$2) on conflict (key) do nothing`,
      [key, value],
    )
  }
  console.log('✓ platform settings seeded')

  console.log('\n✓ SEED COMPLETE')
  console.log('  Admin login :', process.env.ADMIN_EMAIL, '/', process.env.ADMIN_PASSWORD)
  console.log('  Client login: owner@alnoorperfumes.com /', CLIENT_PW)
}

run()
  .then(() => pool.end())
  .catch((e) => {
    console.error('✗ seed failed:', e)
    pool.end()
    process.exit(1)
  })
