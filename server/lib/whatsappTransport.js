import { sendWhatsAppText } from './whatsapp.js'
import { resolveWhatsAppProvider } from './channels.js'
import { sendQrText } from './whatsappQr.js'

/**
 * Provider-agnostic WhatsApp send.
 * Cloud API uses Meta Graph; QR uses the Baileys session for that business.
 * handleInboundWhatsApp and inbox human replies both go through here.
 */
export async function sendWhatsAppByProvider({ provider, businessId, to, text, creds }) {
  const p = provider || resolveWhatsAppProvider(creds)
  if (p === 'qr') return sendQrText(businessId, to, text)
  return sendWhatsAppText(creds, to, text)
}

export { resolveWhatsAppProvider }
