/**
 * Instagram Messaging API (Meta Graph) — inbound webhooks + outbound DMs.
 * Credentials live in sts_channel_configs (channel 'instagram').
 */
const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

/** Send a plain-text Instagram DM to a customer (PSID). */
export async function sendInstagramText(creds, recipientId, body) {
  const igId = creds?.ig_account_id
  const token = creds?.page_access_token
  if (!igId || !token) throw new Error('Instagram not connected (missing ig_account_id / page_access_token)')
  const res = await fetch(`${GRAPH}/${igId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: String(recipientId) },
      message: { text: String(body).slice(0, 1000) },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Instagram send failed (${res.status})`)
  return data
}

/**
 * Extract inbound text DMs from an Instagram (or Page) messaging webhook.
 * Returns [{ igAccountId, from, text, messageId }].
 */
export function parseInboundInstagramMessages(payload) {
  const out = []
  const obj = payload?.object
  if (obj !== 'instagram' && obj !== 'page') return out

  for (const entry of payload?.entry || []) {
    const igAccountId = entry?.id
    for (const ev of entry?.messaging || []) {
      const text = ev?.message?.text
      if (!text || ev?.message?.is_echo) continue
      out.push({
        igAccountId,
        from: ev?.sender?.id,
        text,
        messageId: ev?.message?.mid || `${ev?.timestamp}-${ev?.sender?.id}`,
      })
    }
  }
  return out
}
