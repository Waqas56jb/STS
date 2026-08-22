/**
 * WhatsApp QR / Linked-Device transport (Baileys).
 *
 * Second provider next to Meta Cloud API. One in-memory session per
 * business_id. Auth state lives on disk (WHATSAPP_QR_SESSION_DIR) so a
 * Railway restart can restore without a new scan.
 *
 * This process must be a persistent Node host (Railway / VPS). Do not
 * run Baileys sockets on Vercel serverless.
 *
 * Group chats are ignored. Only 1:1 text is sent to handleInboundWhatsApp.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import pino from 'pino'
import { pool, one, many } from '../db.js'
import { encryptJSON, decryptJSON } from './crypto.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIR = path.resolve(__dirname, '../.whatsapp-sessions')
const SESSION_ROOT = process.env.WHATSAPP_QR_SESSION_DIR || DEFAULT_DIR
const QR_ENABLED = process.env.WHATSAPP_QR_ENABLED !== 'false'
const log = (...a) => console.log('[WhatsApp QR]', ...a)

/** @type {Map<string, { sock: any, status: string, qr: string|null, displayNumber: string, error: string|null, connectedAt: string|null }>} */
const sessions = new Map()
/** @type {Set<{ ws: import('ws').WebSocket, businessId: string|null, isAdmin: boolean }>} */
const sockets = new Set()
let inboundHandler = null
const lastStart = new Map()

export function setQrInboundHandler(fn) {
  inboundHandler = fn
}

export function qrEnabled() {
  return QR_ENABLED
}

export function normalizeWaHandle(input) {
  return String(input || '').replace(/\D/g, '')
}

function sessionDir(businessId) {
  const id = String(businessId).replace(/[^a-fA-F0-9-]/g, '')
  return path.join(SESSION_ROOT, id)
}

function emit(businessId, payload) {
  const body = JSON.stringify({ business_id: businessId, provider: 'qr', ...payload })
  for (const s of sockets) {
    if (!s.isAdmin && s.businessId !== businessId) continue
    if (s.ws.readyState !== 1) continue
    try { s.ws.send(body) } catch { /* ignore */ }
  }
}

export function attachQrSocket(ws, user) {
  const rec = { ws, businessId: user.business_id || null, isAdmin: user.role === 'admin' }
  sockets.add(rec)
  ws.on('close', () => sockets.delete(rec))
}

export function getQrStatus(businessId) {
  const s = sessions.get(businessId)
  if (!s) {
    return { provider: 'qr', status: 'disconnected', qr: null, display_number: '', error: null, connected_at: null }
  }
  return {
    provider: 'qr',
    status: s.status,
    qr: s.qr,
    display_number: s.displayNumber || '',
    error: s.error,
    connected_at: s.connectedAt,
  }
}

async function persistMeta(businessId, patch) {
  const row = await one(`select secrets_enc from sts_channel_configs where business_id=$1 and channel='whatsapp'`, [businessId])
  const cur = row ? decryptJSON(row.secrets_enc) : {}
  const merged = { ...cur, provider: 'qr', ...patch }
  const connected = merged.status === 'connected'
  const extRef = normalizeWaHandle(merged.display_number) || null
  await pool.query(
    `insert into sts_channel_configs (business_id, channel, connected, ext_ref, secrets_enc, updated_at)
     values ($1,'whatsapp',$2,$3,$4, now())
     on conflict (business_id, channel) do update set
       connected=excluded.connected, ext_ref=excluded.ext_ref, secrets_enc=excluded.secrets_enc, updated_at=now()`,
    [businessId, connected, extRef, encryptJSON(merged)],
  )
}

function setState(businessId, patch) {
  const prev = sessions.get(businessId) || { sock: null, status: 'disconnected', qr: null, displayNumber: '', error: null, connectedAt: null }
  const next = { ...prev, ...patch }
  sessions.set(businessId, next)
  emit(businessId, {
    type: next.status === 'connected' ? 'whatsapp:connected' : next.status === 'disconnected' || next.status === 'logged_out' ? 'whatsapp:disconnected' : 'whatsapp:status',
    status: next.status,
    qr: next.qr,
    display_number: next.displayNumber,
    error: next.error,
    connected_at: next.connectedAt,
  })
  if (next.qr) emit(businessId, { type: 'whatsapp:qr', status: 'qr', qr: next.qr })
}

async function loadBaileys() {
  const mod = await import('@whiskeysockets/baileys')
  const root = mod.default && typeof mod.default === 'object' ? { ...mod, ...mod.default } : mod
  const makeWASocket = root.makeWASocket || root.default
  if (typeof makeWASocket !== 'function') throw new Error('Baileys makeWASocket not found')
  return {
    makeWASocket,
    useMultiFileAuthState: root.useMultiFileAuthState,
    DisconnectReason: root.DisconnectReason || {},
    fetchLatestBaileysVersion: root.fetchLatestBaileysVersion,
  }
}

function extractText(message) {
  if (!message) return ''
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.ephemeralMessage?.message?.conversation ||
    message.ephemeralMessage?.message?.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  )
}

function mediaKind(message) {
  if (!message) return null
  if (message.imageMessage) return 'image'
  if (message.audioMessage) return 'audio'
  if (message.videoMessage) return 'video'
  if (message.documentMessage) return 'document'
  if (message.stickerMessage) return 'sticker'
  if (message.locationMessage) return 'location'
  if (message.contactMessage) return 'contact'
  return null
}

function displayFromJid(jid) {
  const user = String(jid || '').split('@')[0].split(':')[0]
  const digits = normalizeWaHandle(user)
  return digits ? `+${digits}` : ''
}

export async function sendQrText(businessId, to, text) {
  const s = sessions.get(businessId)
  if (!s?.sock || s.status !== 'connected') throw new Error('WhatsApp QR session is not connected')
  const jid = `${normalizeWaHandle(to)}@s.whatsapp.net`
  await s.sock.sendMessage(jid, { text: String(text).slice(0, 4096) })
}

export async function startQrSession(businessId, { restore = false } = {}) {
  if (!QR_ENABLED) throw new Error('WhatsApp QR is disabled')
  const existing = sessions.get(businessId)
  if (existing?.status === 'connected') return getQrStatus(businessId)
  if (existing?.status === 'qr' || existing?.status === 'starting' || existing?.status === 'connecting') {
    return getQrStatus(businessId)
  }

  const now = Date.now()
  if (!restore && lastStart.get(businessId) && now - lastStart.get(businessId) < 3000) {
    return getQrStatus(businessId)
  }
  lastStart.set(businessId, now)

  if (existing?.sock) {
    try { existing.sock.end(undefined) } catch { /* ignore */ }
    sessions.delete(businessId)
  }

  setState(businessId, { status: 'starting', qr: null, error: null })
  log(`business=${businessId} status=starting`)

  const dir = sessionDir(businessId)
  fs.mkdirSync(dir, { recursive: true })

  const baileys = await loadBaileys()
  const { state, saveCreds } = await baileys.useMultiFileAuthState(dir)
  let version
  try {
    const fetched = await baileys.fetchLatestBaileysVersion?.()
    version = fetched?.version
  } catch { /* use library default */ }

  const sock = baileys.makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: ['STS', 'Chrome', '1.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  })

  setState(businessId, { sock, status: 'starting' })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    try {
      const { connection, lastDisconnect, qr } = update
      if (qr) {
        const dataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 })
        setState(businessId, { status: 'qr', qr: dataUrl, error: null })
        log(`business=${businessId} status=qr`)
      }
      if (connection === 'connecting') {
        setState(businessId, { status: sessions.get(businessId)?.qr ? 'qr' : 'connecting', error: null })
      }
      if (connection === 'open') {
        const display = displayFromJid(sock.user?.id)
        setState(businessId, {
          status: 'connected',
          qr: null,
          displayNumber: display,
          error: null,
          connectedAt: new Date().toISOString(),
        })
        await persistMeta(businessId, { status: 'connected', display_number: display }).catch((e) => log('persist failed', e.message))
        log(`business=${businessId} status=connected`)
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode
        const loggedOut = code === baileys.DisconnectReason.loggedOut || code === 401
        if (loggedOut) {
          setState(businessId, { status: 'logged_out', qr: null, sock: null, error: 'Logged out — scan a new QR' })
          await persistMeta(businessId, { status: 'logged_out' }).catch(() => {})
          wipeSessionDir(businessId)
          log(`business=${businessId} status=logged_out`)
        } else {
          setState(businessId, { status: 'reconnecting', qr: null, error: null })
          log(`business=${businessId} status=reconnecting`)
          sessions.delete(businessId)
          setTimeout(() => startQrSession(businessId, { restore: true }).catch((e) => log('reconnect failed', e.message)), 2500)
        }
      }
    } catch (e) {
      log(`business=${businessId} connection.update error`, e.message)
      setState(businessId, { status: 'error', error: e.message })
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return
    for (const m of messages || []) {
      try {
        await handleBaileysMessage(businessId, m)
      } catch (e) {
        log(`business=${businessId} inbound error`, e.message)
      }
    }
  })

  return getQrStatus(businessId)
}

async function handleBaileysMessage(businessId, m) {
  if (!m?.key || m.key.fromMe) return
  const jid = m.key.remoteJid || ''
  if (jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@broadcast')) return // groups / status ignored

  const message = m.message || {}
  const text = extractText(message).trim()
  const kind = mediaKind(message)
  if (!text && kind) {
    log(`business=${businessId} skipped ${kind} (MVP text only)`)
    return
  }
  if (!text) return

  const from = normalizeWaHandle(jid)
  if (!from) return
  const name = m.pushName || from
  const messageId = `qr:${businessId}:${m.key.id}`
  if (!inboundHandler) return
  await inboundHandler(businessId, { from, name, text, messageId })
  log(`business=${businessId} incoming message`)
}

function wipeSessionDir(businessId) {
  const dir = sessionDir(businessId)
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
}

export async function stopQrSession(businessId, { wipe = false } = {}) {
  const s = sessions.get(businessId)
  if (s?.sock) {
    try { s.sock.end(undefined) } catch { /* ignore */ }
    try { s.sock.ws?.close() } catch { /* ignore */ }
  }
  sessions.delete(businessId)
  if (wipe) wipeSessionDir(businessId)
  await persistMeta(businessId, { status: wipe ? 'logged_out' : 'disconnected' }).catch(() => {})
  emit(businessId, { type: 'whatsapp:disconnected', status: wipe ? 'logged_out' : 'disconnected', qr: null })
  log(`business=${businessId} status=${wipe ? 'logged_out' : 'disconnected'}`)
  return getQrStatus(businessId)
}

export async function logoutQrSession(businessId) {
  const s = sessions.get(businessId)
  try { await s?.sock?.logout?.() } catch { /* ignore */ }
  return stopQrSession(businessId, { wipe: true })
}

export async function restoreQrSessions() {
  if (!QR_ENABLED) return
  let rows = []
  try {
    rows = await many(`select business_id, secrets_enc from sts_channel_configs where channel='whatsapp'`)
  } catch (e) {
    log('restore skipped', e.message)
    return
  }
  for (const r of rows) {
    let creds = {}
    try { creds = decryptJSON(r.secrets_enc) } catch { continue }
    if (creds.provider !== 'qr') continue
    const dir = sessionDir(r.business_id)
    if (!fs.existsSync(dir)) continue
    startQrSession(r.business_id, { restore: true }).catch((e) => log(`restore ${r.business_id} failed`, e.message))
  }
}

export async function businessAllowsWhatsApp(businessId) {
  const b = await one(`select channels from sts_businesses where id=$1`, [businessId])
  if (!b) return false
  const ch = b.channels || []
  if (!ch.length) return true
  return ch.includes('wa') || ch.includes('whatsapp')
}
