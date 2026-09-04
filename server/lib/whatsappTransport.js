import { sendWhatsAppText } from './whatsapp.js'
import { resolveWhatsAppProvider } from './channels.js'
import { sendQrText, sendQrVoice, beginQrPresence, sendQrPresence } from './whatsappQr.js'
import { textToWhatsAppVoice } from './whatsappVoice.js'
import { one } from '../db.js'
import { DEFAULT_TTS_VOICE } from './ttsVoices.js'

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

export { beginQrPresence, sendQrPresence }

export { resolveWhatsAppProvider }
