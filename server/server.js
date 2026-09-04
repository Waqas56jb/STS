import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, one, many, tx } from './db.js'
import { comparePassword, hashPassword, signToken, auth, adminOnly, userFromToken } from './lib/auth.js'
import { encryptJSON, decryptJSON, maskCredentials, maskValue } from './lib/crypto.js'
import { CONNECTION_SPEC, CHANNELS, isConnected, resolveWhatsAppProvider } from './lib/channels.js'
import { conversationShape, messageShape, relTime, kwd, dmy } from './lib/shape.js'
import { verifyMetaSignature, parseInboundMessages } from './lib/whatsapp.js'
import { sendWhatsAppByProvider, beginQrPresence } from './lib/whatsappTransport.js'
import { parseInboundInstagramMessages, sendInstagramText } from './lib/instagram.js'
import {
  attachQrSocket, startQrSession, stopQrSession, logoutQrSession, resolveQrStatus,
  restoreQrSessions, setQrInboundHandler, qrEnabled, businessAllowsWhatsApp,
} from './lib/whatsappQr.js'
import { generateReply } from './lib/ai.js'
import {
  customerKey, loadCustomerMemory, loadConversationHistory,
  touchCustomerMemory, refreshCustomerMemory,
} from './lib/memory.js'
import {
  fillRevenueMonthly, fillGrowthMonthly, fillMessagesDaily, fillPlanCategories,
} from './lib/adminAnalytics.js'
import { ensureTrainingSchema } from './lib/ensureSchema.js'
import {
  parseSiteConfig, DEFAULT_WHATSAPP, DEFAULT_EMAIL, waLink, pricingPlanUpdates,
} from './lib/siteConfig.js'
import {
  ensureUserWorkspace, adminOwns, customerBusinessIds, adminReportBusinessIds, allowedBusinessIds,
  emailTaken, idList, isPlatformAdmin, allCustomerBusinessIds,
} from './lib/tenant.js'
import multer from 'multer'
import { extractDocumentText, isSupportedTrainingFile } from './lib/extractText.js'
import { twimlStream, twilioCreateCall, attachVoiceBridge, attachVonageVoiceBridge } from './lib/voice.js'
import {
  getPlatformVonage, maskVonageForAdmin, verifyVonageSignature, nccoConnectWebsocket, vonageCreateCall, upsertVonageSettings,
} from './lib/vonage.js'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { publicBaseUrl, publicWsUrl, corsOrigins } from './lib/publicUrl.js'
import { fetchUrlText } from './lib/knowledge.js'
import {
  sendAccountReadyEmail, sendAccessRequestNotify, sendVerificationEmail, mailConfigured,
} from './lib/mail.js'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
// keep the raw body so Meta webhook signatures (X-Hub-Signature-256) can be verified
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf } }))
// Twilio posts webhooks as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))

const origins = corsOrigins()
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
      if (/(^|\.)stsq8\.com$/.test(host)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(req.method, req.path, '→', e.message)
  const status = e.status || (e.code === '23502' || e.code === '23503' ? 400 : 500)
  res.status(status).json({ error: e.status ? e.message : (e.message || 'Server error') })
})
const biz = (req) => {
  const id = req.user?.business_id
  if (!id) {
    const e = new Error('No workspace on this account')
    e.status = 403
    throw e
  }
  return id
}
const requireBiz = (req, res, next) => {
  if (!req.user?.business_id) return res.status(403).json({ error: 'No workspace on this account' })
  next()
}
const adminOwnsBiz = (req, res, next) => {
  adminOwns(req.user, req.params.id).then((ok) => {
    if (!ok) return res.status(404).json({ error: 'Not found' })
    next()
  }).catch(next)
}
const adminWorkspace = (req) => req.user.business_id
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

/* ---- public website widget (any origin) ---- */
app.use('/widget', express.static(path.join(__dirname, 'public/widget')))
const widgetCors = cors({ origin: true })
app.options('/api/widget/:key/*', widgetCors)
app.get('/api/widget/:key/config', widgetCors, wrap(async (req, res) => {
  const biz = await one(`select id, name from sts_businesses where widget_key=$1`, [req.params.key])
  if (!biz) return res.status(404).json({ error: 'Not found' })
  const bot = await one(`select greeting, widget_color, widget_position from sts_bot_settings where business_id=$1 and channel='web'`, [biz.id])
  res.json({
    business_name: biz.name,
    greeting: bot?.greeting || 'Hi! How can we help you today?',
    color: bot?.widget_color || '#0FBE8F',
    position: bot?.widget_position || 'bottom_right',
  })
}))
app.get('/api/widget/:key/history', widgetCors, wrap(async (req, res) => {
  const visitorId = req.query.visitor_id
  if (!visitorId) return res.json({ messages: [] })
  const biz = await one(`select id from sts_businesses where widget_key=$1`, [req.params.key])
  if (!biz) return res.status(404).json({ error: 'Not found' })
  const conv = await one(`select id from sts_conversations where business_id=$1 and channel='web' and customer_handle=$2`, [biz.id, visitorId])
  if (!conv) return res.json({ messages: [] })
  const rows = await many(`select direction, body from sts_messages where conversation_id=$1 order by created_at`, [conv.id])
  res.json({ messages: rows.map((r) => ({ role: r.direction === 'in' ? 'user' : 'assistant', text: r.body })) })
}))
app.post('/api/widget/:key/message', widgetCors, wrap(async (req, res) => {
  const visitorId = req.body?.visitor_id
  const text = String(req.body?.text || '').trim()
  if (!visitorId || !text) return res.status(400).json({ error: 'visitor_id and text required' })
  const biz = await one(`select id from sts_businesses where widget_key=$1`, [req.params.key])
  if (!biz) return res.status(404).json({ error: 'Not found' })
  const result = await handleInboundChat({
    businessId: biz.id,
    channel: 'web',
    customerHandle: visitorId,
    customerName: req.body?.name || 'Website visitor',
    text,
    messageId: null,
    sendOutbound: null,
  })
  res.json({ reply: result.reply })
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

  await ensureUserWorkspace(user)
  await pool.query('update sts_users set last_login = now() where id = $1', [user.id])
  res.json({
    token: signToken(user),
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      business_id: user.business_id, business_name: user.business_name, plan: user.plan_code,
      email_verified: Boolean(user.email_verified_at),
    },
  })
}))

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  res.json({
    id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role,
    business_id: req.user.business_id, business_name: req.user.business_name, plan: req.user.plan_code,
    email_verified: Boolean(req.user.email_verified_at),
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

/** Store inbound message + AI reply with long-term customer memory (all chat channels). */
async function handleInboundChat({ businessId, channel, customerHandle, customerName, text, messageId, sendOutbound, previewText, inboundBody, beginPresence }) {
  const bizRow = await one(`select name from sts_businesses where id=$1`, [businessId])
  const memKey = customerKey(customerHandle, channel)
  const sinceLabel = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const preview = previewText || text
  const storedBody = inboundBody || text

  const conv = await one(
    `insert into sts_conversations (business_id, channel, customer_handle, customer_name, customer_since, last_message_preview, last_message_at, unread)
     values ($1,$2,$3,$4,$5,$6, now(), 1)
     on conflict (business_id, channel, customer_handle) do update set
       customer_name = coalesce(excluded.customer_name, sts_conversations.customer_name),
       customer_since = coalesce(sts_conversations.customer_since, excluded.customer_since),
       last_message_preview = excluded.last_message_preview, last_message_at = now(),
       unread = sts_conversations.unread + 1
     returning id, mode`,
    [businessId, channel === 'website' ? 'web' : channel, customerHandle, customerName, sinceLabel, preview],
  )

  if (messageId) {
    const ins = await one(
      `insert into sts_messages (conversation_id, business_id, direction, sender, body, provider_msg_id)
       values ($1,$2,'in','customer',$3,$4)
       on conflict (provider_msg_id) do nothing returning id`,
      [conv.id, businessId, storedBody, messageId],
    )
    if (!ins) {
      console.log(`[${channel}] duplicate inbound skipped:`, messageId)
      return { conversationId: conv.id, reply: null, duplicate: true }
    }
  } else {
    await pool.query(
      `insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'in','customer',$3)`,
      [conv.id, businessId, storedBody],
    )
  }

  await touchCustomerMemory(businessId, memKey, { customerName, channel })
  const memory = await loadCustomerMemory(businessId, memKey)

  await pool.query(
    `insert into sts_leads (business_id, name, contact, channel, status)
     select $1,$2,$3,$4,'new'
     where not exists (select 1 from sts_leads where business_id=$1 and contact=$3 and channel=$4)`,
    [businessId, customerName || customerHandle, customerHandle, channel === 'website' ? 'web' : channel],
  )

  const botCh = channel === 'website' ? 'web' : channel
  const bot = await one(`select auto_reply from sts_bot_settings where business_id=$1 and channel=$2`, [businessId, botCh])
  const autoReply = bot ? bot.auto_reply : true
  if (!autoReply || conv.mode === 'human') {
    return { conversationId: conv.id, reply: null }
  }

  const history = await loadConversationHistory(conv.id)
  let endPresence = () => Promise.resolve()
  if (beginPresence) endPresence = beginPresence()
  let reply
  try {
    reply = await generateReply({
      businessId,
      businessName: bizRow?.name,
      channel: channel === 'web' ? 'website' : channel,
      userText: text,
      history,
      memory,
      customerName: customerName || memory?.customer_name,
    })
  } catch (e) {
    await endPresence()
    throw e
  }
  if (!reply) {
    await endPresence()
    return { conversationId: conv.id, reply: null }
  }

  if (sendOutbound) {
    try { await sendOutbound(reply) } catch (e) {
      console.error(`[${channel}] AI send failed:`, e.message)
    } finally {
      await endPresence()
    }
  } else {
    await endPresence()
  }

  const outboundPreview = previewText && previewText.startsWith('🎤') ? `🎤 ${reply.slice(0, 120)}` : reply
  await pool.query(
    `insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'out','ai',$3)`,
    [conv.id, businessId, reply],
  )
  await pool.query(`update sts_conversations set last_message_preview=$2, last_message_at=now() where id=$1`, [conv.id, outboundPreview])

  refreshCustomerMemory(businessId, memKey, conv.id).catch(() => {})
  return { conversationId: conv.id, reply }
}

/** WhatsApp wrapper — same memory engine as web/instagram. Voice notes reply with voice (QR only). */
async function handleInboundWhatsApp(businessId, creds, msg) {
  const provider = resolveWhatsAppProvider(creds)
  const replyAsVoice = !!(msg.isVoice && provider === 'qr')
  const dest = msg.jid || msg.from
  await handleInboundChat({
    businessId,
    channel: 'whatsapp',
    customerHandle: msg.from,
    customerName: msg.name,
    text: msg.text,
    previewText: msg.previewText,
    inboundBody: msg.inboundBody,
    messageId: msg.messageId,
    beginPresence: provider === 'qr'
      ? () => beginQrPresence(businessId, dest, replyAsVoice ? 'recording' : 'composing')
      : undefined,
    sendOutbound: async (reply) => {
      try {
        await sendWhatsAppByProvider({
          provider,
          businessId,
          to: msg.jid || msg.from,
          text: reply,
          creds,
          asVoice: replyAsVoice,
        })
      } catch (e) {
        if (!replyAsVoice) throw e
        console.error('[whatsapp] voice reply failed, falling back to text:', e.message)
        await sendWhatsAppByProvider({
          provider,
          businessId,
          to: msg.jid || msg.from,
          text: reply,
          creds,
          asVoice: false,
        })
      }
    },
  })
}

setQrInboundHandler(async (businessId, msg) => {
  const creds = (await getChannelCreds(businessId, 'whatsapp')) || {}
  await handleInboundWhatsApp(businessId, { ...creds, provider: 'qr' }, msg)
})

/* ================================================================
 * INSTAGRAM — Meta Messaging API webhook + AI agent (same memory engine)
 * ============================================================== */

async function isValidInstagramVerifyToken(token) {
  if (!token) return false
  if (process.env.INSTAGRAM_VERIFY_TOKEN && token === process.env.INSTAGRAM_VERIFY_TOKEN) return true
  if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) return true
  const rows = await many(`select secrets_enc from sts_channel_configs where channel='instagram'`)
  for (const r of rows) {
    try { if (decryptJSON(r.secrets_enc)?.verify_token === token) return true } catch { /* skip */ }
  }
  return false
}

app.get('/api/webhooks/instagram', wrap(async (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && (await isValidInstagramVerifyToken(token))) {
    return res.status(200).send(String(challenge))
  }
  res.sendStatus(403)
}))

app.post('/api/webhooks/instagram', wrap(async (req, res) => {
  const inbound = parseInboundInstagramMessages(req.body)
  if (!inbound.length) return res.sendStatus(200)

  const byIg = {}
  for (const m of inbound) (byIg[m.igAccountId] ||= []).push(m)

  for (const [igId, msgs] of Object.entries(byIg)) {
    const cfg = await one(`select business_id, secrets_enc from sts_channel_configs where channel='instagram' and ext_ref=$1`, [igId])
    if (!cfg) continue
    let creds
    try { creds = decryptJSON(cfg.secrets_enc) } catch { continue }
    if (creds.app_secret && !verifyMetaSignature(creds.app_secret, req.rawBody, req.get('x-hub-signature-256'))) {
      console.warn('Instagram signature mismatch for ig_account_id', igId)
      continue
    }
    for (const m of msgs) {
      await handleInboundChat({
        businessId: cfg.business_id,
        channel: 'instagram',
        customerHandle: m.from,
        customerName: m.from,
        text: m.text,
        messageId: m.messageId,
        sendOutbound: (reply) => sendInstagramText(creds, m.from, reply),
      }).catch((e) => console.error('IG handle error:', e.message))
    }
  }
  res.sendStatus(200)
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
  // Notify platform support inbox (best-effort)
  const support = await one(`select value from sts_settings where key='support_email'`)
  const primaryAdmin = await one(`select email from sts_users where role='admin' order by created_at asc limit 1`)
  const notifyTo = support?.value || primaryAdmin?.email
  sendAccessRequestNotify({
    to: notifyTo,
    businessName: business_name,
    contactName: contact_name,
    email,
    message,
  }).catch(() => {})
  res.status(201).json({ ok: true, id: row.id })
}))

/** Confirm email via token from verification link. */
app.get('/api/auth/verify-email', wrap(async (req, res) => {
  const token = String(req.query.token || '').trim()
  if (!token) return res.status(400).json({ error: 'token required' })
  const user = await one(
    `select id from sts_users
      where email_verify_token=$1 and email_verify_expires > now()`,
    [token],
  )
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' })
  await pool.query(
    `update sts_users
        set email_verified_at=now(), email_verify_token=null, email_verify_expires=null
      where id=$1`,
    [user.id],
  )
  res.json({ ok: true })
}))

/** Resend verification email for the logged-in user. */
app.post('/api/auth/send-verification', auth, wrap(async (req, res) => {
  if (req.user.email_verified_at) return res.json({ ok: true, already: true })
  if (!mailConfigured()) return res.status(503).json({ error: 'Email sending is not configured on the server' })
  const token = crypto.randomBytes(24).toString('hex')
  await pool.query(
    `update sts_users set email_verify_token=$2, email_verify_expires=now() + interval '48 hours' where id=$1`,
    [req.user.id, token],
  )
  const result = await sendVerificationEmail({ to: req.user.email, name: req.user.name, token })
  if (result?.error) return res.status(502).json({ error: result.error })
  res.json({ ok: true })
}))

app.get('/api/admin/mail-status', auth, adminOnly, wrap(async (_req, res) => {
  res.json({ configured: mailConfigured(), from: process.env.MAIL_FROM || process.env.RESEND_FROM || null })
}))

app.get('/api/plans', wrap(async (_req, res) => {
  const rows = await many('select * from sts_plans where active order by sort')
  res.json(rows)
}))

/** Public site branding — landing page theme, copy overrides, pricing. */
app.get('/api/site-config', wrap(async (_req, res) => {
  const rows = await many(`select key, value from sts_settings where key in ('site_config','support_whatsapp','support_email','currency')`)
  const map = {}
  rows.forEach((r) => (map[r.key] = r.value))
  const site = parseSiteConfig(map.site_config)
  const whatsapp = map.support_whatsapp || DEFAULT_WHATSAPP
  const email = map.support_email || DEFAULT_EMAIL
  res.json({
    theme: site.theme,
    copy: site.copy,
    pricing: site.pricing,
    contact: {
      whatsapp,
      email,
      currency: map.currency || 'KWD',
      whatsapp_url: waLink(whatsapp),
    },
  })
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
    `select to_char(d, 'Dy') d, n from (
       select date_trunc('day', created_at) d, count(*)::int n
         from sts_messages where business_id=$1 and created_at > now() - interval '7 days'
        group by 1 order by 1
     ) sub`,
    [b],
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
  const conv = await one(`select id, business_id, channel, customer_handle from sts_conversations where id=$1`, [req.params.id])
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' })
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'Empty message' })
  await tx(async (c) => {
    await c.query(`insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'out',$3,$4)`,
      [conv.id, conv.business_id, req.body?.sender || 'human', body])
    await c.query(`update sts_conversations set last_message_preview=$2, last_message_at=now() where id=$1`, [conv.id, body])
  })
  if (conv.channel === 'whatsapp') {
    const creds = await getChannelCreds(conv.business_id, 'whatsapp')
    try {
      await sendWhatsAppByProvider({
        provider: resolveWhatsAppProvider(creds),
        businessId: conv.business_id,
        to: conv.customer_handle,
        text: body,
        creds,
      })
    } catch (e) {
      console.error('[WhatsApp] human send failed:', e.message)
      return res.status(502).json({ error: 'Message saved but WhatsApp send failed', detail: e.message })
    }
  } else if (conv.channel === 'instagram') {
    const creds = await getChannelCreds(conv.business_id, 'instagram')
    try {
      await sendInstagramText(creds, conv.customer_handle, body)
    } catch (e) {
      console.error('[Instagram] human send failed:', e.message)
      return res.status(502).json({ error: 'Message saved but Instagram send failed', detail: e.message })
    }
  }
  res.json({ ok: true })
}))

app.get('/api/conversations/:id/memory', auth, wrap(async (req, res) => {
  const conv = await one(`select id, business_id, channel, customer_handle, customer_name from sts_conversations where id=$1`, [req.params.id])
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' })
  const key = customerKey(conv.customer_handle, conv.channel)
  const memory = key ? await loadCustomerMemory(conv.business_id, key) : null
  res.json({
    summary: memory?.summary || null,
    facts: memory?.facts || {},
    message_count: memory?.message_count || 0,
    first_seen: memory?.first_seen || null,
    last_seen: memory?.last_seen || null,
    last_channel: memory?.last_channel || null,
    customer_name: memory?.customer_name || conv.customer_name,
  })
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

const BOT_DEFAULTS = {
  auto_reply: true, human_handoff: true, after_hours_only: false,
  greeting: '', tone: 'friendly', language: 'auto',
  widget_color: '#0FBE8F', widget_position: 'bottom_right', rules: '',
  tts_voice: 'alloy',
}
const toBotChannel = (c) => (c === 'website' ? 'web' : c)

async function upsertBotSettings(businessId, channel, b = {}) {
  if (!businessId) throw Object.assign(new Error('No business on this account'), { status: 400 })
  const ch = toBotChannel(channel)
  const { normalizeTtsVoice } = await import('./lib/ttsVoices.js')
  const ttsVoice = normalizeTtsVoice(b.tts_voice)
  const args = [businessId, ch, b.auto_reply ?? true, b.human_handoff ?? true, b.after_hours_only ?? false,
    b.greeting || '', b.tone || 'friendly', b.language || 'auto', b.widget_color || '#0FBE8F',
    b.widget_position || 'bottom_right', b.rules || '', ttsVoice]
  let row
  try {
    row = await one(
      `insert into sts_bot_settings (business_id, channel, auto_reply, human_handoff, after_hours_only, greeting, tone, language, widget_color, widget_position, rules, tts_voice, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       on conflict (business_id, channel) do update set
         auto_reply=excluded.auto_reply, human_handoff=excluded.human_handoff, after_hours_only=excluded.after_hours_only,
         greeting=excluded.greeting, tone=excluded.tone, language=excluded.language,
         widget_color=excluded.widget_color, widget_position=excluded.widget_position, rules=excluded.rules,
         tts_voice=excluded.tts_voice, updated_at=now()
       returning *`,
      args,
    )
  } catch (e) {
    if (e.code !== '42703') throw e
    // Older DB without tts_voice / rules — degrade gracefully
    row = await one(
      `insert into sts_bot_settings (business_id, channel, auto_reply, human_handoff, after_hours_only, greeting, tone, language, widget_color, widget_position, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
       on conflict (business_id, channel) do update set
         auto_reply=excluded.auto_reply, human_handoff=excluded.human_handoff, after_hours_only=excluded.after_hours_only,
         greeting=excluded.greeting, tone=excluded.tone, language=excluded.language,
         widget_color=excluded.widget_color, widget_position=excluded.widget_position, updated_at=now()
       returning *`,
      args.slice(0, 10),
    )
  }
  await persistAgentRulesKnowledge(businessId, channel, b).catch((err) => console.error('persist rules kb:', err.message))
  return row
}

const RULES_META = '__agent_rules__'

async function persistAgentRulesKnowledge(businessId, channel, b = {}) {
  const kbCh = channel === 'web' ? 'website' : kbChannel(channel)
  const content = [
    b.greeting && `Greeting: ${b.greeting}`,
    b.tone && `Tone: ${b.tone}`,
    b.language && `Language: ${b.language}`,
    b.rules && `Rules:\n${b.rules}`,
  ].filter(Boolean).join('\n')
  if (!content) return
  const title = kbCh === 'all' ? 'Shared agent rules' : `${kbCh} agent rules`
  const existing = await one(
    `select id from sts_knowledge_sources where business_id=$1 and meta=$2 and channel=$3`,
    [businessId, RULES_META, kbCh],
  )
  if (existing) {
    await one(`update sts_knowledge_sources set title=$2, content=$3, status='trained' where id=$1 returning id`, [existing.id, title, content])
  } else {
    await one(
      `insert into sts_knowledge_sources (business_id, type, title, content, meta, channel, status)
       values ($1,'qa',$2,$3,$4,$5,'trained') returning id`,
      [businessId, title, content, RULES_META, kbCh],
    )
  }
}

// Bot settings
app.get('/api/bots/:channel', auth, wrap(async (req, res) => {
  const ch = toBotChannel(req.params.channel)
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel=$2`, [biz(req), ch])
  res.json(row || { channel: ch, ...BOT_DEFAULTS })
}))

app.put('/api/bots/:channel', auth, wrap(async (req, res) => {
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  res.json(await upsertBotSettings(biz(req), req.params.channel, req.body || {}))
}))

app.get('/api/tts/voices', auth, wrap(async (_req, res) => {
  const { listTtsVoices } = await import('./lib/ttsVoices.js')
  res.json(listTtsVoices())
}))

/** Preview a TTS voice as MP3 (hear before you choose). */
app.post('/api/tts/preview', auth, wrap(async (req, res) => {
  const { previewTtsVoice } = await import('./lib/whatsappVoice.js')
  const { voice, text } = req.body || {}
  try {
    const { buffer, mimetype } = await previewTtsVoice(voice, text)
    res.setHeader('Content-Type', mimetype)
    res.setHeader('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (e) {
    res.status(502).json({ error: e.message || 'Preview failed' })
  }
}))

app.post('/api/admin/tts/preview', auth, adminOnly, wrap(async (req, res) => {
  const { previewTtsVoice } = await import('./lib/whatsappVoice.js')
  const { voice, text } = req.body || {}
  try {
    const { buffer, mimetype } = await previewTtsVoice(voice, text)
    res.setHeader('Content-Type', mimetype)
    res.setHeader('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (e) {
    res.status(502).json({ error: e.message || 'Preview failed' })
  }
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
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  const { type, title, content, source_url, meta, channel } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  let body = content || null
  let status = 'trained'
  let metaOut = meta || null
  if ((type === 'url' || source_url) && source_url && !body) {
    try {
      body = await fetchUrlText(source_url)
      metaOut = metaOut || `Imported from URL · ${body.length} chars`
    } catch (e) {
      status = 'error'
      metaOut = e.message || 'URL import failed'
      body = null
    }
  }
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning ${KB_COLS}`,
    [biz(req), type || 'qa', title, body, source_url || null, metaOut, kbChannel(channel), status],
  )
  res.status(201).json(row)
}))

const kbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isSupportedTrainingFile(file.originalname, file.mimetype)) return cb(null, true)
    cb(new Error('Unsupported file type. Use PDF, DOCX, XLSX, or TXT.'))
  },
})

async function saveUploadedKnowledge(businessId, file, { title, channel } = {}) {
  const text = await extractDocumentText(file.buffer, file.originalname, file.mimetype)
  const name = String(title || file.originalname || 'Uploaded document').slice(0, 200)
  const sizeKb = Math.max(1, Math.round(file.size / 1024))
  return one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,'file',$2,$3,null,$4,$5,'trained') returning ${KB_COLS}`,
    [businessId, name, text, `${file.originalname} · ${sizeKb} KB`, kbChannel(channel)],
  )
}

function handleKbUpload(req, res, next) {
  kbUpload.single('file')(req, res, (err) => {
    if (!err) return next()
    const tooBig = err.code === 'LIMIT_FILE_SIZE'
    res.status(400).json({ error: tooBig ? 'File too large (max 10 MB)' : (err.message || 'Upload failed') })
  })
}

app.post('/api/knowledge/upload', auth, handleKbUpload, wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' })
  try { res.status(201).json(await saveUploadedKnowledge(biz(req), req.file, req.body || {})) }
  catch (e) { res.status(400).json({ error: e.message || 'Could not read file' }) }
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
app.get('/api/admin/summary', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  const [mrr, paid, free, overdue, payStats, msgWeek] = await Promise.all([
    one(`select coalesce(sum(mrr),0)::numeric mrr from sts_businesses where id=any($1::uuid[]) and status='paid'`, [ids]),
    one(`select count(*)::int n from sts_businesses where id=any($1::uuid[]) and status='paid'`, [ids]),
    one(`select count(*)::int n from sts_businesses where id=any($1::uuid[]) and status in ('free','suspended')`, [ids]),
    one(`select count(*)::int n, coalesce(sum(amount_kwd),0)::numeric amt from sts_invoices where business_id=any($1::uuid[]) and status='overdue'`, [ids]),
    one(
      `select coalesce(sum(amount_kwd) filter (where status='paid' and created_at >= date_trunc('month', now())),0)::numeric collected_month,
              coalesce(sum(amount_kwd) filter (where status='pending'),0)::numeric pending,
              coalesce(sum(amount_kwd) filter (where status='failed'),0)::numeric failed
         from sts_payments where business_id=any($1::uuid[])`,
      [ids],
    ),
    one(
      `select count(*)::int n from sts_messages where business_id=any($1::uuid[]) and created_at > now() - interval '7 days'`,
      [ids],
    ),
  ])
  res.json({
    mrr: Number(mrr.mrr),
    paid: paid.n,
    free: free.n,
    overdue: overdue.n,
    overdue_amount: Number(overdue.amt),
    payment_stats: {
      collected_month: Number(payStats.collected_month),
      pending: Number(payStats.pending),
      failed: Number(payStats.failed),
    },
    messages_7d: msgWeek.n,
  })
}))

app.get('/api/admin/requests', auth, adminOnly, wrap(async (req, res) => {
  const rows = await many(`select * from sts_access_requests where status='new' order by created_at desc`)
  res.json(rows.map((r) => ({
    id: r.id, business_name: r.business_name, contact_name: r.contact_name, email: r.email,
    whatsapp: r.whatsapp, interested_plan: r.interested_plan, message: r.message, created: relTime(r.created_at) + ' ago',
  })))
}))

app.post('/api/admin/requests/:id/approve', auth, adminOnly, wrap(async (req, res) => {
  const reqRow = await one(`select * from sts_access_requests where id=$1`, [req.params.id])
  if (!reqRow) return res.status(404).json({ error: 'Not found' })
  if (await emailTaken(reqRow.email)) return res.status(409).json({ error: 'That email already belongs to another account' })
  const plainPw = 'Sts@2026!'
  const created = await tx(async (c) => {
    const b = (await c.query(
      `insert into sts_businesses (name, whatsapp, plan_code, status, owner_user_id) values ($1,$2,'free','free',$3) returning id`,
      [reqRow.business_name, reqRow.whatsapp, req.user.id],
    )).rows[0]
    const tempPw = await hashPassword(plainPw)
    const verifyToken = crypto.randomBytes(24).toString('hex')
    await c.query(
      `insert into sts_users (email, name, role, business_id, password_hash, password_enc,
                              email_verify_token, email_verify_expires)
       values ($1,$2,'client',$3,$4,$5,$6, now() + interval '48 hours')`,
      [reqRow.email.toLowerCase(), reqRow.contact_name || reqRow.business_name, b.id, tempPw, encryptJSON({ p: plainPw }), verifyToken],
    )
    await c.query(`update sts_access_requests set status='approved' where id=$1`, [req.params.id])
    return { b, verifyToken }
  })
  const email = reqRow.email.toLowerCase()
  // Credentials + verification (best-effort; never block approve)
  await sendAccountReadyEmail({
    to: email,
    name: reqRow.contact_name,
    password: plainPw,
    businessName: reqRow.business_name,
  }).catch(() => {})
  if (mailConfigured()) {
    await sendVerificationEmail({
      to: email,
      name: reqRow.contact_name,
      token: created.verifyToken,
    }).catch(() => {})
  }
  res.json({ ok: true, business_id: created.b.id, email, password: plainPw, email_sent: mailConfigured() })
}))

app.post('/api/admin/requests/:id/reject', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`update sts_access_requests set status='rejected' where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

const chToShort = (channels) => (channels || []) // ['wa','ig','vc'] already

app.get('/api/admin/businesses', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  const rows = await many(
    `select b.id, b.name, b.plan_code, b.mrr, b.status, b.channels,
            p.name as plan_name,
            (select email from sts_users u where u.business_id=b.id and u.role='client' order by created_at limit 1) as email
       from sts_businesses b left join sts_plans p on p.code=b.plan_code
      where b.id=any($1::uuid[])
      order by b.created_at`,
    [ids],
  )
  res.json(rows.map((r) => ({
    id: r.id, biz: r.name, email: r.email || '—', plan: r.plan_name || r.plan_code,
    mrr: Number(r.mrr), ch: chToShort(r.channels), status: r.status,
  })))
}))

app.post('/api/admin/businesses', auth, adminOnly, wrap(async (req, res) => {
  const { business_name, owner_name, email, whatsapp, plan_code, password } = req.body || {}
  if (!business_name || !email) return res.status(400).json({ error: 'business_name and email required' })
  if (await emailTaken(email)) return res.status(409).json({ error: 'That email already belongs to another account' })
  const plan = await one(`select * from sts_plans where code=$1`, [plan_code || 'free'])
  const status = plan_code === 'free' || !plan ? 'free' : 'paid'
  const pw = (password && String(password).trim()) || 'Sts@2026!'
  const verifyToken = crypto.randomBytes(24).toString('hex')
  const created = await tx(async (c) => {
    const b = (await c.query(
      `insert into sts_businesses (name, whatsapp, plan_code, status, mrr, channels, owner_user_id)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [business_name, whatsapp || null, plan?.code || 'free', status, plan?.price_kwd || 0, plan?.channels || ['wa'], req.user.id],
    )).rows[0]
    const hash = await hashPassword(pw)
    await c.query(
      `insert into sts_users (email, name, role, business_id, password_hash, password_enc,
                              email_verify_token, email_verify_expires)
       values ($1,$2,'client',$3,$4,$5,$6, now() + interval '48 hours')`,
      [email.toLowerCase(), owner_name || business_name, b.id, hash, encryptJSON({ p: pw }), verifyToken],
    )
    return b
  })
  await sendAccountReadyEmail({
    to: email.toLowerCase(),
    name: owner_name,
    password: pw,
    businessName: business_name,
  }).catch(() => {})
  if (mailConfigured()) {
    await sendVerificationEmail({
      to: email.toLowerCase(),
      name: owner_name,
      token: verifyToken,
    }).catch(() => {})
  }
  res.status(201).json({ ok: true, id: created.id, email: email.toLowerCase(), password: pw, email_sent: mailConfigured() })
}))

app.patch('/api/admin/businesses/:id', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
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
app.get('/api/admin/businesses/:id/credential', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
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
app.post('/api/admin/businesses/:id/reset-password', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
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
app.delete('/api/admin/businesses/:id', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  if (String(req.params.id) === String(req.user.business_id)) {
    return res.status(400).json({ error: 'Cannot delete your own workspace' })
  }
  await pool.query(`delete from sts_businesses where id=$1`, [req.params.id])
  res.json({ ok: true })
}))

/** Wipe all demo / customer tenants (keeps admin workspaces). Platform admin only. */
app.delete('/api/admin/businesses', auth, adminOnly, wrap(async (req, res) => {
  if (!isPlatformAdmin(req.user)) {
    return res.status(403).json({ error: 'Platform admin only' })
  }
  const ids = await allCustomerBusinessIds()
  let deleted = 0
  if (ids.length) {
    const r = await pool.query(`delete from sts_businesses where id=any($1::uuid[])`, [ids])
    deleted = r.rowCount || ids.length
  }
  // Clear leftover seed access requests
  await pool.query(`delete from sts_access_requests where status='new'`)
  res.json({ ok: true, deleted })
}))

app.get('/api/admin/payments', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  let rows = await many(
    `select p.reference, p.method, p.amount_kwd, p.status, p.created_at, b.name as biz
       from sts_payments p left join sts_businesses b on b.id=p.business_id
      where p.business_id=any($1::uuid[])
      order by p.created_at desc`,
    [ids],
  )
  if (!rows.length) {
    rows = await many(
      `select b.name as biz, b.mrr as amount_kwd, b.updated_at as created_at
         from sts_businesses b
        where b.id=any($1::uuid[]) and b.status='paid' and coalesce(b.mrr,0) > 0
        order by b.name`,
      [ids],
    ).then((biz) => biz.map((b, i) => ({
      reference: `MRR-${i + 1}`,
      method: 'subscription',
      amount_kwd: b.amount_kwd,
      status: 'paid',
      created_at: b.created_at,
      biz: b.biz,
    })))
  }
  res.json(rows.map((r) => ({
    ref: r.reference, biz: r.biz, meth: methodLabel(r.method), amt: kwd(r.amount_kwd), date: dmy(r.created_at), st: r.status || 'paid',
  })))
}))

app.post('/api/admin/payments', auth, adminOnly, wrap(async (req, res) => {
  const { business_id, reference, method, amount, status } = req.body || {}
  if (!(await adminOwns(req.user, business_id))) return res.status(404).json({ error: 'Not found' })
  const row = await one(
    `insert into sts_payments (business_id, reference, method, amount_kwd, status) values ($1,$2,$3,$4,$5) returning id`,
    [business_id, reference, method || 'knet', amount || 0, status || 'paid'],
  )
  res.status(201).json({ ok: true, id: row.id })
}))

app.get('/api/admin/invoices', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  let rows = await many(
    `select i.id, i.number, i.description, i.amount_kwd, i.status, i.issued_at, coalesce(i.due_at,i.issued_at) d, b.name as biz
       from sts_invoices i left join sts_businesses b on b.id=i.business_id
      where i.business_id=any($1::uuid[])
      order by coalesce(i.due_at,i.issued_at) desc`,
    [ids],
  )
  if (!rows.length) {
    rows = await many(
      `select b.id, b.name as biz, b.mrr as amount_kwd, b.updated_at as d
         from sts_businesses b
        where b.id=any($1::uuid[]) and b.status='paid' and coalesce(b.mrr,0) > 0
        order by b.name`,
      [ids],
    ).then((biz) => biz.map((b, i) => ({
      id: b.id,
      number: `INV-${String(i + 1).padStart(4, '0')}`,
      description: 'Monthly subscription',
      amount_kwd: b.amount_kwd,
      status: 'unpaid',
      d: b.d,
      biz: b.biz,
    })))
  }
  res.json(rows.map((r) => ({
    id: r.id, no: r.number, biz: r.biz, desc: r.description, amt: kwd(r.amount_kwd), due: dmy(r.d), st: r.status || 'unpaid',
  })))
}))

app.get('/api/admin/invoices/:key', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  const key = req.params.key
  const row = await one(
    `select i.*, b.name as business_name, b.whatsapp, b.plan_code, p.name as plan_name, p.price_kwd as plan_price,
            (select email from sts_users u where u.business_id=b.id and u.role='client' order by u.created_at limit 1) as client_email,
            (select name from sts_users u where u.business_id=b.id and u.role='client' order by u.created_at limit 1) as client_name
       from sts_invoices i
       join sts_businesses b on b.id=i.business_id
       left join sts_plans p on p.code=b.plan_code
      where i.business_id=any($1::uuid[])
        and (i.id::text=$2 or i.number=$2)`,
    [ids, key],
  )
  if (!row) return res.status(404).json({ error: 'Invoice not found' })

  const settings = {}
  for (const r of await many(`select key, value from sts_settings where key in ('support_whatsapp','support_email','currency')`)) {
    settings[r.key] = r.value
  }
  const payment = await one(
    `select reference, method, status, created_at from sts_payments where invoice_id=$1 order by created_at desc limit 1`,
    [row.id],
  )

  res.json({
    id: row.id,
    number: row.number,
    description: row.description || '',
    amount: Number(row.amount_kwd),
    amount_fmt: kwd(row.amount_kwd),
    status: row.status,
    issued_at: dmy(row.issued_at),
    due_at: dmy(row.due_at),
    business: {
      name: row.business_name,
      email: row.client_email || '',
      contact: row.client_name || row.business_name,
      whatsapp: row.whatsapp || '',
      plan: row.plan_name || row.plan_code || '',
    },
    platform: {
      name: 'STS',
      tagline: 'AI Customer Service Platform',
      email: settings.support_email || 'support@stsq8.com',
      whatsapp: settings.support_whatsapp || '',
      currency: settings.currency || 'KWD',
    },
    payment: payment ? {
      reference: payment.reference,
      method: methodLabel(payment.method),
      status: payment.status,
      date: dmy(payment.created_at),
    } : null,
  })
}))

app.post('/api/admin/invoices', auth, adminOnly, wrap(async (req, res) => {
  const { business_id, number, description, amount, due_at } = req.body || {}
  if (!(await adminOwns(req.user, business_id))) return res.status(404).json({ error: 'Not found' })
  const row = await one(
    `insert into sts_invoices (business_id, number, description, amount_kwd, status, due_at)
     values ($1,$2,$3,$4,'unpaid',$5) returning id`,
    [business_id, number, description || '', amount || 0, due_at || null],
  )
  res.status(201).json({ ok: true, id: row.id })
}))

app.get('/api/admin/plans', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  const rows = await many(
    `select p.*, (select count(*)::int from sts_businesses b where b.plan_code=p.code and b.id=any($1::uuid[])) subs
       from sts_plans p order by p.sort`,
    [ids],
  )
  res.json(rows.map((p) => ({
    name: p.name, cat: catLabel(p.category), quota: p.quota_label, price: Number(p.price_kwd).toFixed(2), subs: p.subs,
  })))
}))

app.get('/api/admin/analytics', auth, adminOnly, wrap(async (req, res) => {
  const ids = idList(await adminReportBusinessIds(req.user))
  const [byPlan, top, daily, revenue, growth, usage, totals, arpuRows] = await Promise.all([
    many(`select p.category, coalesce(sum(b.mrr),0)::numeric mrr from sts_businesses b join sts_plans p on p.code=b.plan_code where b.id=any($1::uuid[]) group by p.category`, [ids]),
    many(
      `select b.name, b.mrr,
              (select count(*)::int from sts_messages m where m.business_id=b.id) msgs,
              coalesce((select sum(duration_sec)/60 from sts_call_logs c where c.business_id=b.id),0)::int voice_min
         from sts_businesses b where b.id=any($1::uuid[])
         order by (select count(*) from sts_messages m where m.business_id=b.id) desc limit 6`,
      [ids],
    ),
    many(`select to_char(date_trunc('day', created_at),'YYYY-MM-DD') day_key,
                 to_char(date_trunc('day', created_at),'Mon DD') d,
                 count(*)::int n
            from sts_messages where business_id=any($1::uuid[]) and created_at > now() - interval '14 days'
            group by date_trunc('day', created_at) order by date_trunc('day', created_at)`, [ids]),
    many(`select to_char(date_trunc('month', created_at),'Mon') m, coalesce(sum(amount_kwd),0)::numeric total
            from sts_payments where business_id=any($1::uuid[]) and status='paid' and created_at > now() - interval '6 months'
            group by date_trunc('month', created_at) order by date_trunc('month', created_at)`, [ids]),
    many(
      `with months as (
         select generate_series(
           date_trunc('month', now()) - interval '5 months',
           date_trunc('month', now()),
           interval '1 month'
         ) as month_start
       )
       select to_char(m.month_start, 'Mon') as m,
              (select count(*)::int from sts_businesses b
                where b.id = any($1::uuid[]) and b.status = 'paid'
                  and b.created_at < m.month_start + interval '1 month') as paid,
              (select count(*)::int from sts_businesses b
                where b.id = any($1::uuid[]) and b.status in ('free','suspended')
                  and b.created_at < m.month_start + interval '1 month') as free
         from months m
         order by m.month_start`,
      [ids],
    ),
    many(`select c.channel, count(m.*)::int n from sts_messages m join sts_conversations c on c.id=m.conversation_id where m.business_id=any($1::uuid[]) group by c.channel`, [ids]),
    one(`select coalesce(sum(mrr),0)::numeric mrr, count(*) filter (where status='paid')::int paid from sts_businesses where id=any($1::uuid[])`, [ids]),
    many(
      `with months as (
         select generate_series(
           date_trunc('month', now()) - interval '5 months',
           date_trunc('month', now()),
           interval '1 month'
         ) as month_start
       ),
       rev as (
         select date_trunc('month', p.created_at) as month_start,
                coalesce(sum(p.amount_kwd), 0)::numeric as total
           from sts_payments p
          where p.business_id = any($1::uuid[])
            and p.status = 'paid'
            and p.created_at >= date_trunc('month', now()) - interval '5 months'
          group by 1
       ),
       active as (
         select m.month_start, count(*)::int as paid_n
           from months m
           join sts_businesses b on b.id = any($1::uuid[])
            and b.status = 'paid'
            and b.created_at < m.month_start + interval '1 month'
          group by m.month_start
       )
       select to_char(m.month_start, 'Mon') as m,
              coalesce(r.total, 0)::numeric as revenue,
              coalesce(a.paid_n, 0)::int as paid_n
         from months m
         left join rev r on r.month_start = m.month_start
         left join active a on a.month_start = m.month_start
        order by m.month_start`,
      [ids],
    ),
  ])
  const mrrArpu = totals.paid ? Number(totals.mrr) / totals.paid : 0
  const revenueMonthly = fillRevenueMonthly(revenue, { currentMrr: Number(totals.mrr) })
  const growthMonthly = fillGrowthMonthly(growth)
  const messagesDaily = fillMessagesDaily(daily)
  const byPlanFilled = fillPlanCategories(byPlan)
  res.json({
    by_plan: byPlanFilled.map((r) => ({ category: r.category, mrr: Number(r.mrr) })),
    top_businesses: top.map((r) => ({ biz: r.name, mrr: kwd(r.mrr), msgs: r.msgs, voice_min: r.voice_min })),
    messages_daily: messagesDaily,
    revenue_monthly: revenueMonthly,
    growth_monthly: growthMonthly,
    usage_by_channel: usage.map((r) => ({ channel: r.channel, n: r.n })),
    arpu: totals.paid ? Number((Number(totals.mrr) / totals.paid).toFixed(1)) : 0,
    arpu_monthly: arpuRows.map((r) => {
      const revenueAmt = Number(r.revenue)
      const paidN = Number(r.paid_n)
      let arpu = 0
      if (revenueAmt > 0 && paidN > 0) arpu = revenueAmt / paidN
      else if (paidN > 0) arpu = mrrArpu
      return { m: r.m, arpu: Number(arpu.toFixed(2)) }
    }),
    totals: {
      messages: usage.reduce((s, r) => s + r.n, 0),
      businesses: ids.filter((id) => id !== '00000000-0000-0000-0000-000000000000').length,
    },
  })
}))

/* ---------- ADMIN: platform settings ---------- */
const SETTINGS_PLAIN = ['support_whatsapp', 'support_email', 'currency', 'site_config', 'vonage_api_key', 'vonage_application_id']

app.get('/api/admin/settings', auth, adminOnly, wrap(async (req, res) => {
  if (!isPlatformAdmin(req.user)) return res.json({ support_whatsapp: '', support_email: '', currency: 'KWD', site_config: parseSiteConfig(null) })
  const rows = await many(`select key, value from sts_settings`)
  const map = {}
  rows.forEach((r) => (map[r.key] = r.value))
  const vonage = await getPlatformVonage()
  res.json({
    support_whatsapp: map.support_whatsapp || DEFAULT_WHATSAPP,
    support_email: map.support_email || DEFAULT_EMAIL,
    currency: map.currency || 'KWD',
    site_config: parseSiteConfig(map.site_config),
    vonage: maskVonageForAdmin(vonage),
  })
}))

app.put('/api/admin/settings', auth, adminOnly, wrap(async (req, res) => {
  if (!isPlatformAdmin(req.user)) return res.status(403).json({ error: 'Platform settings are not available on this account' })
  const body = req.body || {}
  const upsert = async (key, value) =>
    pool.query(
      `insert into sts_settings (key, value, updated_at) values ($1,$2, now())
       on conflict (key) do update set value=excluded.value, updated_at=now()`,
      [key, value],
    )
  for (const k of SETTINGS_PLAIN) {
    if (body[k] === undefined) continue
    if (k === 'site_config') {
      const site = parseSiteConfig(body[k])
      await upsert('site_config', JSON.stringify(site))
      for (const plan of pricingPlanUpdates(site.pricing)) {
        await pool.query(
          `update sts_plans set name=$2, price_kwd=$3 where code=$1`,
          [plan.code, plan.name, plan.price_kwd],
        )
      }
      continue
    }
    await upsert(k, String(body[k]))
  }
  if (body.vonage) await upsertVonageSettings(body.vonage)
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
  if (channel === 'whatsapp') {
    if (incoming.provider === 'qr' || incoming.provider === 'cloud_api') merged.provider = incoming.provider
    else if (String(incoming.phone_number_id || '').trim() && String(incoming.access_token || '').trim()) {
      merged.provider = 'cloud_api'
    }
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
  if (channel === 'whatsapp') await stopQrSession(biz(req), { wipe: true }).catch(() => {})
  await pool.query(`delete from sts_channel_configs where business_id=$1 and channel=$2`, [biz(req), channel])
  res.json({ ok: true })
}))

/* ---------- WhatsApp QR (client — own business from JWT) ---------- */
async function qrStartFor(businessId, res, { restore = false, force = false } = {}) {
  if (!qrEnabled()) return res.status(503).json({ error: 'WhatsApp QR is disabled on this server' })
  if (!(await businessAllowsWhatsApp(businessId))) return res.status(403).json({ error: 'WhatsApp is not on this plan' })
  const status = await startQrSession(businessId, { restore, force })
  res.json({ success: true, ...status })
}
async function qrStatusFor(businessId, res) {
  res.json({ success: true, ...(await resolveQrStatus(businessId)) })
}

app.post('/api/me/whatsapp/qr/start', auth, wrap(async (req, res) => {
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  await qrStartFor(biz(req), res)
}))
app.get('/api/me/whatsapp/qr/status', auth, wrap(async (req, res) => {
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  await qrStatusFor(biz(req), res)
}))
app.post('/api/me/whatsapp/qr/logout', auth, wrap(async (req, res) => {
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  res.json({ success: true, ...(await logoutQrSession(biz(req))) })
}))
app.post('/api/me/whatsapp/qr/reconnect', auth, wrap(async (req, res) => {
  if (!biz(req)) return res.status(400).json({ error: 'No business on this account' })
  await stopQrSession(biz(req), { wipe: false }).catch(() => {})
  await qrStartFor(biz(req), res, { force: true })
}))

// ADMIN: manage any business's connections
app.get('/api/admin/connection-spec', auth, adminOnly, wrap(async (_req, res) => {
  res.json(CONNECTION_SPEC)
}))

app.get('/api/admin/businesses/:id/connections', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  res.json(await connectionsFor(req.params.id, true))
}))

app.put('/api/admin/businesses/:id/connections/:channel', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const { id, channel } = req.params
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' })
  const bizRow = await one(`select id from sts_businesses where id=$1`, [id])
  if (!bizRow) return res.status(404).json({ error: 'Business not found' })
  const connected = await saveChannelConnection(id, channel, req.body?.fields || {})
  res.json({ ok: true, connected })
}))

async function adminBizOr404(id, res, req) {
  const row = await one(`select id from sts_businesses where id=$1`, [id])
  if (!row) { res.status(404).json({ error: 'Business not found' }); return null }
  if (req && !(await adminOwns(req.user, row.id))) {
    res.status(404).json({ error: 'Business not found' })
    return null
  }
  return row.id
}

app.post('/api/admin/businesses/:id/whatsapp/qr/start', auth, adminOnly, wrap(async (req, res) => {
  const id = await adminBizOr404(req.params.id, res, req)
  if (!id) return
  await qrStartFor(id, res)
}))
app.get('/api/admin/businesses/:id/whatsapp/qr/status', auth, adminOnly, wrap(async (req, res) => {
  const id = await adminBizOr404(req.params.id, res, req)
  if (!id) return
  await qrStatusFor(id, res)
}))
app.post('/api/admin/businesses/:id/whatsapp/qr/logout', auth, adminOnly, wrap(async (req, res) => {
  const id = await adminBizOr404(req.params.id, res, req)
  if (!id) return
  res.json({ success: true, ...(await logoutQrSession(id)) })
}))
app.post('/api/admin/businesses/:id/whatsapp/qr/reconnect', auth, adminOnly, wrap(async (req, res) => {
  const id = await adminBizOr404(req.params.id, res, req)
  if (!id) return
  await stopQrSession(id, { wipe: false }).catch(() => {})
  await qrStartFor(id, res, { force: true })
}))

/* ---------- ADMIN: per-business knowledge base (chatbot training) ---------- */
app.get('/api/admin/businesses/:id/knowledge', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const params = [req.params.id]
  let sql = `select ${KB_COLS} from sts_knowledge_sources where business_id=$1`
  if (req.query.channel && KB_CHANNELS.includes(req.query.channel)) { params.push(req.query.channel); sql += ` and channel=$2` }
  sql += ` order by created_at desc`
  res.json(await many(sql, params))
}))

app.post('/api/admin/businesses/:id/knowledge', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const { type, title, content, source_url, meta, channel } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  let body = content || null
  let status = 'trained'
  let metaOut = meta || null
  if ((type === 'url' || source_url) && source_url && !body) {
    try {
      body = await fetchUrlText(source_url)
      metaOut = metaOut || `Imported from URL · ${body.length} chars`
    } catch (e) {
      status = 'error'
      metaOut = e.message || 'URL import failed'
      body = null
    }
  }
  const row = await one(
    `insert into sts_knowledge_sources (business_id, type, title, content, source_url, meta, channel, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning ${KB_COLS}`,
    [req.params.id, type || 'qa', title, body, source_url || null, metaOut, kbChannel(channel), status],
  )
  res.status(201).json(row)
}))

app.post('/api/admin/businesses/:id/knowledge/upload', auth, adminOnly, adminOwnsBiz, handleKbUpload, wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' })
  try { res.status(201).json(await saveUploadedKnowledge(req.params.id, req.file, req.body || {})) }
  catch (e) { res.status(400).json({ error: e.message || 'Could not read file' }) }
}))

app.get('/api/admin/businesses/:id/profile', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const row = await one(`select name, whatsapp, hours, language from sts_businesses where id=$1`, [req.params.id])
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json({ business_name: row.name, whatsapp: row.whatsapp || '', hours: row.hours || '', language: row.language || 'auto' })
}))

app.put('/api/admin/businesses/:id/profile', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const { business_name, whatsapp, hours, language } = req.body || {}
  const sets = [], params = [req.params.id]
  const add = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`) } }
  add('name', business_name); add('whatsapp', whatsapp); add('hours', hours); add('language', language)
  if (sets.length) await pool.query(`update sts_businesses set ${sets.join(', ')} where id=$1`, params)
  res.json({ ok: true })
}))

app.get('/api/admin/businesses/:id/bots/:channel', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const ch = toBotChannel(req.params.channel)
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel=$2`, [req.params.id, ch])
  res.json(row || { channel: ch, ...BOT_DEFAULTS })
}))

app.put('/api/admin/businesses/:id/bots/:channel', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  res.json(await upsertBotSettings(req.params.id, req.params.channel, req.body || {}))
}))

app.put('/api/admin/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  const kb = await one(`select business_id from sts_knowledge_sources where id=$1`, [req.params.id])
  if (!kb || !(await adminOwns(req.user, kb.business_id))) return res.status(404).json({ error: 'Not found' })
  const row = await updateKb(req.params.id, req.body, kb.business_id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
}))

app.delete('/api/admin/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  const kb = await one(`select business_id from sts_knowledge_sources where id=$1`, [req.params.id])
  if (!kb || !(await adminOwns(req.user, kb.business_id))) return res.status(404).json({ error: 'Not found' })
  await pool.query(`delete from sts_knowledge_sources where id=$1 and business_id=$2`, [req.params.id, kb.business_id])
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
  const qr = await resolveQrStatus(businessId)
  return CHANNELS.map((channel) => {
    const row = byCh[channel]
    let creds = {}
    try { creds = row ? decryptJSON(row.secrets_enc) : {} } catch { creds = {} }
    let connected = row?.connected || false
    if (channel === 'whatsapp' && creds.provider === 'qr') {
      connected = qr.status === 'connected' || qr.status === 'reconnecting'
    }
    return {
      channel,
      connected,
      provider: channel === 'whatsapp' ? resolveWhatsAppProvider(creds) : undefined,
      display_number: creds.display_number || qr.display_number || '',
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
  return publicBaseUrl(req)
}
function voiceWsUrl(req) {
  return publicWsUrl(req, '/voice-stream')
}
function vonageWsUrl(req) {
  return publicWsUrl(req, '/vonage-stream')
}
function voiceWebhookInfo(base, req) {
  return {
    provider: 'vonage',
    incoming_url: `${base}/api/vonage/answer`,
    event_url: `${base}/api/vonage/event`,
    websocket_url: vonageWsUrl(req),
    twilio_incoming_url: `${base}/api/voice/incoming`,
    twilio_status_url: `${base}/api/voice/status`,
    note: 'Vonage Application → Answer URL = incoming_url, Event URL = event_url. WebSocket URI is used automatically in the NCCO.',
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
/** Find the business that owns a voice number (Vonage or Twilio). */
async function businessByVoiceNumber(num) {
  const target = digits(num)
  const rows = await many(`select business_id, secrets_enc from sts_channel_configs where channel='voice'`)
  for (const r of rows) {
    try {
      const c = decryptJSON(r.secrets_enc)
      const provider = c.telephony_provider || 'vonage'
      const n = provider === 'twilio' ? c.twilio_number : c.vonage_number
      if (digits(n) === target) return r.business_id
    } catch { /* skip */ }
  }
  return null
}
const businessByTwilioNumber = businessByVoiceNumber
/** Place an outbound call for a business (Vonage default, Twilio legacy). */
async function startOutboundCall(businessId, toRaw, base, req) {
  const to = digits(toRaw)
  if (!to || to.replace('+', '').length < 6) { const e = new Error('Enter a valid number with country code'); e.code = 400; throw e }
  const creds = await getChannelCreds(businessId, 'voice')
  const provider = creds?.telephony_provider || 'vonage'

  if (provider === 'twilio' && creds?.account_sid && creds?.auth_token && creds?.twilio_number) {
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

  const vonage = await getPlatformVonage()
  const from = creds?.vonage_number
  if (!vonage.configured) {
    const e = new Error('Vonage is not configured — add API credentials in Admin → Settings → Voice'); e.code = 400; throw e
  }
  if (!from) {
    const e = new Error('Connect your Vonage phone number first (Voice settings)'); e.code = 400; throw e
  }
  const answerUrl = `${base}/api/vonage/answer?businessId=${businessId}&direction=outbound&to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}`
  const eventUrl = `${base}/api/vonage/event`
  const call = await vonageCreateCall({
    apiKey: vonage.api_key,
    apiSecret: vonage.api_secret,
    from,
    to,
    answerUrl,
    eventUrl,
  })
  const uuid = call.uuid || call.conversation_uuid
  await pool.query(
    `insert into sts_call_logs (business_id, direction, from_number, to_number, caller, status, provider_call_sid, started_at)
     values ($1,'outbound',$2,$3,$3,'initiated',$4, now()) on conflict (provider_call_sid) do nothing`,
    [businessId, from, to, uuid],
  ).catch(() => {})
  return call
}
/** Each admin trains agents on their own workspace — never a shared platform row. */

/* ---------- Vonage Voice webhooks (no auth — signature optional) ---------- */
async function handleVonageAnswer(req, res) {
  const vonage = await getPlatformVonage()
  const payload = { ...req.query, ...(req.body || {}) }
  if (vonage.signature_secret && !verifyVonageSignature(payload, vonage.signature_secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  const from = payload.from
  const to = payload.to
  const uuid = payload.uuid
  const direction = payload.direction || req.query.direction || 'inbound'
  const businessId = req.query.businessId || payload.businessId || await businessByVoiceNumber(to)
  if (!businessId) {
    return res.json([{ action: 'talk', text: 'This number is not configured. Goodbye.' }, { action: 'hangup' }])
  }
  if (direction === 'inbound') {
    await pool.query(
      `insert into sts_call_logs (business_id, direction, from_number, to_number, caller, status, provider_call_sid, started_at)
       values ($1,'inbound',$2,$3,$2,'in_progress',$4, now()) on conflict (provider_call_sid) do nothing`,
      [businessId, from, to, uuid],
    ).catch(() => {})
  }
  const ws = vonageWsUrl(req)
  res.json(nccoConnectWebsocket(ws, {
    businessId: String(businessId),
    direction: String(direction),
    from: String(from || ''),
    to: String(to || ''),
    callUuid: String(uuid || ''),
  }))
}
app.get('/api/vonage/answer', wrap(handleVonageAnswer))
app.post('/api/vonage/answer', wrap(handleVonageAnswer))

app.post('/api/vonage/event', wrap(async (req, res) => {
  const vonage = await getPlatformVonage()
  const payload = { ...req.query, ...req.body }
  if (vonage.signature_secret && !verifyVonageSignature(payload, vonage.signature_secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  const status = payload.status || payload.event
  const uuid = payload.uuid || payload.conversation_uuid
  if (uuid && ['completed', 'failed', 'rejected', 'busy', 'timeout', 'cancelled'].includes(String(status))) {
    await pool.query(
      `update sts_call_logs set status=$2, ended_at=now() where provider_call_sid=$1`,
      [uuid, status === 'completed' ? 'completed' : 'failed'],
    ).catch(() => {})
  }
  res.status(200).send('')
}))

/* ---------- public Twilio webhooks (legacy) ---------- */
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
    const call = await startOutboundCall(biz(req), req.body?.to, voiceBase(req), req)
    res.json({ ok: true, call_sid: call.sid, status: call.status })
  } catch (e) { res.status(e.code || 500).json({ error: e.message }) }
}))
app.get('/api/me/calls/:id', auth, wrap(async (req, res) => {
  const row = await one(`select * from sts_call_logs where id=$1 and business_id=$2`, [req.params.id, biz(req)])
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(callShape(row, true))
}))
app.get('/api/me/voice/webhook-info', auth, wrap(async (req, res) => res.json(voiceWebhookInfo(voiceBase(req), req))))

/* ---------- ADMIN voice endpoints (STS Official business) ---------- */
app.get('/api/admin/voice/context', auth, adminOnly, wrap(async (req, res) => {
  res.json({ business_id: adminWorkspace(req), ...voiceWebhookInfo(voiceBase(req), req) })
}))
app.get('/api/admin/voice/connection', auth, adminOnly, wrap(async (req, res) => {
  const conns = await connectionsFor(adminWorkspace(req), true)
  res.json(conns.find((c) => c.channel === 'voice'))
}))
app.put('/api/admin/voice/connection', auth, adminOnly, wrap(async (req, res) => {
  const connected = await saveChannelConnection(adminWorkspace(req), 'voice', req.body?.fields || {})
  res.json({ ok: true, connected })
}))
app.delete('/api/admin/voice/connection', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_channel_configs where business_id=$1 and channel='voice'`, [adminWorkspace(req)])
  res.json({ ok: true })
}))
app.post('/api/admin/voice/dial', auth, adminOnly, wrap(async (req, res) => {
  try {
    const call = await startOutboundCall(adminWorkspace(req), req.body?.to, voiceBase(req), req)
    res.json({ ok: true, call_sid: call.sid, status: call.status })
  } catch (e) { res.status(e.code || 500).json({ error: e.message }) }
}))
app.get('/api/admin/voice/calls', auth, adminOnly, wrap(async (req, res) => res.json(await callList(adminWorkspace(req)))))
app.get('/api/admin/voice/calls/:id', auth, adminOnly, wrap(async (req, res) => {
  const row = await one(`select * from sts_call_logs where id=$1 and business_id=$2`, [req.params.id, adminWorkspace(req)])
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(callShape(row, true))
}))
// admin voice agent training (bot settings + knowledge) on the STS Official business
app.get('/api/admin/voice/bot', auth, adminOnly, wrap(async (req, res) => {
  const pid = adminWorkspace(req)
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel='voice'`, [pid])
  res.json(row || { channel: 'voice', greeting: '', tone: 'friendly', language: 'auto' })
}))
app.put('/api/admin/voice/bot', auth, adminOnly, wrap(async (req, res) => {
  res.json(await upsertBotSettings(adminWorkspace(req), 'voice', req.body || {}))
}))
app.get('/api/admin/voice/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const pid = adminWorkspace(req)
  // the voice agent uses its own 'voice' entries + anything shared as 'all'
  res.json(await many(`select ${KB_COLS} from sts_knowledge_sources where business_id=$1 and channel in ('all','voice') order by created_at desc`, [pid]))
}))
app.post('/api/admin/voice/knowledge/upload', auth, adminOnly, handleKbUpload, wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' })
  try {
    res.status(201).json(await saveUploadedKnowledge(adminWorkspace(req), req.file, {
      title: req.body?.title, channel: req.body?.channel === 'all' ? 'all' : 'voice',
    }))
  } catch (e) { res.status(400).json({ error: e.message || 'Could not read file' }) }
}))

app.post('/api/admin/voice/knowledge', auth, adminOnly, wrap(async (req, res) => {
  const pid = adminWorkspace(req)
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
  const row = await updateKb(req.params.id, body, adminWorkspace(req))
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
}))
app.delete('/api/admin/voice/knowledge/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query(`delete from sts_knowledge_sources where id=$1 and business_id=$2`, [req.params.id, adminWorkspace(req)])
  res.json({ ok: true })
}))

/* ---------- ADMIN: STS's OWN agents (any channel) on the STS Official business ---------- */
// The admin configures + trains STS's own WhatsApp / Instagram / Voice agents here,
// exactly like a customer does for their business.
app.get('/api/admin/agent/context', auth, adminOnly, wrap(async (req, res) => {
  res.json({
    business_id: adminWorkspace(req),
    spec: CONNECTION_SPEC,
    whatsapp: { callback_url: `${voiceBase(req)}/api/webhooks/whatsapp`, verify_token: process.env.WHATSAPP_VERIFY_TOKEN || '' },
    voice: voiceWebhookInfo(voiceBase(req), req),
  })
}))

app.get('/api/admin/agent/:channel/connection', auth, adminOnly, wrap(async (req, res) => {
  if (!CHANNELS.includes(req.params.channel)) return res.status(400).json({ error: 'Unknown channel' })
  const conns = await connectionsFor(adminWorkspace(req), true)
  res.json(conns.find((c) => c.channel === req.params.channel))
}))
app.put('/api/admin/agent/:channel/connection', auth, adminOnly, wrap(async (req, res) => {
  if (!CHANNELS.includes(req.params.channel)) return res.status(400).json({ error: 'Unknown channel' })
  const connected = await saveChannelConnection(adminWorkspace(req), req.params.channel, req.body?.fields || {})
  res.json({ ok: true, connected })
}))
app.delete('/api/admin/agent/:channel/connection', auth, adminOnly, wrap(async (req, res) => {
  if (!CHANNELS.includes(req.params.channel)) return res.status(400).json({ error: 'Unknown channel' })
  const pid = adminWorkspace(req)
  if (req.params.channel === 'whatsapp') await stopQrSession(pid, { wipe: true }).catch(() => {})
  await pool.query(`delete from sts_channel_configs where business_id=$1 and channel=$2`, [pid, req.params.channel])
  res.json({ ok: true })
}))

app.post('/api/admin/agent/whatsapp/qr/start', auth, adminOnly, wrap(async (req, res) => {
  await qrStartFor(adminWorkspace(req), res)
}))
app.get('/api/admin/agent/whatsapp/qr/status', auth, adminOnly, wrap(async (req, res) => {
  await qrStatusFor(adminWorkspace(req), res)
}))
app.post('/api/admin/agent/whatsapp/qr/logout', auth, adminOnly, wrap(async (req, res) => {
  res.json({ success: true, ...(await logoutQrSession(adminWorkspace(req))) })
}))
app.post('/api/admin/agent/whatsapp/qr/reconnect', auth, adminOnly, wrap(async (_req, res) => {
  const pid = adminWorkspace(req)
  await stopQrSession(pid, { wipe: false }).catch(() => {})
  await qrStartFor(pid, res, { force: true })
}))

app.get('/api/admin/agent/:channel/bot', auth, adminOnly, wrap(async (req, res) => {
  const row = await one(`select * from sts_bot_settings where business_id=$1 and channel=$2`, [adminWorkspace(req), req.params.channel])
  res.json(row || { channel: req.params.channel, auto_reply: true, human_handoff: true, after_hours_only: false, greeting: '', tone: 'friendly', language: 'auto' })
}))
app.put('/api/admin/agent/:channel/bot', auth, adminOnly, wrap(async (req, res) => {
  res.json(await upsertBotSettings(adminWorkspace(req), req.params.channel, req.body || {}))
}))

/* ---------- admin: conversation + call history (all owned businesses) ---------- */
function adminConversationShape(row) {
  return { ...conversationShape(row), business_id: row.business_id, business_name: row.business_name || '' }
}
function adminCallShape(row, full = false) {
  return { ...callShape(row, full), business_id: row.business_id, business_name: row.business_name || '' }
}
async function adminBizScope(user, businessId) {
  if (businessId) {
    const ok = await adminOwns(user, businessId)
    if (!ok) return null
    return [businessId]
  }
  return idList(await allowedBusinessIds(user))
}
async function adminGetConversation(req, convId) {
  const conv = await one(
    `select c.*, b.name as business_name from sts_conversations c join sts_businesses b on b.id=c.business_id where c.id=$1`,
    [convId],
  )
  if (!conv || !(await adminOwns(req.user, conv.business_id))) return null
  return conv
}
async function adminConversationList(user, { businessId, channel } = {}) {
  const ids = await adminBizScope(user, businessId)
  if (!ids) return []
  const params = [ids]
  let sql = `select c.*, b.name as business_name from sts_conversations c join sts_businesses b on b.id=c.business_id where c.business_id = any($1::uuid[])`
  if (channel) { params.push(channel); sql += ` and c.channel=$${params.length}` }
  sql += ` order by c.last_message_at desc nulls last limit 200`
  return (await many(sql, params)).map(adminConversationShape)
}
async function adminCallRows(user, { businessId } = {}) {
  const ids = await adminBizScope(user, businessId)
  if (!ids) return []
  return many(
    `select cl.*, b.name as business_name from sts_call_logs cl join sts_businesses b on b.id=cl.business_id
     where cl.business_id = any($1::uuid[]) order by cl.created_at desc limit 200`,
    [ids],
  )
}

app.get('/api/admin/activity/summary', auth, adminOnly, wrap(async (req, res) => {
  const ids = await adminBizScope(req.user, req.query.business_id || null)
  if (!ids) return res.json({ channels: {}, totals: { conversations: 0, unread: 0, calls: 0 }, businesses: [] })
  const [byCh, unread, calls, bizRows] = await Promise.all([
    many(
      `select channel, count(*)::int n from sts_conversations where business_id = any($1::uuid[]) group by channel`,
      [ids],
    ),
    one(`select coalesce(sum(unread),0)::int n from sts_conversations where business_id = any($1::uuid[])`, [ids]),
    one(`select count(*)::int n from sts_call_logs where business_id = any($1::uuid[])`, [ids]),
    many(
      `select b.id, b.name,
              (select count(*)::int from sts_conversations c where c.business_id=b.id) convs,
              (select count(*)::int from sts_call_logs cl where cl.business_id=b.id) calls
       from sts_businesses b where b.id = any($1::uuid[]) order by b.name`,
      [ids],
    ),
  ])
  const channels = {}
  for (const r of byCh) channels[r.channel] = { conversations: r.n, unread: 0 }
  const unreadByCh = await many(
    `select channel, coalesce(sum(unread),0)::int n from sts_conversations where business_id = any($1::uuid[]) group by channel`,
    [ids],
  )
  for (const r of unreadByCh) {
    if (!channels[r.channel]) channels[r.channel] = { conversations: 0, unread: 0 }
    channels[r.channel].unread = r.n
  }
  channels.voice = { ...(channels.voice || { conversations: 0, unread: 0 }), calls: calls.n }
  res.json({
    channels,
    totals: {
      conversations: byCh.reduce((s, r) => s + r.n, 0),
      unread: unread.n,
      calls: calls.n,
    },
    businesses: bizRows,
  })
}))

app.get('/api/admin/conversations', auth, adminOnly, wrap(async (req, res) => {
  const rows = await adminConversationList(req.user, { businessId: req.query.business_id, channel: req.query.channel })
  if (rows === null) return res.status(404).json({ error: 'Not found' })
  res.json(rows)
}))

app.get('/api/admin/conversations/:id/messages', auth, adminOnly, wrap(async (req, res) => {
  const conv = await adminGetConversation(req, req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  const rows = await many(`select direction, sender, body, created_at from sts_messages where conversation_id=$1 order by created_at`, [req.params.id])
  await pool.query(`update sts_conversations set unread=0 where id=$1`, [req.params.id])
  res.json(rows.map((r) => messageShape(r, conv.customer_name)))
}))

app.post('/api/admin/conversations/:id/messages', auth, adminOnly, wrap(async (req, res) => {
  const conv = await adminGetConversation(req, req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'Empty message' })
  await tx(async (c) => {
    await c.query(`insert into sts_messages (conversation_id, business_id, direction, sender, body) values ($1,$2,'out',$3,$4)`,
      [conv.id, conv.business_id, req.body?.sender || 'human', body])
    await c.query(`update sts_conversations set last_message_preview=$2, last_message_at=now() where id=$1`, [conv.id, body])
  })
  if (conv.channel === 'whatsapp') {
    const creds = await getChannelCreds(conv.business_id, 'whatsapp')
    try {
      await sendWhatsAppByProvider({
        provider: resolveWhatsAppProvider(creds),
        businessId: conv.business_id,
        to: conv.customer_handle,
        text: body,
        creds,
      })
    } catch (e) {
      console.error('[WhatsApp] admin human send failed:', e.message)
      return res.status(502).json({ error: 'Message saved but WhatsApp send failed', detail: e.message })
    }
  } else if (conv.channel === 'instagram') {
    const creds = await getChannelCreds(conv.business_id, 'instagram')
    try {
      await sendInstagramText(creds, conv.customer_handle, body)
    } catch (e) {
      console.error('[Instagram] admin human send failed:', e.message)
      return res.status(502).json({ error: 'Message saved but Instagram send failed', detail: e.message })
    }
  }
  res.json({ ok: true })
}))

app.get('/api/admin/conversations/:id/memory', auth, adminOnly, wrap(async (req, res) => {
  const conv = await adminGetConversation(req, req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  const key = customerKey(conv.customer_handle, conv.channel)
  const memory = key ? await loadCustomerMemory(conv.business_id, key) : null
  res.json({
    summary: memory?.summary || null,
    facts: memory?.facts || {},
    message_count: memory?.message_count || 0,
    first_seen: memory?.first_seen || null,
    last_seen: memory?.last_seen || null,
    last_channel: memory?.last_channel || null,
    customer_name: memory?.customer_name || conv.customer_name,
  })
}))

app.patch('/api/admin/conversations/:id', auth, adminOnly, wrap(async (req, res) => {
  const conv = await adminGetConversation(req, req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  const sets = [], params = [req.params.id]
  if (req.body.mode) { params.push(req.body.mode); sets.push(`mode=$${params.length}`) }
  if (req.body.unread != null) { params.push(req.body.unread); sets.push(`unread=$${params.length}`) }
  if (sets.length) await pool.query(`update sts_conversations set ${sets.join(', ')} where id=$1`, params)
  res.json({ ok: true })
}))

app.get('/api/admin/calls', auth, adminOnly, wrap(async (req, res) => {
  const rows = await adminCallRows(req.user, { businessId: req.query.business_id })
  if (rows === null) return res.status(404).json({ error: 'Not found' })
  res.json(rows.map((r) => adminCallShape(r, false)))
}))

app.get('/api/admin/calls/:id', auth, adminOnly, wrap(async (req, res) => {
  const row = await one(
    `select cl.*, b.name as business_name from sts_call_logs cl join sts_businesses b on b.id=cl.business_id where cl.id=$1`,
    [req.params.id],
  )
  if (!row || !(await adminOwns(req.user, row.business_id))) return res.status(404).json({ error: 'Not found' })
  res.json(adminCallShape(row, true))
}))

app.get('/api/admin/businesses/:id/conversations', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  res.json(await adminConversationList(req.user, { businessId: req.params.id, channel: req.query.channel }))
}))

app.get('/api/admin/businesses/:id/calls', auth, adminOnly, adminOwnsBiz, wrap(async (req, res) => {
  const rows = await adminCallRows(req.user, { businessId: req.params.id })
  res.json(rows.map((r) => adminCallShape(r, false)))
}))

const PORT = process.env.PORT || 4000
const server = http.createServer(app)

// Twilio Media Streams connect here; each connection is bridged to OpenAI Realtime.
const wss = new WebSocketServer({ server, path: '/voice-stream' })
wss.on('connection', (ws) => attachVoiceBridge(ws))

// Vonage Voice websocket (PCM16) → OpenAI Realtime
const vonageWss = new WebSocketServer({ server, path: '/vonage-stream' })
vonageWss.on('connection', (ws, req) => {
  const h = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v]))
  attachVonageVoiceBridge(ws, {
    businessId: h.businessid || h.businessId,
    direction: h.direction || 'inbound',
    from: h.from,
    to: h.to,
    callUuid: h.calluuid || '',
  })
})

// Authenticated WhatsApp QR status stream (?token=JWT). Persistent host only (not Vercel).
const waWss = new WebSocketServer({ server, path: '/wa-events' })
waWss.on('connection', async (ws, req) => {
  let token = ''
  try { token = new URL(req.url, 'http://localhost').searchParams.get('token') || '' } catch { /* ignore */ }
  const user = await userFromToken(token)
  if (!user) { ws.close(4401, 'unauthorized'); return }
  const allowed = await allowedBusinessIds(user)
  attachQrSocket(ws, user, allowed)
  const bid = user.business_id
  if (bid) {
    const st = await resolveQrStatus(bid)
    try { ws.send(JSON.stringify({ business_id: bid, provider: 'qr', type: 'whatsapp:status', ...st })) } catch { /* ignore */ }
  }
})

ensureTrainingSchema()
  .catch((e) => console.error('training schema ensure failed:', e.message))
  .finally(() => {
    const host = process.env.HOST || '0.0.0.0'
    server.listen(PORT, host, () => {
      const pub = publicBaseUrl()
      console.log(`STS API + voice WS + WhatsApp QR on ${pub} (listening ${host}:${PORT})`)
      restoreQrSessions().catch((e) => console.error('[WhatsApp QR] restore failed', e.message))
    })
  })
