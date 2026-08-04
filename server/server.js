import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, one, many, tx } from './db.js'
import { comparePassword, hashPassword, signToken, auth, adminOnly } from './lib/auth.js'
import { encryptJSON, decryptJSON, maskCredentials, maskValue } from './lib/crypto.js'
import { CONNECTION_SPEC, CHANNELS, isConnected } from './lib/channels.js'
import { conversationShape, messageShape, relTime, kwd, dmy } from './lib/shape.js'
import { sendWhatsAppText, verifyMetaSignature, parseInboundMessages } from './lib/whatsapp.js'
import { generateReply } from './lib/ai.js'
import { twimlStream, twilioCreateCall, attachVoiceBridge } from './lib/voice.js'
import http from 'node:http'
import { WebSocketServer } from 'ws'

const app = express()
// keep the raw body so Meta webhook signatures (X-Hub-Signature-256) can be verified
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf } }))
// Twilio posts webhooks as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
app.use(
  cors({
    origin(origin, cb) {
      // allow: no-origin (curl/health), configured origins, any localhost port,
      // and any *.vercel.app deployment (production + preview URLs)
      if (!origin) return cb(null, true)
      if (origins.includes(origin)) return cb(null, true)
      let host = ''
      try { host = new URL(origin).hostname } catch { /* ignore */ }
      if (/^(localhost|127\.0\.0\.1)$/.test(host)) return cb(null, true)
      if (/\.vercel\.app$/.test(host)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(req.method, req.path, '→', e.message)
  res.status(500).json({ error: 'Server error' })
})
const biz = (req) => req.user.business_id
const period = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ================================================================
 * HEALTH
 * ============================================================== */
app.get('/api/health', wrap(async (_req, res) => {
  const r = await one('select now() as t')
  res.json({ ok: true, service: 'sts-api', db_time: r.t })
}))

/* ================================================================
 * AUTH
 * ============================================================== */
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const user = await one(
    `select u.*, b.name as business_name, b.plan_code, b.status as business_status
       from sts_users u left join sts_businesses b on b.id = u.business_id
      where u.email = $1`,
    [String(email).toLowerCase()],
  )
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!(await comparePassword(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' })
  if (user.business_status === 'suspended')
    return res.status(403).json({ error: 'Account suspended — contact STS support' })

  await pool.query('update sts_users set last_login = now() where id = $1', [user.id])
  res.json({
    token: signToken(user),
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      business_id: user.business_id, business_name: user.business_name, plan: user.plan_code,
    },
  })
}))

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  res.json({
    id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role,
    business_id: req.user.business_id, business_name: req.user.business_name, plan: req.user.plan_code,
  })
}))

/* ================================================================
 * WHATSAPP — Meta Cloud API webhook + AI agent
 * ============================================================== */

/** Decrypted credentials for a business+channel (null if not configured). */
async function getChannelCreds(businessId, channel) {
  const row = await one(`select secrets_enc from sts_channel_configs where business_id=$1 and channel=$2`, [businessId, channel])
  return row ? decryptJSON(row.secrets_enc) : null
}

/** True if the verify token matches the platform token or any business's WhatsApp verify_token. */
async function isValidWhatsAppVerifyToken(token) {
  if (!token) return false
  if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) return true
  const rows = await many(`select secrets_enc from sts_channel_configs where channel='whatsapp'`)
  for (const r of rows) {
    try { if (decryptJSON(r.secrets_enc)?.verify_token === token) return true } catch { /* skip */ }
  }
  return false
}

// Webhook verification (Meta calls this once when you save the callback URL).
app.get('/api/webhooks/whatsapp', wrap(async (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && (await isValidWhatsAppVerifyToken(token))) {
    return res.status(200).send(String(challenge))
  }
  res.sendStatus(403)
}))

// Inbound messages. Always ACK 200 fast so Meta doesn't retry; process inline.
app.post('/api/webhooks/whatsapp', wrap(async (req, res) => {
  const inbound = parseInboundMessages(req.body)
  if (!inbound.length) return res.sendStatus(200)

  // group by phone_number_id → each maps to one business
  const byPhone = {}
  for (const m of inbound) (byPhone[m.phoneNumberId] ||= []).push(m)

  for (const [phoneId, msgs] of Object.entries(byPhone)) {
    const cfg = await one(`select business_id, secrets_enc from sts_channel_configs where channel='whatsapp' and ext_ref=$1`, [phoneId])
    if (!cfg) continue
    let creds
    try { creds = decryptJSON(cfg.secrets_enc) } catch { continue }
    // verify Meta's signature with this business's app secret (skip only if none is set)
    if (creds.app_secret && !verifyMetaSignature(creds.app_secret, req.rawBody, req.get('x-hub-signature-256'))) {
      console.warn('WhatsApp signature mismatch for phone_number_id', phoneId)
      continue
    }
    for (const m of msgs) {
      await handleInboundWhatsApp(cfg.business_id, creds, m).catch((e) => console.error('WA handle error:', e.message))
    }
  }
  res.sendStatus(200)
}))

/** Store an inbound WhatsApp message and, if auto-reply is on, answer with the AI agent. */
async function handleInboundWhatsApp(businessId, creds, msg) {
  const biz = await one(`select name from sts_businesses where id=$1`, [businessId])

  // upsert the conversation (one thread per customer number)
  const conv = await one(
    `insert into sts_conversations (business_id, channel, customer_handle, customer_name, last_message_preview, last_message_at, unread)
     values ($1,'whatsapp',$2,$3,$4, now(), 1)
     on conflict (business_id, channel, customer_handle) do update set
       customer_name = coalesce(sts_conversations.customer_name, excluded.customer_name),
       last_message_preview = excluded.last_message_preview, last_message_at = now(),
       unread = sts_conversations.unread + 1
     returning id, mode`,
    [businessId, msg.from, msg.name, msg.text],
  )

  // prior turns for context (before inserting the new one)
  const prior = await many(
    `select direction, body from sts_messages where conversation_id=$1 order by created_at desc limit 8`,
    [conv.id],
  )

  // store the inbound message; skip if we've already processed this Meta id (retry)
  const ins = await one(
    `insert into sts_messages (conversation_id, business_id, direction, sender, body, provider_msg_id)
     values ($1,$2,'in','customer',$3,$4)
     on conflict (provider_msg_id) do nothing
     returning id`,
    [conv.id, businessId, msg.text, msg.messageId],
  )
  if (!ins) return // duplicate delivery → already handled

  // respect auto-reply + human-takeover
  const bot = await one(`select auto_reply from sts_bot_settings where business_id=$1 and channel='whatsapp'`, [businessId])
  const autoReply = bot ? bot.auto_reply : true
  if (!autoReply || conv.mode === 'human') return

  const history = prior.reverse().map((h) => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }))
  const reply = await generateReply({ businessId, businessName: biz?.name, channel: 'whatsapp', userText: msg.text, history })

  await sendWhatsAppText(creds, msg.from, reply)
  await pool.query(
    `insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'out','ai',$3)`,
    [conv.id, businessId, reply],
  )
  await pool.query(`update sts_conversations set last_message_preview=$2, last_message_at=now() where id=$1`, [conv.id, reply])
}

/* ================================================================
 * PUBLIC — access requests + plans
 * ============================================================== */
app.post('/api/requests', wrap(async (req, res) => {
  const { business_name, contact_name, email, whatsapp, interested_plan, message } = req.body || {}
  if (!business_name || !email) return res.status(400).json({ error: 'business_name and email are required' })
  const row = await one(
    `insert into sts_access_requests (business_name, contact_name, email, whatsapp, interested_plan, message)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [business_name, contact_name || null, email, whatsapp || null, interested_plan || null, message || null],
  )
  res.status(201).json({ ok: true, id: row.id })
}))

app.get('/api/plans', wrap(async (_req, res) => {
  const rows = await many('select * from sts_plans where active order by sort')
  res.json(rows)
}))

/* ================================================================
 * CLIENT — scoped to the caller's business
 * ============================================================== */
app.get('/api/me/summary', auth, wrap(async (req, res) => {
  const b = biz(req)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [convToday, msgs, leads] = await Promise.all([
    one(`select count(*)::int n from sts_conversations where business_id=$1 and last_message_at >= $2`, [b, today.toISOString()]),
    many(`select sender from sts_messages where business_id=$1`, [b]),
    one(`select count(*)::int n from sts_leads where business_id=$1`, [b]),
  ])
  const ai = msgs.length ? Math.round((msgs.filter((m) => m.sender === 'ai').length / msgs.length) * 100) : 0

  // real chart data
  const byChannel = await many(
    `select channel, count(*)::int n from sts_conversations where business_id=$1 group by channel`, [b],
  )
  const week = await many(
    `select to_char(created_at,'Dy') d, count(*)::int n
       from sts_messages where business_id=$1 and created_at > now() - interval '7 days'
      group by 1`, [b],
  )
  const totals = await one(
    `select (select count(*)::int from sts_conversations where business_id=$1) conv_total,
            (select count(*)::int from sts_messages where business_id=$1) msg_total`, [b],
  )
  res.json({
    conversations_today: convToday.n,
    ai_resolved: ai,
    leads: leads.n,
    by_channel: byChannel,
    week,
    conversations_total: totals.conv_total,
    messages_total: totals.msg_total,
  })
}))

// Business profile for the customer Settings + Widget pages.
app.get('/api/me/profile', auth, wrap(async (req, res) => {
  const row = await one(
    `select b.name, b.whatsapp, b.hours, b.language, b.widget_key, u.email
       from sts_businesses b
       join sts_users u on u.business_id=b.id and u.role='client'
      where b.id=$1 order by u.created_at limit 1`,
    [biz(req)],
  )
  if (!row) return res.status(404).json({ error: 'Profile not found' })
  res.json({
    business_name: row.name, email: row.email, whatsapp: row.whatsapp || '',
    hours: row.hours || '', language: row.language || 'auto', widget_key: row.widget_key,
  })
}))

app.put('/api/me/profile', auth, wrap(async (req, res) => {
  const { business_name, whatsapp, hours, language } = req.body || {}
  const sets = [], params = [biz(req)]
  const add = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`) } }
  add('name', business_name)
  add('whatsapp', whatsapp)
  add('hours', hours)
  add('language', language)
  if (sets.length) await pool.query(`update sts_businesses set ${sets.join(', ')} where id=$1`, params)
  res.json({ ok: true })
}))

// Customer changes their own login password (verifies the current one).
app.put('/api/me/password', auth, wrap(async (req, res) => {
  const current = String(req.body?.current || '')
  const next = String(req.body?.next || '').trim()
  if (next.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' })
  const u = await one(`select id, password_hash from sts_users where id=$1`, [req.user.id])
  if (!u || !(await comparePassword(current, u.password_hash)))
    return res.status(401).json({ error: 'Current password is incorrect' })
  await pool.query(
    `update sts_users set password_hash=$2, password_enc=$3 where id=$1`,
    [u.id, await hashPassword(next), encryptJSON({ p: next })],
  )
  res.json({ ok: true })
}))

app.get('/api/me/usage', auth, wrap(async (req, res) => {
  const rows = await many(
    `select metric, used, quota from sts_usage_counters where business_id=$1 and period=$2`,
    [biz(req), period()],
  )
  const map = {}
  rows.forEach((r) => (map[r.metric] = { used: r.used, quota: r.quota }))
  res.json(map)
}))

// Analytics charts for the customer dashboard — all derived from real rows,
// empty arrays/zeros when the business has no data yet.
app.get('/api/me/analytics', auth, wrap(async (req, res) => {
  const b = biz(req)
  const [daily, senders, leads] = await Promise.all([
    many(
      `select to_char(date_trunc('day', created_at),'Mon DD') d, count(*)::int n
         from sts_messages where business_id=$1 and created_at > now() - interval '30 days'
        group by date_trunc('day', created_at) order by date_trunc('day', created_at)`, [b],
    ),
    many(`select sender, count(*)::int n from sts_messages where business_id=$1 group by sender`, [b]),
    many(
      `select to_char(date_trunc('week', created_at),'Mon DD') w, count(*)::int n
         from sts_leads where business_id=$1 and created_at > now() - interval '56 days'
        group by date_trunc('week', created_at) order by date_trunc('week', created_at)`, [b],
    ),
  ])
  const cnt = (s) => senders.find((x) => x.sender === s)?.n || 0
  res.json({
    messages_daily: daily,
    resolution: { ai: cnt('ai'), human: cnt('human') },
    leads_weekly: leads,
  })
}))

app.get('/api/me/invoices', auth, wrap(async (req, res) => {
  const rows = await many(
    `select number, description, amount_kwd, status, coalesce(due_at, issued_at) d
       from sts_invoices where business_id=$1 order by coalesce(due_at, issued_at) desc`,
    [biz(req)],
  )
  res.json(rows.map((r) => ({ no: r.number, desc: r.description, amt: kwd(r.amount_kwd), date: dmy(r.d), status: r.status })))
}))

app.get('/api/me/leads', auth, wrap(async (req, res) => {
  const rows = await many(`select name, contact, channel, status, note from sts_leads where business_id=$1 order by created_at desc`, [biz(req)])
  res.json(rows)
}))

app.get('/api/me/calls', auth, wrap(async (req, res) => {
  res.json(await callList(biz(req)))
}))

// Inbox
app.get('/api/conversations', auth, wrap(async (req, res) => {
  const params = [biz(req)]
  let sql = `select * from sts_conversations where business_id=$1`
  if (req.query.channel) { params.push(req.query.channel); sql += ` and channel=$2` }
  sql += ` order by last_message_at desc limit 100`
  const rows = await many(sql, params)
  res.json(rows.map(conversationShape))
}))

app.get('/api/conversations/:id/messages', auth, wrap(async (req, res) => {
  const conv = await one(`select id, business_id, customer_name from sts_conversations where id=$1`, [req.params.id])
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' })
  const rows = await many(`select direction, sender, body, created_at from sts_messages where conversation_id=$1 order by created_at`, [req.params.id])
  // mark read
  await pool.query(`update sts_conversations set unread=0 where id=$1`, [req.params.id])
  res.json(rows.map((r) => messageShape(r, conv.customer_name)))
}))

app.post('/api/conversations/:id/messages', auth, wrap(async (req, res) => {
  const conv = await one(`select id, business_id from sts_conversations where id=$1`, [req.params.id])
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' })
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'Empty message' })
  await tx(async (c) => {
    await c.query(`insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'out',$3,$4)`,
      [conv.id, conv.business_id, req.body?.sender || 'human', body])
    await c.query(`update sts_conversations set last_message_preview=$2, last_message_at=now() where id=$1`, [conv.id, body])
  })
  res.json({ ok: true })
}))

app.patch('/api/conversations/:id', auth, wrap(async (req, res) => {
  const conv = await one(`select id, business_id from sts_conversations where id=$1`, [req.params.id])
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' })
  const sets = [], params = [req.params.id]
  if (req.body.mode) { params.push(req.body.mode); sets.push(`mode=$${params.length}`) }
  if (req.body.unread != null) { params.push(req.body.unread); sets.push(`unread=$${params.length}`) }
  if (sets.length) await pool.query(`update sts_conversations set ${sets.join(', ')} where id=$1`, params)
  res.json({ ok: true })
}))

// Bot settings
app.get('/api/bots/:channel', auth, wrap(async (req, res) => {
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel=$2`, [biz(req), req.params.channel])
  res.json(row || { channel: req.params.channel, auto_reply: true, human_handoff: true, after_hours_only: false, greeting: '', tone: 'friendly', language: 'auto' })
}))

app.put('/api/bots/:channel', auth, wrap(async (req, res) => {
  const b = req.body || {}
  const row = await one(
    `insert into sts_bot_settings (business_id, channel, auto_reply, human_handoff, after_hours_only, greeting, tone, language, widget_color, widget_position, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     on conflict (business_id, channel) do update set
       auto_reply=excluded.auto_reply, human_handoff=excluded.human_handoff, after_hours_only=excluded.after_hours_only,
       greeting=excluded.greeting, tone=excluded.tone, language=excluded.language,
       widget_color=excluded.widget_color, widget_position=excluded.widget_position, updated_at=now()
     returning *`,
    [biz(req), req.params.channel, b.auto_reply ?? true, b.human_handoff ?? true, b.after_hours_only ?? false,
     b.greeting || '', b.tone || 'friendly', b.language || 'auto', b.widget_color || '#0FBE8F', b.widget_position || 'bottom_right'],
  )
  res.json(row)
}))

// Knowledge base (per-agent scoped via `channel`; 'all' = shared)
const KB_CHANNELS = ['all', 'whatsapp', 'instagram', 'website', 'voice']
const kbChannel = (c) => (KB_CHANNELS.includes(c) ? c : 'all')
const KB_COLS = 'id, type, title, content, meta, source_url, status, channel, created_at'

/** Update a KB entry's editable fields. `businessGuard` scopes it to one business. */
async function updateKb(id, body = {}, businessGuard = null) {
  const sets = [], params = [id]
  const add = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`) } }
  add('title', body.title); add('content', body.content); add('source_url', body.source_url); add('meta', body.meta)
  if (body.channel !== undefined) { params.push(kbChannel(body.channel)); sets.push(`channel=$${params.length}`) }
  let where = 'id=$1'
  if (businessGuard) { params.push(businessGuard); where += ` and business_id=$${params.length}` }
  if (!sets.length) return one(`select ${KB_COLS} from sts_knowledge_sources where ${where}`, params)
  return one(`update sts_knowledge_sources set ${sets.join(', ')} where ${where} returning ${KB_COLS}`, params)
}

app.get('/api/knowledge', auth, wrap(async (req, res) => {
  const params = [biz(req)]
  let sql = `select ${KB_COLS} from sts_knowledge_sources where business_id=$1`
  if (req.query.channel && KB_CHANNELS.includes(req.query.channel)) { params.push(req.query.channel); sql += ` and channel=$2` }
  sql += ` order by created_at desc`
  res.json(await many(sql, params))
}))

app.post('/api/knowledge', auth, wrap(async (req, res) => {
  const { type, title, content, source_url, meta, channel } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,$2,$3,$4,$5,$6,$7,'trained') returning ${KB_COLS}`,
    [biz(req), type || 'qa', title, content || null, source_url || null, meta || null, kbChannel(channel)],
  )
  res.status(201).json(row)
}))

app.put('/api/knowledge/:id', auth, wrap(async (req, res) => {
  const row = await updateKb(req.params.id, req.body, biz(req))
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
}))

app.delete('/api/knowledge/:id', auth, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1 and business_id=$2`, [req.params.id, biz(req)])
  res.json({ ok: true })
}))

// Client-visible connection status (read-only, masked)
app.get('/api/me/connections', auth, wrap(async (req, res) => {
  res.json(await connectionsFor(biz(req), true))
}))

/* ================================================================
 * ADMIN
 * ============================================================== */
app.get('/api/admin/summary', auth, adminOnly, wrap(async (_req, res) => {
  const [mrr, paid, free, overdue] = await Promise.all([
    one(`select coalesce(sum(mrr),0)::numeric mrr from sts_businesses where status='paid'`),
    one(`select count(*)::int n from sts_businesses where status='paid'`),
    one(`select count(*)::int n from sts_businesses where status in ('free','suspended')`),
    one(`select count(*)::int n, coalesce(sum(amount_kwd),0)::numeric amt from sts_invoices where status='overdue'`),
  ])
  res.json({
    mrr: Number(mrr.mrr),
    paid: paid.n,
    free: free.n,
    overdue: overdue.n,
    overdue_amount: Number(overdue.amt),
  })
}))

app.get('/api/admin/requests', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(`select * from sts_access_requests where status='new' order by created_at desc`)
  res.json(rows.map((r) => ({
    id: r.id, business_name: r.business_name, contact_name: r.contact_name, email: r.email,
    whatsapp: r.whatsapp, interested_plan: r.interested_plan, message: r.message, created: relTime(r.created_at) + ' ago',
  })))
}))

app.post('/api/admin/requests/:id/approve', auth, adminOnly, wrap(async (req, res) => {
  const reqRow = await one(`select * from sts_access_requests where id=$1`, [req.params.id])
  if (!reqRow) return res.status(404).json({ error: 'Not found' })
  const created = await tx(async (c) => {
    const b = (await c.query(
      `insert into sts_businesses (name, whatsapp, plan_code, status) values ($1,$2,'free','free') returning id`,
      [reqRow.business_name, reqRow.whatsapp],
    )).rows[0]
    const plainPw = 'Sts@2026!'
    const tempPw = await hashPassword(plainPw)
    await c.query(
      `insert into sts_users (email, name, role, business_id, password_hash, password_enc)
       values ($1,$2,'client',$3,$4,$5) on conflict (email) do update set business_id=excluded.business_id`,
      [reqRow.email.toLowerCase(), reqRow.contact_name || reqRow.business_name, b.id, tempPw, encryptJSON({ p: plainPw })],
    )
    await c.query(`update sts_access_requests set status='approved' where id=$1`, [req.params.id])
    return b
  })
  res.json({ ok: true, business_id: created.id, email: reqRow.email.toLowerCase(), password: 'Sts@2026!' })
}))

app.post('/api/admin/requests/:id/reject', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`update sts_access_requests set status='rejected' where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

const chToShort = (channels) => (channels || []) // ['wa','ig','vc'] already

app.get('/api/admin/businesses', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(
    `select b.id, b.name, b.plan_code, b.mrr, b.status, b.channels,
            p.name as plan_name,
            (select email from sts_users u where u.business_id=b.id and u.role='client' order by created_at limit 1) as email
       from sts_businesses b left join sts_plans p on p.code=b.plan_code
      order by b.created_at`,
  )
  res.json(rows.map((r) => ({
    id: r.id, biz: r.name, email: r.email || '—', plan: r.plan_name || r.plan_code,
    mrr: Number(r.mrr), ch: chToShort(r.channels), status: r.status,
  })))
}))

app.post('/api/admin/businesses', auth, adminOnly, wrap(async (req, res) => {
  const { business_name, owner_name, email, whatsapp, plan_code, password } = req.body || {}
  if (!business_name || !email) return res.status(400).json({ error: 'business_name and email required' })
  const plan = await one(`select * from sts_plans where code=$1`, [plan_code || 'free'])
  const status = plan_code === 'free' || !plan ? 'free' : 'paid'
  const pw = (password && String(password).trim()) || 'Sts@2026!'
  const created = await tx(async (c) => {
    const b = (await c.query(
      `insert into sts_businesses (name, whatsapp, plan_code, status, mrr, channels)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [business_name, whatsapp || null, plan?.code || 'free', status, plan?.price_kwd || 0, plan?.channels || ['wa']],
    )).rows[0]
    const hash = await hashPassword(pw)
    // store both a one-way hash (for login) and a reversible copy (so admins can reveal it)
    await c.query(
      `insert into sts_users (email, name, role, business_id, password_hash, password_enc) values ($1,$2,'client',$3,$4,$5)
       on conflict (email) do update set business_id=excluded.business_id, password_hash=excluded.password_hash, password_enc=excluded.password_enc`,
      [email.toLowerCase(), owner_name || business_name, b.id, hash, encryptJSON({ p: pw })],
    )
    return b
  })
  res.status(201).json({ ok: true, id: created.id, email: email.toLowerCase(), password: pw })
}))

app.patch('/api/admin/businesses/:id', auth, adminOnly, wrap(async (req, res) => {
  const sets = [], params = [req.params.id]
  for (const f of ['status', 'plan_code', 'mrr', 'name']) {
    if (req.body[f] != null) { params.push(req.body[f]); sets.push(`${f}=$${params.length}`) }
  }
  if (sets.length) await pool.query(`update sts_businesses set ${sets.join(', ')} where id=$1`, params)
  res.json({ ok: true })
}))

// Reveal a customer's login credentials (admin only). Password is decrypted
// from password_enc; older accounts created before this feature return null,
// in which case the admin can reset it below.
app.get('/api/admin/businesses/:id/credential', auth, adminOnly, wrap(async (req, res) => {
  const u = await one(
    `select email, password_enc from sts_users where business_id=$1 and role='client' order by created_at limit 1`,
    [req.params.id],
  )
  if (!u) return res.status(404).json({ error: 'No customer account for this business' })
  let password = null
  try { password = u.password_enc ? decryptJSON(u.password_enc)?.p ?? null : null } catch { password = null }
  res.json({ email: u.email, password })
}))

// Set a new login password for the customer (updates both hash + reversible copy).
app.post('/api/admin/businesses/:id/reset-password', auth, adminOnly, wrap(async (req, res) => {
  const pw = (req.body?.password && String(req.body.password).trim()) || ''
  if (pw.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' })
  const u = await one(
    `select id, email from sts_users where business_id=$1 and role='client' order by created_at limit 1`,
    [req.params.id],
  )
  if (!u) return res.status(404).json({ error: 'No customer account for this business' })
  await pool.query(
    `update sts_users set password_hash=$2, password_enc=$3 where id=$1`,
    [u.id, await hashPassword(pw), encryptJSON({ p: pw })],
  )
  res.json({ ok: true, email: u.email, password: pw })
}))

// Delete a customer account + business (all related rows cascade).
app.delete('/api/admin/businesses/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_businesses where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

app.get('/api/admin/payments', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(
    `select p.reference, p.method, p.amount_kwd, p.status, p.created_at, b.name as biz
       from sts_payments p left join sts_businesses b on b.id=p.business_id order by p.created_at desc`,
  )
  res.json(rows.map((r) => ({
    ref: r.reference, biz: r.biz, meth: methodLabel(r.method), amt: kwd(r.amount_kwd), date: dmy(r.created_at), st: r.status,
  })))
}))

app.post('/api/admin/payments', auth, adminOnly, wrap(async (req, res) => {
  const { business_id, reference, method, amount, status } = req.body || {}
  const row = await one(
    `insert into sts_payments (business_id, reference, method, amount_kwd, status) values ($1,$2,$3,$4,$5) returning id`,
    [business_id, reference, method || 'knet', amount || 0, status || 'paid'],
  )
  res.status(201).json({ ok: true, id: row.id })
}))

app.get('/api/admin/invoices', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(
    `select i.number, i.description, i.amount_kwd, i.status, coalesce(i.due_at,i.issued_at) d, b.name as biz
       from sts_invoices i left join sts_businesses b on b.id=i.business_id order by coalesce(i.due_at,i.issued_at) desc`,
  )
  res.json(rows.map((r) => ({
    no: r.number, biz: r.biz, desc: r.description, amt: kwd(r.amount_kwd), due: dmy(r.d), st: r.status,
  })))
}))

app.post('/api/admin/invoices', auth, adminOnly, wrap(async (req, res) => {
  const { business_id, number, description, amount, due_at } = req.body || {}
  const row = await one(
    `insert into sts_invoices (business_id, number, description, amount_kwd, status, due_at)
     values ($1,$2,$3,$4,'unpaid',$5) returning id`,
    [business_id, number, description || '', amount || 0, due_at || null],
  )
  res.status(201).json({ ok: true, id: row.id })
}))

app.get('/api/admin/plans', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(
    `select p.*, (select count(*)::int from sts_businesses b where b.plan_code=p.code) subs
       from sts_plans p order by p.sort`,
  )
  res.json(rows.map((p) => ({
    name: p.name, cat: catLabel(p.category), quota: p.quota_label, price: Number(p.price_kwd).toFixed(2), subs: p.subs,
  })))
}))

app.get('/api/admin/analytics', auth, adminOnly, wrap(async (_req, res) => {
  const [byPlan, top, daily, revenue, growth, usage, totals] = await Promise.all([
    many(`select p.category, coalesce(sum(b.mrr),0)::numeric mrr from sts_businesses b join sts_plans p on p.code=b.plan_code group by p.category`),
    many(
      `select b.name, b.mrr,
              (select count(*)::int from sts_messages m where m.business_id=b.id) msgs,
              coalesce((select sum(duration_sec)/60 from sts_call_logs c where c.business_id=b.id),0)::int voice_min
         from sts_businesses b order by b.mrr desc limit 6`,
    ),
    many(`select to_char(date_trunc('day', created_at),'Mon DD') d, count(*)::int n from sts_messages where created_at > now() - interval '14 days' group by date_trunc('day', created_at) order by date_trunc('day', created_at)`),
    // monthly collected revenue (paid payments) — last 6 months
    many(`select to_char(date_trunc('month', created_at),'Mon') m, coalesce(sum(amount_kwd),0)::numeric total
            from sts_payments where status='paid' and created_at > now() - interval '6 months'
            group by date_trunc('month', created_at) order by date_trunc('month', created_at)`),
    // new businesses per month split by current status
    many(`select to_char(date_trunc('month', created_at),'Mon') m,
                 count(*) filter (where status='paid')::int paid,
                 count(*) filter (where status in ('free','suspended'))::int free
            from sts_businesses where created_at > now() - interval '6 months'
            group by date_trunc('month', created_at) order by date_trunc('month', created_at)`),
    // platform message volume by channel
    many(`select c.channel, count(m.*)::int n from sts_messages m join sts_conversations c on c.id=m.conversation_id group by c.channel`),
    one(`select coalesce(sum(mrr),0)::numeric mrr, count(*) filter (where status='paid')::int paid from sts_businesses`),
  ])
  res.json({
    by_plan: byPlan.map((r) => ({ category: r.category, mrr: Number(r.mrr) })),
    top_businesses: top.map((r) => ({ biz: r.name, mrr: kwd(r.mrr), msgs: r.msgs, voice_min: r.voice_min })),
    messages_daily: daily,
    revenue_monthly: revenue.map((r) => ({ m: r.m, total: Number(r.total) })),
    growth_monthly: growth.map((r) => ({ m: r.m, paid: r.paid, free: r.free })),
    usage_by_channel: usage.map((r) => ({ channel: r.channel, n: r.n })),
    arpu: totals.paid ? Number((Number(totals.mrr) / totals.paid).toFixed(1)) : 0,
  })
}))

/* ---------- ADMIN: platform settings ---------- */
const SETTINGS_PLAIN = ['support_whatsapp', 'support_email', 'currency']
const SETTINGS_SECRET = ['meta_app_id', 'openai_key', 'twilio_sid', 'elevenlabs_key']

app.get('/api/admin/settings', auth, adminOnly, wrap(async (_req, res) => {
  const rows = await many(`select key, value from sts_settings`)
  const map = {}
  rows.forEach((r) => (map[r.key] = r.value))
  const out = {}
  for (const k of SETTINGS_PLAIN) out[k] = map[k] || ''
  for (const k of SETTINGS_SECRET) {
    let plain = ''
    try { plain = map[k] ? decryptJSON(map[k])?.v || '' : '' } catch { plain = '' }
    out[k] = plain ? maskValue(plain) : '' // never send the real secret to the browser
  }
  res.json(out)
}))

app.put('/api/admin/settings', auth, adminOnly, wrap(async (req, res) => {
  const body = req.body || {}
  const existing = {}
  ;(await many(`select key, value from sts_settings`)).forEach((r) => (existing[r.key] = r.value))
  const upsert = async (key, value) =>
    pool.query(
      `insert into sts_settings (key, value, updated_at) values ($1,$2, now())
       on conflict (key) do update set value=excluded.value, updated_at=now()`,
      [key, value],
    )
  for (const k of SETTINGS_PLAIN) {
    if (body[k] !== undefined) await upsert(k, String(body[k]))
  }
  for (const k of SETTINGS_SECRET) {
    const v = body[k]
    if (v === undefined) continue
    if (String(v).includes('••')) continue // masked placeholder → keep stored
    if (String(v).trim() === '') continue // blank → keep stored
    await upsert(k, encryptJSON({ v: String(v).trim() }))
  }
  res.json({ ok: true })
}))

/* ---------- channel connection credentials ---------- */
/**
 * Merge + encrypt + store one channel's credentials for a business.
 * Blank or masked (••) incoming secret values keep the stored value, so a
 * partial edit never breaks a working connection. Returns `connected`.
 */
async function saveChannelConnection(businessId, channel, incoming = {}) {
  const existing = await one(`select secrets_enc from sts_channel_configs where business_id=$1 and channel=$2`, [businessId, channel])
  const current = existing ? decryptJSON(existing.secrets_enc) : {}
  const merged = { ...current }
  for (const f of CONNECTION_SPEC[channel].fields) {
    const v = incoming[f.key]
    if (v === undefined) continue
    if (String(v).includes('••')) continue // masked placeholder → keep existing
    if (String(v).trim() === '' && f.secret) continue // don't wipe a secret with blank
    merged[f.key] = v
  }
  const connected = isConnected(channel, merged)
  const extRef = merged[CONNECTION_SPEC[channel].extRef] || null
  await pool.query(
    `insert into sts_channel_configs (business_id, channel, connected, ext_ref, secrets_enc, updated_at)
     values ($1,$2,$3,$4,$5, now())
     on conflict (business_id, channel) do update set
       connected=excluded.connected, ext_ref=excluded.ext_ref, secrets_enc=excluded.secrets_enc, updated_at=now()`,
    [businessId, channel, connected, extRef, encryptJSON(merged)],
  )
  return connected
}

// spec is not secret — any authenticated user (admin or client) can read it
app.get('/api/connection-spec', auth, wrap(async (_req, res) => res.json(CONNECTION_SPEC)))

// CLIENT: manage own connections
app.put('/api/me/connections/:channel', auth, wrap(async (req, res) => {
  const { channel } = req.params
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' })
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  const connected = await saveChannelConnection(biz(req), channel, req.body?.fields || {})
  res.json({ ok: true, connected })
}))

app.delete('/api/me/connections/:channel', auth, wrap(async (req, res) => {
  const { channel } = req.params
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' })
  await pool.query(`delete from sts_channel_configs where business_id=$1 and channel=$2`, [biz(req), channel])
  res.json({ ok: true })
}))

// ADMIN: manage any business's connections
app.get('/api/admin/connection-spec', auth, adminOnly, wrap(async (_req, res) => {
  res.json(CONNECTION_SPEC)
}))

app.get('/api/admin/businesses/:id/connections', auth, adminOnly, wrap(async (req, res) => {
  res.json(await connectionsFor(req.params.id, true))
}))

app.put('/api/admin/businesses/:id/connections/:channel', auth, adminOnly, wrap(async (req, res) => {
  const { id, channel } = req.params
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' })
  const bizRow = await one(`select id from sts_businesses where id=$1`, [id])
  if (!bizRow) return res.status(404).json({ error: 'Business not found' })
  const connected = await saveChannelConnection(id, channel, req.body?.fields || {})
  res.json({ ok: true, connected })
}))

/* ---------- ADMIN: per-business knowledge base (chatbot training) ---------- */
app.get('/api/admin/businesses/:id/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const params = [req.params.id]
  let sql = `select ${KB_COLS} from sts_knowledge_sources where business_id=$1`
  if (req.query.channel && KB_CHANNELS.includes(req.query.channel)) { params.push(req.query.channel); sql += ` and channel=$2` }
  sql += ` order by created_at desc`
  res.json(await many(sql, params))
}))

app.post('/api/admin/businesses/:id/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const { type, title, content, source_url, meta, channel } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,$2,$3,$4,$5,$6,$7,'trained') returning ${KB_COLS}`,
    [req.params.id, type || 'qa', title, content || null, source_url || null, meta || null, kbChannel(channel)],
  )
  res.status(201).json(row)
}))

app.put('/api/admin/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  const row = await updateKb(req.params.id, req.body)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
}))

app.delete('/api/admin/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

/** Build masked connection status for all channels of a business. */
/**
 * Masked connection status for all channels of a business.
 * `reveal=true` returns the real decrypted values (so the owner/admin can SEE
 * and EDIT their saved credentials in the form — they persist in the DB until
 * the user changes them). `reveal=false` masks secrets for read-only views.
 */
async function connectionsFor(businessId, reveal = false) {
  const rows = await many(`select channel, connected, secrets_enc, updated_at from sts_channel_configs where business_id=$1`, [businessId])
  const byCh = {}
  rows.forEach((r) => (byCh[r.channel] = r))
  return CHANNELS.map((channel) => {
    const row = byCh[channel]
    let creds = {}
    try { creds = row ? decryptJSON(row.secrets_enc) : {} } catch { creds = {} }
    return {
      channel,
      connected: row?.connected || false,
      fields: reveal ? creds : maskCredentials(creds),
      updated_at: row?.updated_at || null,
    }
  })
}

/* ---------- label helpers ---------- */
function methodLabel(m) {
  return { knet: 'KNET', card: 'Credit Card', transfer: 'Bank Transfer', link: 'Payment Link' }[m] || m
}
function catLabel(c) {
  return { whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice', bundle: 'Bundle', free: 'Free' }[c] || c
}

/* ================================================================
 * VOICE AGENT — Twilio ⇄ OpenAI Realtime (incoming + outgoing)
 * ============================================================== */
const digits = (s) => String(s || '').replace(/[^\d+]/g, '')

function voiceBase(req) {
  if (process.env.VOICE_PUBLIC_BASE_URL) return process.env.VOICE_PUBLIC_BASE_URL.replace(/\/$/, '')
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  return `${proto}://${req.get('host')}`
}
function voiceWsUrl(req) {
  if (process.env.VOICE_PUBLIC_WS_URL) return process.env.VOICE_PUBLIC_WS_URL
  const proto = (req.get('x-forwarded-proto') || req.protocol) === 'https' ? 'wss' : 'ws'
  return `${proto}://${req.get('host')}/voice-stream`
}
function voiceWebhookInfo(base) {
  return {
    incoming_url: `${base}/api/voice/incoming`,
    status_url: `${base}/api/voice/status`,
    note: 'Twilio → your number → Voice Configuration → "A call comes in" = Webhook, HTTP POST → paste incoming_url. (Optional) Call status changes → status_url.',
  }
}
function callShape(r, full) {
  const s = {
    id: r.id, direction: r.direction, from: r.from_number, to: r.to_number, caller: r.caller,
    status: r.status, duration_sec: r.duration_sec, summary: r.summary, language: r.language,
    date: r.created_at, started_at: r.started_at, ended_at: r.ended_at,
  }
  if (full) { s.transcript = r.transcript; s.turns = r.transcript_json || [] }
  return s
}
async function callList(businessId) {
  const rows = await many(`select * from sts_call_logs where business_id=$1 order by created_at desc limit 100`, [businessId])
  return rows.map((r) => callShape(r, false))
}
/** Find the business that owns a given Twilio number (voice connection). */
async function businessByTwilioNumber(num) {
  const target = digits(num)
  const rows = await many(`select business_id, secrets_enc from sts_channel_configs where channel='voice'`)
  for (const r of rows) {
    try { if (digits(decryptJSON(r.secrets_enc).twilio_number) === target) return r.business_id } catch { /* skip */ }
  }
  return null
}
/** Place an outbound call for a business (shared by customer + admin). */
async function startOutboundCall(businessId, toRaw, base) {
  const to = digits(toRaw)
  if (!to || to.replace('+', '').length < 6) { const e = new Error('Enter a valid number with country code'); e.code = 400; throw e }
  const creds = await getChannelCreds(businessId, 'voice')
  if (!creds?.account_sid || !creds?.auth_token || !creds?.twilio_number) {
    const e = new Error('Connect your Twilio voice credentials first (Settings → Voice)'); e.code = 400; throw e
  }
  const twimlUrl = `${base}/api/voice/outgoing?businessId=${businessId}&to=${encodeURIComponent(to)}`
  const call = await twilioCreateCall({
    accountSid: creds.account_sid, authToken: creds.auth_token, from: creds.twilio_number,
    to, twimlUrl, statusCallback: `${base}/api/voice/status`,
  })
  await pool.query(
    `insert into sts_call_logs (business_id, direction, from_number, to_number, caller, status, provider_call_sid, started_at)
     values ($1,'outbound',$2,$3,$3,'initiated',$4, now()) on conflict (provider_call_sid) do nothing`,
    [businessId, creds.twilio_number, to, call.sid],
  ).catch(() => {})
  return call
}
/** The dedicated "STS Official" business the admin's own agent uses. */
async function platformBusinessId() {
  const s = await one(`select value from sts_settings where key='platform_business_id'`)
  if (s?.value) return s.value
  let b = await one(`select id from sts_businesses where name='STS Official' limit 1`)
  if (!b) b = await one(`insert into sts_businesses (name, plan_code, status) values ('STS Official','free','paid') returning id`)
  await pool.query(`insert into sts_settings (key,value) values ('platform_business_id',$1) on conflict (key) do update set value=excluded.value`, [b.id])
  return b.id
}

/* ---------- public Twilio webhooks (no auth) ---------- */
app.post('/api/voice/incoming', wrap(async (req, res) => {
  const to = req.body.To || req.body.Called
  const from = req.body.From || req.body.Caller
  const callSid = req.body.CallSid
  res.type('text/xml')
  const businessId = await businessByTwilioNumber(to)
  if (!businessId) {
    return res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured. Goodbye.</Say><Hangup/></Response>')
  }
  await pool.query(
    `insert into sts_call_logs (business_id, direction, from_number, to_number, caller, status, provider_call_sid, started_at)
     values ($1,'inbound',$2,$3,$2,'in_progress',$4, now()) on conflict (provider_call_sid) do nothing`,
    [businessId, from, to, callSid],
  ).catch(() => {})
  res.send(twimlStream(voiceWsUrl(req), { businessId, direction: 'inbound', from, to }))
}))

app.post('/api/voice/outgoing', wrap(async (req, res) => {
  const businessId = req.query.businessId
  const to = req.body.To || req.query.to
  const from = req.body.From || req.query.from
  res.type('text/xml')
  if (!businessId) return res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>')
  res.send(twimlStream(voiceWsUrl(req), { businessId, direction: 'outbound', from, to }))
}))

app.post('/api/voice/status', wrap(async (req, res) => {
  const sid = req.body.CallSid
  const st = req.body.CallStatus
  const dur = parseInt(req.body.CallDuration || '0', 10)
  if (sid && st) {
    const map = { 'in-progress': 'in_progress', completed: 'completed', failed: 'failed', 'no-answer': 'no_answer', busy: 'no_answer', canceled: 'failed', ringing: 'ringing', initiated: 'initiated' }
    await pool.query(
      `update sts_call_logs set status=$2, duration_sec=greatest(duration_sec,$3), ended_at=case when $2 in ('completed','failed','no_answer') then now() else ended_at end where provider_call_sid=$1`,
      [sid, map[st] || st, dur || 0],
    ).catch(() => {})
  }
  res.sendStatus(200)
}))

/* ---------- CUSTOMER voice endpoints ---------- */
app.post('/api/me/calls/dial', auth, wrap(async (req, res) => {
  try {
    const call = await startOutboundCall(biz(req), req.body?.to, voiceBase(req))
    res.json({ ok: true, call_sid: call.sid, status: call.status })
  } catch (e) { res.status(e.code || 500).json({ error: e.message }) }
}))
app.get('/api/me/calls/:id', auth, wrap(async (req, res) => {
  const row = await one(`select * from sts_call_logs where id=$1 and business_id=$2`, [req.params.id, biz(req)])
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(callShape(row, true))
}))
app.get('/api/me/voice/webhook-info', auth, wrap(async (req, res) => res.json(voiceWebhookInfo(voiceBase(req)))))

/* ---------- ADMIN voice endpoints (STS Official business) ---------- */
app.get('/api/admin/voice/context', auth, adminOnly, wrap(async (req, res) => {
  res.json({ business_id: await platformBusinessId(), ...voiceWebhookInfo(voiceBase(req)) })
}))
app.get('/api/admin/voice/connection', auth, adminOnly, wrap(async (_req, res) => {
  const conns = await connectionsFor(await platformBusinessId(), true)
  res.json(conns.find((c) => c.channel === 'voice'))
}))
app.put('/api/admin/voice/connection', auth, adminOnly, wrap(async (req, res) => {
  const connected = await saveChannelConnection(await platformBusinessId(), 'voice', req.body?.fields || {})
  res.json({ ok: true, connected })
}))
app.delete('/api/admin/voice/connection', auth, adminOnly, wrap(async (_req, res) => {
  await pool.query(`delete from sts_channel_configs where business_id=$1 and channel='voice'`, [await platformBusinessId()])
  res.json({ ok: true })
}))
app.post('/api/admin/voice/dial', auth, adminOnly, wrap(async (req, res) => {
  try {
    const call = await startOutboundCall(await platformBusinessId(), req.body?.to, voiceBase(req))
    res.json({ ok: true, call_sid: call.sid, status: call.status })
  } catch (e) { res.status(e.code || 500).json({ error: e.message }) }
}))
app.get('/api/admin/voice/calls', auth, adminOnly, wrap(async (_req, res) => res.json(await callList(await platformBusinessId()))))
app.get('/api/admin/voice/calls/:id', auth, adminOnly, wrap(async (req, res) => {
  const row = await one(`select * from sts_call_logs where id=$1 and business_id=$2`, [req.params.id, await platformBusinessId()])
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(callShape(row, true))
}))
// admin voice agent training (bot settings + knowledge) on the STS Official business
app.get('/api/admin/voice/bot', auth, adminOnly, wrap(async (_req, res) => {
  const pid = await platformBusinessId()
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel='voice'`, [pid])
  res.json(row || { channel: 'voice', greeting: '', tone: 'friendly', language: 'auto' })
}))
app.put('/api/admin/voice/bot', auth, adminOnly, wrap(async (req, res) => {
  const pid = await platformBusinessId()
  const b = req.body || {}
  const row = await one(
    `insert into sts_bot_settings (business_id, channel, greeting, tone, language, updated_at)
     values ($1,'voice',$2,$3,$4, now())
     on conflict (business_id, channel) do update set greeting=excluded.greeting, tone=excluded.tone, language=excluded.language, updated_at=now()
     returning *`,
    [pid, b.greeting || '', b.tone || 'friendly', b.language || 'auto'],
  )
  res.json(row)
}))
app.get('/api/admin/voice/knowledge', auth, adminOnly, wrap(async (_req, res) => {
  const pid = await platformBusinessId()
  // the voice agent uses its own 'voice' entries + anything shared as 'all'
  res.json(await many(`select ${KB_COLS} from sts_knowledge_sources where business_id=$1 and channel in ('all','voice') order by created_at desc`, [pid]))
}))
app.post('/api/admin/voice/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const pid = await platformBusinessId()
  const { type, title, content, source_url, meta, channel } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,$2,$3,$4,$5,$6,$7,'trained') returning ${KB_COLS}`,
    [pid, type || 'qa', title, content || null, source_url || null, meta || null, channel === 'all' ? 'all' : 'voice'],
  )
  res.status(201).json(row)
}))
app.put('/api/admin/voice/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  const body = { ...req.body }
  if (body.channel !== undefined) body.channel = body.channel === 'all' ? 'all' : 'voice'
  const row = await updateKb(req.params.id, body, await platformBusinessId())
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
}))
app.delete('/api/admin/voice/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1 and business_id=$2`, [req.params.id, await platformBusinessId()])
  res.json({ ok: true })
}))

/* ================================================================
 * START (HTTP + WebSocket for Twilio Media Streams)
 * ============================================================== */
const PORT = process.env.PORT || 4000
const server = http.createServer(app)

// Twilio Media Streams connect here; each connection is bridged to OpenAI Realtime.
const wss = new WebSocketServer({ server, path: '/voice-stream' })
wss.on('connection', (ws) => attachVoiceBridge(ws))

server.listen(PORT, () => console.log(`STS API + voice WS on http://localhost:${PORT}`))
