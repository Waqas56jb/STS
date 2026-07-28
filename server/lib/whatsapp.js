import crypto from 'node:crypto'

/**
 * WhatsApp Cloud API helper (Meta Graph API).
 *
 * A business's credentials live encrypted in sts_channel_configs (channel
 * 'whatsapp'): phone_number_id, access_token, app_secret, verify_token, …
 * Inbound messages arrive as webhooks; replies are sent with the Graph API.
 */
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

/** appsecret_proof = HMAC-SHA256(access_token, app_secret) — required when the
 *  app has "Require app secret" enabled; harmless otherwise. */
function appsecretProof(accessToken, appSecret) {
  if (!appSecret) return null
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

/** Send a plain text message to a WhatsApp user. */
export async function sendWhatsAppText(creds, to, body) {
  if (!creds?.phone_number_id || !creds?.access_token) {
    throw new Error('WhatsApp not connected (missing phone_number_id / access_token)')
  }
  const proof = appsecretProof(creds.access_token, creds.app_secret)
  const url = `${GRAPH}/${creds.phone_number_id}/messages` + (proof ? `?appsecret_proof=${proof}` : '')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: String(body).slice(0, 4096) },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp send failed (${res.status})`)
  return data
}

/**
 * Verify Meta's `X-Hub-Signature-256` header against the RAW request body
 * using the app secret. Returns false if anything is missing or mismatched.
 */
export function verifyMetaSignature(appSecret, rawBody, signatureHeader) {
  if (!appSecret || !signatureHeader || !rawBody) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signatureHeader)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Extract inbound text messages + contact info from a webhook payload.
 * Non-text messages (images, status callbacks, …) are ignored for now.
 * Returns [{ phoneNumberId, from, name, text, messageId }].
 */
export function parseInboundMessages(payload) {
  const out = []
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value || {}
      const phoneNumberId = v?.metadata?.phone_number_id
      const contacts = v?.contacts || []
      for (const m of v?.messages || []) {
        if (m.type !== 'text') continue
        const contact = contacts.find((c) => c.wa_id === m.from) || contacts[0]
        out.push({
          phoneNumberId,
          from: m.from, // customer's WhatsApp number (wa_id)
          name: contact?.profile?.name || m.from,
          text: m.text?.body || '',
          messageId: m.id,
        })
      }
    }
  }
  return out
}
