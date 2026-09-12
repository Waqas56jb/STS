import { sendWhatsAppText, sendWhatsAppImage } from './whatsapp.js'
import { resolveWhatsAppProvider } from './channels.js'
import { sendQrText, sendQrVoice, sendQrImage, beginQrPresence, sendQrPresence } from './whatsappQr.js'
import { textToWhatsAppVoice } from './whatsappVoice.js'
import { one } from '../db.js'
import { DEFAULT_TTS_VOICE } from './ttsVoices.js'
import { resolveKnowledgeMediaPath } from './extractText.js'
import { publicBaseUrl } from './publicUrl.js'

/**
 * Provider-agnostic WhatsApp send.
 * Cloud API uses Meta Graph; QR uses the Baileys session for that business.
 * handleInboundWhatsApp and inbox human replies both go through here.
 */
export async function sendWhatsAppByProvider({ provider, businessId, to, text, creds, asVoice = false, voice }) {
  const p = provider || resolveWhatsAppProvider(creds)
  if (p === 'qr' && asVoice) {
    let ttsVoice = voice
    if (!ttsVoice && businessId) {
      const bot = await one(
        `select tts_voice from sts_bot_settings where business_id=$1 and channel='whatsapp'`,
        [businessId],
      ).catch(() => null)
      ttsVoice = bot?.tts_voice || DEFAULT_TTS_VOICE
    }
    await sendQrPresence(businessId, to, 'recording')
    const { buffer, mimetype } = await textToWhatsAppVoice(text, { voice: ttsVoice || DEFAULT_TTS_VOICE })
    await sendQrVoice(businessId, to, buffer, mimetype)
    await sendQrPresence(businessId, to, 'paused')
    return
  }
  if (p === 'qr') {
    await sendQrPresence(businessId, to, 'composing')
    await sendQrText(businessId, to, text)
    await sendQrPresence(businessId, to, 'paused')
    return
  }
  return sendWhatsAppText(creds, to, text)
}

/** Send knowledge-base product images referenced by [[STS_IMAGE:uuid]] markers. */
export async function sendKnowledgeImages({ provider, businessId, to, creds, imageIds = [] }) {
  if (!imageIds.length) return
  const p = provider || resolveWhatsAppProvider(creds)
  for (const id of imageIds) {
    const row = await one(
      `select id, title, content, source_url, type from sts_knowledge_sources
       where id=$1 and business_id=$2 and type='image'`,
      [id, businessId],
    )
    if (!row?.source_url) continue
    const caption = String(row.title || '').slice(0, 1024)
    const abs = resolveKnowledgeMediaPath(row.source_url)
    try {
      if (p === 'qr') {
        if (!abs) {
          console.error('[kb-image] file missing for', id, row.source_url)
          continue
        }
        await sendQrPresence(businessId, to, 'composing')
        await sendQrImage(businessId, to, abs, caption)
        await sendQrPresence(businessId, to, 'paused')
      } else {
        const path = row.source_url.startsWith('/') ? row.source_url : `/${row.source_url}`
        const link = `${publicBaseUrl()}${path}`
        await sendWhatsAppImage(creds, to, { link, caption })
      }
    } catch (e) {
      console.error('[kb-image] send failed:', id, e.message)
    }
  }
}

export { beginQrPresence, sendQrPresence }

export { resolveWhatsAppProvider }
