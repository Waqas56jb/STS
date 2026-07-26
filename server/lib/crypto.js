import 'dotenv/config'
import crypto from 'node:crypto'

/**
 * AES-256-GCM encryption for channel credentials (Meta / Twilio secrets).
 *
 * The key comes from APP_ENCRYPTION_KEY (64 hex chars = 32 bytes). Secrets
 * are stored only as ciphertext in sts_channel_configs.secrets_enc, so a
 * database dump never exposes raw tokens. Format: iv:tag:ciphertext (hex).
 */
const KEY_HEX = process.env.APP_ENCRYPTION_KEY || ''
if (KEY_HEX.length !== 64) {
  console.error('FATAL: APP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  process.exit(1)
}
const KEY = Buffer.from(KEY_HEX, 'hex')

/** Encrypt a JS object → "iv:tag:ciphertext" hex string. */
export function encryptJSON(obj) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const plaintext = Buffer.from(JSON.stringify(obj ?? {}), 'utf8')
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

/** Decrypt "iv:tag:ciphertext" → JS object ({} on failure/empty). */
export function decryptJSON(blob) {
  if (!blob || typeof blob !== 'string') return {}
  try {
    const [ivH, tagH, dataH] = blob.split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivH, 'hex'))
    decipher.setAuthTag(Buffer.from(tagH, 'hex'))
    const dec = Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()])
    return JSON.parse(dec.toString('utf8'))
  } catch {
    return {}
  }
}

/** Field names treated as secret (masked in API responses). */
const SECRET_RE = /(token|secret|key|auth|password|sid)/i

/** Mask a single secret-ish value → keep last 4 chars. */
export function maskValue(v) {
  const s = String(v ?? '')
  if (!s) return ''
  if (s.length <= 4) return '••••'
  return '••••••' + s.slice(-4)
}

/**
 * Return a display-safe copy of credentials: secret-looking fields masked,
 * plain fields (ids, numbers, handles) shown as-is. Empty strings dropped.
 */
export function maskCredentials(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === '' || v == null) continue
    out[k] = SECRET_RE.test(k) ? maskValue(v) : v
  }
  return out
}

export const isSecretField = (name) => SECRET_RE.test(name)
