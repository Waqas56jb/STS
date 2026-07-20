import { site } from '../data/site'

/**
 * Build a wa.me deep link with a pre-filled message.
 * @param {string} [message] Falls back to the site default.
 */
export function whatsappLink(message = site.defaultWhatsappMessage) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`
}

/**
 * Compose the "request access" message sent through WhatsApp.
 * Nothing is transmitted from the page itself — this only pre-fills
 * WhatsApp, and the user still has to press send.
 */
export function buildRequestMessage({
  businessName,
  contactName,
  email,
  whatsapp,
  need,
  message,
}) {
  const lines = [
    "Hi STS, I'd like to request access.",
    '',
    `Business: ${businessName}`,
    `Name: ${contactName}`,
    `Email: ${email}`,
    `WhatsApp: ${whatsapp}`,
    `Interested in: ${need}`,
  ]

  if (message?.trim()) {
    lines.push('', `Details: ${message.trim()}`)
  }

  return lines.join('\n')
}

/**
 * Open a WhatsApp chat in a new tab.
 * `noopener` prevents the opened tab from reaching back via window.opener.
 */
export function openWhatsApp(message) {
  window.open(whatsappLink(message), '_blank', 'noopener,noreferrer')
}
