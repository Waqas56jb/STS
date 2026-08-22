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
 * Group chats are ignored. 1:1 text + voice notes are sent to handleInboundWhatsApp.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import pino from 'pino'
import { pool, one, many } from '../db.js'
import { encryptJSON, decryptJSON } from './crypto.js'
import { transcribeWhatsAppAudio } from './whatsappVoice.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIR = path.resolve(__dirname, '../.whatsapp-sessions')

function resolveSessionRoot() {
  if (process.env.WHATSAPP_QR_SESSION_DIR) return process.env.WHATSAPP_QR_SESSION_DIR
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'whatsapp-sessions')
  }
  return DEFAULT_DIR
}

const SESSION_ROOT = resolveSessionRoot()
const QR_ENABLED = process.env.WHATSAPP_QR_ENABLED !== 'false'
const log = (...a) => console.log('[WhatsApp QR]', ...a)
try { fs.mkdirSync(SESSION_ROOT, { recursive: true }) } catch { /* ignore */ }
if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  log('session dir:', SESSION_ROOT)
}

/** @type {Map<string, { sock: any, status: string, qr: string|null, displayNumber: string, error: string|null, connectedAt: string|null }>} */
const sessions = new Map()
/** @type {Set<{ ws: import('ws').WebSocket, businessId: string|null, isAdmin: boolean }>} */
const sockets = new Set()
let inboundHandler = null
const lastStart = new Map()
const starting = new Set()
const reconnecting = new Set()
const persistTimers = new Map()
/** Monotonic id per socket — ignore close events from replaced connections. */
const sessionGen = new Map()
/** Pending reconnect timers — only one per business. */
const reconnectTimers = new Map()

function clearReconnectTimer(businessId) {
  const t = reconnectTimers.get(businessId)
  if (t) {
    clearTimeout(t)
    reconnectTimers.delete(businessId)
  }
}

function destroyActiveSocket(businessId) {
  const s = sessions.get(businessId)
  if (!s?.sock) return
  const sock = s.sock
  sessions.set(businessId, { ...s, sock: null })
  try { sock.ev?.removeAllListeners?.() } catch { /* ignore */ }
  try { sock.end(undefined) } catch { /* ignore */ }
  try { sock.ws?.close() } catch { /* ignore */ }
}

/** Recently handled inbound WA message ids (Baileys may emit duplicates). */
const recentInbound = new Map()
const inboundInflight = new Set()
const INBOUND_TTL_MS = 3 * 60 * 1000

function inboundDedupeKey(businessId, keyId) {
  return `${businessId}:${keyId}`
}

function markInboundSeen(key) {
  recentInbound.set(key, Date.now())
  for (const [k, t] of recentInbound) {
    if (Date.now() - t > INBOUND_TTL_MS) recentInbound.delete(k)
  }
}

function isInboundDuplicate(businessId, keyId) {
  if (!keyId) return true
  const key = inboundDedupeKey(businessId, keyId)
  if (inboundInflight.has(key)) return true
  const seenAt = recentInbound.get(key)
  return seenAt != null && Date.now() - seenAt < INBOUND_TTL_MS
}

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

function snapshotSessionFiles(dir) {
  const files = {}
  if (!fs.existsSync(dir)) return files
  for (const name of fs.readdirSync(dir)) {
    if (!/^[\w.-]+$/.test(name)) continue
    const full = path.join(dir, name)
    try {
      if (!fs.statSync(full).isFile()) continue
      files[name] = fs.readFileSync(full).toString('base64')
    } catch { /* skip unreadable */ }
  }
  return files
}

function writeSessionFiles(dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, b64] of Object.entries(files || {})) {
    if (!/^[\w.-]+$/.test(name) || typeof b64 !== 'string') continue
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'))
  }
}

function hasRegisteredCreds(businessId) {
  try {
    const raw = fs.readFileSync(path.join(sessionDir(businessId), 'creds.json'), 'utf8')
    const creds = JSON.parse(raw)
    return !!(creds?.me || creds?.registered)
  } catch {
    return false
  }
}

async function persistAuthToDb(businessId) {
  const files = snapshotSessionFiles(sessionDir(businessId))
  if (!Object.keys(files).length) return
  const packed = zlib.gzipSync(Buffer.from(JSON.stringify(files)), { level: 9 }).toString('base64')
  await pool.query(
    `insert into sts_channel_configs (business_id, channel, connected, secrets_enc, qr_auth_enc, updated_at)
     values ($1,'whatsapp', false, $2, $3, now())
     on conflict (business_id, channel) do update set
       qr_auth_enc=excluded.qr_auth_enc, updated_at=now()`,
    [businessId, encryptJSON({ provider: 'qr' }), encryptJSON({ packed })],
  )
}

function schedulePersistAuth(businessId) {
  clearTimeout(persistTimers.get(businessId))
  persistTimers.set(businessId, setTimeout(() => {
    persistAuthToDb(businessId).catch((e) => log('auth persist failed', e.message))
  }, 800))
}

async function hydrateAuthFromDb(businessId) {
  const dir = sessionDir(businessId)
  if (hasRegisteredCreds(businessId)) return true
  const row = await one(
    `select qr_auth_enc from sts_channel_configs where business_id=$1 and channel='whatsapp'`,
    [businessId],
  )
  if (!row?.qr_auth_enc) return false
  let packed = ''
  try { packed = decryptJSON(row.qr_auth_enc)?.packed || '' } catch { return false }
  if (!packed) return false
  try {
    const files = JSON.parse(zlib.gunzipSync(Buffer.from(packed, 'base64')).toString('utf8'))
    writeSessionFiles(dir, files)
    return hasRegisteredCreds(businessId)
  } catch (e) {
    log(`hydrate ${businessId} failed`, e.message)
    return false
  }
}

async function clearAuthInDb(businessId) {
  await pool.query(
    `update sts_channel_configs set qr_auth_enc=null, updated_at=now()
      where business_id=$1 and channel='whatsapp'`,
    [businessId],
  ).catch(() => {})
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

/** Live socket, or "still paired" from saved auth — never ask to scan while the phone still has this device. */
export async function resolveQrStatus(businessId) {
  const live = getQrStatus(businessId)
  if (live.status === 'connected' || live.status === 'qr' || live.status === 'starting' || live.status === 'connecting' || live.status === 'reconnecting') {
    return live
  }
  const row = await one(
    `select secrets_enc, qr_auth_enc from sts_channel_configs where business_id=$1 and channel='whatsapp'`,
    [businessId],
  )
  let creds = {}
  try { creds = row ? decryptJSON(row.secrets_enc) : {} } catch { creds = {} }
  const paired = creds.provider === 'qr' && creds.status === 'connected' && (row?.qr_auth_enc || hasRegisteredCreds(businessId))
  if (!paired) return live
  if (!starting.has(businessId) && !reconnecting.has(businessId) && !reconnectTimers.has(businessId) && !sessions.get(businessId)?.sock) {
    startQrSession(businessId, { restore: true }).catch((e) => log('auto-resume failed', e.message))
  }
  return {
    provider: 'qr',
    status: 'reconnecting',
    qr: null,
    display_number: creds.display_number || '',
    error: null,
    connected_at: creds.connected_at || null,
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
    downloadMediaMessage: root.downloadMediaMessage,
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

/** Show "typing…" or "recording audio…" in the customer's WhatsApp chat. */
export async function sendQrPresence(businessId, to, type) {
  const s = sessions.get(businessId)
  if (!s?.sock || s.status !== 'connected') return
  const dest = toWhatsAppJid(to)
  if (!dest) return
  try {
    await s.sock.presenceSubscribe(dest)
    await s.sock.sendPresenceUpdate(type, dest)
  } catch (e) {
    log(`business=${businessId} presence ${type} failed`, e.message)
  }
}

/**
 * Keep presence visible while the AI thinks / TTS runs (WA expires after ~10s).
 * Returns a stop() that clears the indicator.
 */
export function beginQrPresence(businessId, to, type) {
  let timer = null
  const pulse = () => { sendQrPresence(businessId, to, type).catch(() => {}) }
  pulse()
  timer = setInterval(pulse, 4500)
  return () => {
    if (timer) clearInterval(timer)
    timer = null
    return sendQrPresence(businessId, to, 'paused')
  }
}

export async function sendQrVoice(businessId, to, audioBuffer, mimeType = 'audio/ogg; codecs=opus') {
  const s = sessions.get(businessId)
  if (!s?.sock || s.status !== 'connected') throw new Error('WhatsApp QR session is not connected')
  const dest = toWhatsAppJid(to)
  if (!dest) throw new Error('Invalid WhatsApp recipient')
  log(`business=${businessId} send voice → ${dest}`)
  await s.sock.sendMessage(dest, {
    audio: audioBuffer,
    mimetype: mimeType,
    ptt: true,
  })
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
  clearReconnectTimer(businessId)

  const gen = (sessionGen.get(businessId) || 0) + 1
  sessionGen.set(businessId, gen)

  try {
    if (existing?.sock) destroyActiveSocket(businessId)

    setState(businessId, { status: restore ? 'reconnecting' : 'starting', qr: restore ? null : existing?.qr || null, error: null, sock: null })
    log(`business=${businessId} status=${restore ? 'reconnecting' : 'starting'}`)

    await hydrateAuthFromDb(businessId).catch(() => {})
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

    const paired = !!(state.creds?.registered || state.creds?.me)
    setState(businessId, { sock, status: (restore || paired) && paired ? 'connecting' : 'starting', qr: paired ? null : sessions.get(businessId)?.qr || null })
    sock.ev.on('creds.update', async () => {
      try { await saveCreds() } catch { /* ignore */ }
      schedulePersistAuth(businessId)
    })

    sock.ev.on('connection.update', async (update) => {
      if (sessionGen.get(businessId) !== gen) return
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
          clearReconnectTimer(businessId)
          const display = displayFromJid(sock.user?.id)
          setState(businessId, {
            status: 'connected',
            qr: null,
            displayNumber: display,
            error: null,
            connectedAt: new Date().toISOString(),
          })
          await persistMeta(businessId, { status: 'connected', display_number: display, connected_at: new Date().toISOString() }).catch((e) => log('persist failed', e.message))
          schedulePersistAuth(businessId)
          log(`business=${businessId} status=connected number=${display}`)
        }
        if (connection === 'close') {
          if (sessionGen.get(businessId) !== gen) return
          const err = lastDisconnect?.error
          const code = err?.output?.statusCode ?? err?.statusCode
          const loggedOut = code === baileys.DisconnectReason.loggedOut
          log(`business=${businessId} closed code=${code ?? 'unknown'}`)
          destroyActiveSocket(businessId)
          if (loggedOut) {
            reconnecting.delete(businessId)
            clearReconnectTimer(businessId)
            setState(businessId, { status: 'logged_out', qr: null, sock: null, error: 'Unlinked on the phone — scan a new QR' })
            await persistMeta(businessId, { status: 'logged_out' }).catch(() => {})
            wipeSessionDir(businessId)
            await clearAuthInDb(businessId)
            log(`business=${businessId} status=logged_out`)
            return
          }
          if (reconnectTimers.has(businessId)) return
          reconnecting.add(businessId)
          setState(businessId, { status: 'reconnecting', qr: null, error: null, sock: null })
          const delay = code === 515 ? 1200 : code === 440 ? 8000 : 4000
          const timer = setTimeout(() => {
            reconnectTimers.delete(businessId)
            if (sessionGen.get(businessId) !== gen) return
            startQrSession(businessId, { restore: true })
              .catch((e) => log('reconnect failed', e.message))
          }, delay)
          reconnectTimers.set(businessId, timer)
        }
      } catch (e) {
        log(`business=${businessId} connection.update error`, e.message)
        setState(businessId, { status: 'error', error: e.message })
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Only brand-new live messages — ignore history sync / duplicates.
      if (type !== 'notify') return
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

  const dedupeKey = inboundDedupeKey(businessId, m.key.id)
  if (isInboundDuplicate(businessId, m.key.id)) {
    log(`business=${businessId} skipped duplicate msg ${m.key.id}`)
    return
  }
  inboundInflight.add(dedupeKey)

  try {
    const message = m.message || {}
    const unwrapped = unwrapMessage(message)
    const text = extractText(message).trim()
    const kind = mediaKind(unwrapped)
    const alt = m.key.remoteJidAlt || m.key.senderPn || ''
    const replyJid = jid || alt
    let inboundText = text
    let isVoice = false

    if (!text && kind === 'audio') {
      const s = sessions.get(businessId)
      if (!s?.sock || s.status !== 'connected') return
      try {
        const baileys = await loadBaileys()
        if (!baileys.downloadMediaMessage) throw new Error('Baileys downloadMediaMessage not found')
        const stopThinking = beginQrPresence(businessId, replyJid, 'composing')
        const buffer = await baileys.downloadMediaMessage(
          m,
          'buffer',
          {},
          { reuploadRequest: s.sock.updateMediaMessage, logger: pino({ level: 'silent' }) },
        )
        const mime = unwrapped.audioMessage?.mimetype || 'audio/ogg; codecs=opus'
        try {
          inboundText = await transcribeWhatsAppAudio(buffer, mime)
        } finally {
          await stopThinking()
        }
        isVoice = true
        if (!inboundText) {
          log(`business=${businessId} voice empty transcript`)
          return
        }
        log(`business=${businessId} voice transcript="${inboundText.slice(0, 80)}"`)
      } catch (e) {
        log(`business=${businessId} voice failed`, e.message)
        return
      }
    } else if (!text && kind) {
      log(`business=${businessId} skipped ${kind} (text + voice only)`)
      return
    }
    if (!inboundText) return

    const from = replyJid || normalizeWaHandle(alt) || normalizeWaHandle(jid)
    if (!from) return
    const name = m.pushName || normalizeWaHandle(alt || jid) || from
    const messageId = `qr:${businessId}:${m.key.id}`
    if (!inboundHandler) {
      log(`business=${businessId} no inbound handler`)
      return
    }
    log(`business=${businessId} incoming from=${from}${isVoice ? ' (voice)' : ''}`)
    await inboundHandler(businessId, {
      from,
      jid: replyJid,
      name,
      text: inboundText,
      messageId,
      isVoice,
      previewText: isVoice ? `🎤 ${inboundText.slice(0, 120)}` : undefined,
      inboundBody: isVoice ? `[Voice] ${inboundText}` : inboundText,
    })
    markInboundSeen(dedupeKey)
  } finally {
    inboundInflight.delete(dedupeKey)
  }
}

function wipeSessionDir(businessId) {
  const dir = sessionDir(businessId)
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
}

export async function stopQrSession(businessId, { wipe = false } = {}) {
  clearReconnectTimer(businessId)
  reconnecting.delete(businessId)
  sessionGen.set(businessId, (sessionGen.get(businessId) || 0) + 1)
  destroyActiveSocket(businessId)
  sessions.delete(businessId)
  if (wipe) {
    wipeSessionDir(businessId)
    await clearAuthInDb(businessId)
  }
  await persistMeta(businessId, { status: wipe ? 'logged_out' : 'disconnected' }).catch(() => {})
  emit(businessId, { type: 'whatsapp:disconnected', status: wipe ? 'logged_out' : 'disconnected', qr: null })
  log(`business=${businessId} status=${wipe ? 'logged_out' : 'disconnected'}`)
  return getQrStatus(businessId)
}

export async function logoutQrSession(businessId) {
  const s = sessions.get(businessId)
  try { await s?.sock?.logout?.() } catch { /* ignore */ }
  const out = await stopQrSession(businessId, { wipe: true })
  await clearAuthInDb(businessId)
  return out
}

export async function restoreQrSessions() {
  if (!QR_ENABLED) return
  let rows = []
  try {
    rows = await many(`select business_id, secrets_enc, qr_auth_enc from sts_channel_configs where channel='whatsapp'`)
  } catch (e) {
    log('restore skipped', e.message)
    return
  }
  for (const r of rows) {
    let creds = {}
    try { creds = decryptJSON(r.secrets_enc) } catch { continue }
    if (creds.provider !== 'qr') continue
    if (creds.status === 'logged_out') continue
    const hydrated = await hydrateAuthFromDb(r.business_id).catch(() => false)
    if (!hydrated && !hasRegisteredCreds(r.business_id) && !r.qr_auth_enc) continue
    // Stagger restores so multiple businesses don't fight for connections at once.
    await new Promise((res) => setTimeout(res, 1500 * rows.indexOf(r)))
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
