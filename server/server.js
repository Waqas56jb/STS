import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, one, many, tx } from './db.js'
import { comparePassword, hashPassword, signToken, auth, adminOnly } from './lib/auth.js'
import { encryptJSON, decryptJSON, maskCredentials } from './lib/crypto.js'
import { CONNECTION_SPEC, CHANNELS, isConnected } from './lib/channels.js'
import { conversationShape, messageShape, relTime, kwd, dmy } from './lib/shape.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

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
  res.json({
    conversations_today: convToday.n,
    ai_resolved: ai,
    leads: leads.n,
    by_channel: byChannel,
    week,
  })
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
  const rows = await many(`select caller, direction, duration_sec, summary from sts_call_logs where business_id=$1 order by created_at desc limit 20`, [biz(req)])
  res.json(rows)
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

// Knowledge base
app.get('/api/knowledge', auth, wrap(async (req, res) => {
  const rows = await many(`select id, type, title, meta, source_url, status, created_at from sts_knowledge_sources where business_id=$1 order by created_at desc`, [biz(req)])
  res.json(rows)
}))

app.post('/api/knowledge', auth, wrap(async (req, res) => {
  const { type, title, content, source_url, meta } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, status)
     values ($1,$2,$3,$4,$5,$6,'trained') returning id, type, title, meta, source_url, status, created_at`,
    [biz(req), type || 'qa', title, content || null, source_url || null, meta || null],
  )
  res.status(201).json(row)
}))

app.delete('/api/knowledge/:id', auth, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1 and business_id=$2`, [req.params.id, biz(req)])
  res.json({ ok: true })
}))

// Client-visible connection status (read-only, masked)
app.get('/api/me/connections', auth, wrap(async (req, res) => {
  res.json(await connectionsFor(biz(req)))
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

// ADMIN: manage any business's connections
app.get('/api/admin/connection-spec', auth, adminOnly, wrap(async (_req, res) => {
  res.json(CONNECTION_SPEC)
}))

app.get('/api/admin/businesses/:id/connections', auth, adminOnly, wrap(async (req, res) => {
  res.json(await connectionsFor(req.params.id))
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
  const rows = await many(
    `select id, type, title, meta, source_url, status, created_at from sts_knowledge_sources where business_id=$1 order by created_at desc`,
    [req.params.id],
  )
  res.json(rows)
}))

app.post('/api/admin/businesses/:id/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const { type, title, content, source_url, meta } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, status)
     values ($1,$2,$3,$4,$5,$6,'trained') returning id, type, title, meta, source_url, status, created_at`,
    [req.params.id, type || 'qa', title, content || null, source_url || null, meta || null],
  )
  res.status(201).json(row)
}))

app.delete('/api/admin/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

/** Build masked connection status for all channels of a business. */
async function connectionsFor(businessId) {
  const rows = await many(`select channel, connected, secrets_enc, updated_at from sts_channel_configs where business_id=$1`, [businessId])
  const byCh = {}
  rows.forEach((r) => (byCh[r.channel] = r))
  return CHANNELS.map((channel) => {
    const row = byCh[channel]
    const creds = row ? decryptJSON(row.secrets_enc) : {}
    return {
      channel,
      connected: row?.connected || false,
      fields: maskCredentials(creds),
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
 * START
 * ============================================================== */
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`STS API on http://localhost:${PORT}`))
