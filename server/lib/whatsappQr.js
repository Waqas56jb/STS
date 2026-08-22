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
const starting = new Set()
const reconnecting = new Set()

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
  const bid = String(businessId)
  for (const s of sockets) {
    const allowed = s.allowed instanceof Set ? s.allowed.has(bid) : s.businessId === businessId
    if (!allowed) continue
    if (s.ws.readyState !== 1) continue
    try { s.ws.send(body) } catch { /* ignore */ }
  }
}

export function attachQrSocket(ws, user, allowedIds = []) {
  const allowed = new Set((allowedIds || []).map(String).filter(Boolean))
  if (user?.business_id) allowed.add(String(user.business_id))
  const rec = { ws, businessId: user.business_id || null, isAdmin: user.role === 'admin', allowed }
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
    Browsers: root.Browsers,
  }
}

function unwrapMessage(message) {
  if (!message) return {}
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.deviceSentMessage?.message ||
    message
  )
}

function extractText(raw) {
  const message = unwrapMessage(raw)
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
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

/** Map a stored handle to a JID WhatsApp will accept (phone or LID). */
export function toWhatsAppJid(to) {
  const raw = String(to || '').trim()
  if (raw.includes('@')) return raw
  const digits = normalizeWaHandle(raw)
  if (!digits) return ''
  // LIDs are long numeric ids; real E.164 numbers are typically ≤ 12–15 digits
  if (digits.length >= 13) return `${digits}@lid`
  return `${digits}@s.whatsapp.net`
}

export async function sendQrText(businessId, to, text) {
  const s = sessions.get(businessId)
  if (!s?.sock || s.status !== 'connected') throw new Error('WhatsApp QR session is not connected')
  const dest = toWhatsAppJid(to)
  if (!dest) throw new Error('Invalid WhatsApp recipient')
  log(`business=${businessId} send → ${dest}`)
  await s.sock.sendMessage(dest, { text: String(text).slice(0, 4096) })
}

export async function startQrSession(businessId, { restore = false } = {}) {
  if (!QR_ENABLED) throw new Error('WhatsApp QR is disabled')
  const existing = sessions.get(businessId)
  if (existing?.status === 'connected' && existing.sock) return getQrStatus(businessId)
  if (!restore && (existing?.status === 'qr' || existing?.status === 'starting' || existing?.status === 'connecting')) {
    return getQrStatus(businessId)
  }
  if (starting.has(businessId)) return getQrStatus(businessId)

  const now = Date.now()
  if (!restore && lastStart.get(businessId) && now - lastStart.get(businessId) < 2000) {
    return getQrStatus(businessId)
  }
  lastStart.set(businessId, now)
  starting.add(businessId)

  try {
    if (existing?.sock) {
      try { existing.sock.ev?.removeAllListeners?.() } catch { /* ignore */ }
    }

    setState(businessId, { status: restore ? 'reconnecting' : 'starting', qr: restore ? null : existing?.qr || null, error: null })
    log(`business=${businessId} status=${restore ? 'reconnecting' : 'starting'}`)

    const dir = sessionDir(businessId)
    fs.mkdirSync(dir, { recursive: true })

    const baileys = await loadBaileys()
    const { state, saveCreds } = await baileys.useMultiFileAuthState(dir)
    const browser = baileys.Browsers?.macOS?.('Chrome') || baileys.Browsers?.ubuntu?.('Chrome')

    const sock = baileys.makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 25_000,
      getMessage: async () => undefined,
    })

    setState(businessId, { sock, status: restore && state.creds?.registered ? 'connecting' : 'starting' })
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
          const keepQr = sessions.get(businessId)?.qr
          setState(businessId, { status: keepQr ? 'qr' : 'connecting', error: null })
        }
        if (connection === 'open') {
          reconnecting.delete(businessId)
          const display = displayFromJid(sock.user?.id)
          setState(businessId, {
            status: 'connected',
            qr: null,
            displayNumber: display,
            error: null,
            connectedAt: new Date().toISOString(),
          })
          await persistMeta(businessId, { status: 'connected', display_number: display }).catch((e) => log('persist failed', e.message))
          log(`business=${businessId} status=connected number=${display}`)
        }
        if (connection === 'close') {
          const err = lastDisconnect?.error
          const code = err?.output?.statusCode ?? err?.statusCode
          const loggedOut = code === baileys.DisconnectReason.loggedOut || code === 401 || code === 403 || code === 440
          // 515 = restartRequired — normal right after a successful QR scan
          log(`business=${businessId} closed code=${code ?? 'unknown'}`)
          if (loggedOut) {
            reconnecting.delete(businessId)
            setState(businessId, { status: 'logged_out', qr: null, sock: null, error: 'Logged out — scan a new QR' })
            await persistMeta(businessId, { status: 'logged_out' }).catch(() => {})
            wipeSessionDir(businessId)
            log(`business=${businessId} status=logged_out`)
            return
          }
          if (reconnecting.has(businessId)) return
          reconnecting.add(businessId)
          setState(businessId, { status: 'reconnecting', qr: null, error: null, sock: null })
          setTimeout(() => {
            startQrSession(businessId, { restore: true })
              .catch((e) => log('reconnect failed', e.message))
              .finally(() => reconnecting.delete(businessId))
          }, code === 515 ? 800 : 2000)
        }
      } catch (e) {
        log(`business=${businessId} connection.update error`, e.message)
        setState(businessId, { status: 'error', error: e.message })
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'prepend') return
      for (const m of messages || []) {
        try {
          await handleBaileysMessage(businessId, m)
        } catch (e) {
          log(`business=${businessId} inbound error`, e.message)
        }
      }
    })

    return getQrStatus(businessId)
  } finally {
    starting.delete(businessId)
  }
}

async function handleBaileysMessage(businessId, m) {
  if (!m?.key || m.key.fromMe) return
  const jid = m.key.remoteJid || ''
  if (jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@broadcast')) return // groups / status ignored

  const message = m.message || {}
  const text = extractText(message).trim()
  const kind = mediaKind(unwrapMessage(message))
  if (!text && kind) {
    log(`business=${businessId} skipped ${kind} (MVP text only)`)
    return
  }
  if (!text) return

  const alt = m.key.remoteJidAlt || m.key.senderPn || ''
  const replyJid = jid || alt
  const from = replyJid || normalizeWaHandle(alt) || normalizeWaHandle(jid)
  if (!from) return
  const name = m.pushName || normalizeWaHandle(alt || jid) || from
  const messageId = `qr:${businessId}:${m.key.id}`
  if (!inboundHandler) {
    log(`business=${businessId} no inbound handler`)
    return
  }
  log(`business=${businessId} incoming from=${from}`)
  await inboundHandler(businessId, { from, jid: replyJid, name, text, messageId })
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
