import crypto from 'node:crypto'
import { pool, one, many } from '../db.js'
import { decryptJSON, encryptJSON } from './crypto.js'

const VONAGE_KEYS = ['vonage_api_key', 'vonage_api_secret', 'vonage_signature_secret', 'vonage_application_id']

/** Platform Vonage credentials (admin settings — never sent to client browsers). */
export async function getPlatformVonage() {
  const rows = await many(`select key, value from sts_settings where key = any($1::text[])`, [VONAGE_KEYS])
  const map = {}
  rows.forEach((r) => { map[r.key] = r.value })
  const out = {
    api_key: map.vonage_api_key || process.env.VONAGE_API_KEY || '',
    application_id: map.vonage_application_id || process.env.VONAGE_APPLICATION_ID || '',
  }
  for (const k of ['vonage_api_secret', 'vonage_signature_secret']) {
    try {
      const plain = map[k] ? decryptJSON(map[k])?.v || '' : ''
      if (k === 'vonage_api_secret') out.api_secret = plain || process.env.VONAGE_API_SECRET || ''
      if (k === 'vonage_signature_secret') out.signature_secret = plain || process.env.VONAGE_SIGNATURE_SECRET || ''
    } catch {
      if (k === 'vonage_api_secret') out.api_secret = process.env.VONAGE_API_SECRET || ''
      if (k === 'vonage_signature_secret') out.signature_secret = process.env.VONAGE_SIGNATURE_SECRET || ''
    }
  }
  out.configured = !!(out.api_key && out.api_secret && out.application_id)
  return out
}

export function maskVonageForAdmin(v) {
  const mask = (s) => (s ? '••••' + String(s).slice(-4) : '')
  return {
    vonage_api_key: v.api_key || '',
    vonage_application_id: v.application_id || '',
    vonage_api_secret: mask(v.api_secret),
    vonage_signature_secret: mask(v.signature_secret),
    configured: v.configured,
  }
}

/** Verify Vonage signed webhooks (sig = md5 of sorted params + secret). */
export function verifyVonageSignature(params, signatureSecret) {
  if (!signatureSecret || !params?.sig) return !signatureSecret
  const { sig, ...rest } = params
  const sorted = Object.keys(rest).sort().reduce((acc, k) => { acc[k] = rest[k]; return acc }, {})
  const base = Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join('&') + signatureSecret
  const expected = crypto.createHash('md5').update(base).digest('hex')
  return expected === sig
}

/** NCCO that connects the call to our AI websocket bridge. */
export function nccoConnectWebsocket(wsUrl, headers = {}) {
  return [{
    action: 'connect',
    endpoint: [{
      type: 'websocket',
      uri: wsUrl,
      'content-type': 'audio/l16;rate=16000',
      headers,
    }],
  }]
}

/** Place outbound call via Vonage Voice API. */
export async function vonageCreateCall({ apiKey, apiSecret, from, to, answerUrl, eventUrl }) {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch('https://api.nexmo.com/v1/calls', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ type: 'phone', number: String(to).replace(/\s/g, '') }],
      from: { type: 'phone', number: String(from).replace(/\s/g, '') },
      answer_url: [answerUrl],
      event_url: [eventUrl],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.title || data?.error_text || data?.detail || `Vonage call failed (${res.status})`)
  return data // { uuid, conversation_uuid, ... }
}

export async function upsertVonageSettings(body) {
  const upsertPlain = async (key, value) => {
    await pool.query(
      `insert into sts_settings (key, value, updated_at) values ($1,$2, now())
       on conflict (key) do update set value=excluded.value, updated_at=now()`,
      [key, value],
    )
  }
  if (body.vonage_api_key !== undefined) await upsertPlain('vonage_api_key', String(body.vonage_api_key))
  if (body.vonage_application_id !== undefined) await upsertPlain('vonage_application_id', String(body.vonage_application_id))
  for (const k of ['vonage_api_secret', 'vonage_signature_secret']) {
    const v = body[k]
    if (v === undefined) continue
    if (String(v).includes('••')) continue
    if (String(v).trim() === '') continue
    await upsertPlain(k, encryptJSON({ v: String(v).trim() }))
  }
}
