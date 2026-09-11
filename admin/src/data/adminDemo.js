/**
 * Static UI helpers for the admin panel — plan dropdown options, status→badge
 * class map, channel icon map, and interested-plan labels. These are lookups,
 * NOT display data; every table/card gets its rows from the /api/admin/* API.
 */

/** Add-business modal plan dropdown — WhatsApp plans only while other channels are not live. */
export const planOptions = [
  { v: 'wa_starter', l: 'WhatsApp Starter — 14.990 KWD' },
  { v: 'wa_growth', l: 'WhatsApp Growth — 19.990 KWD' },
  { v: 'wa_pro', l: 'WhatsApp Pro — 27.990 KWD' },
  { v: 'free', l: 'Free / Trial — 0 KWD' },
]

/* ---- helpers ---- */
export const stBadge = (s) =>
  ({ paid: 'b-ok', free: 'b-free', suspended: 'b-bad', pending: 'b-warn', failed: 'b-bad', unpaid: 'b-warn', overdue: 'b-bad' }[s] || 'b-info')

export const chIco = {
  wa: ['#25D366', 'message-circle'],
  ig: ['#DD2A7B', 'instagram'],
  vc: ['#5B8DEF', 'phone-call'],
}

export const planLbl = {
  whatsapp: 'WhatsApp Chatbot',
  wa_starter: 'WhatsApp Starter',
  wa_growth: 'WhatsApp Growth',
  wa_pro: 'WhatsApp Pro',
  custom: 'Custom quotation',
}
