/**
 * Static UI helpers for the admin panel — plan dropdown options, status→badge
 * class map, channel icon map, and interested-plan labels. These are lookups,
 * NOT display data; every table/card gets its rows from the /api/admin/* API.
 */

/** Add-business modal plan dropdown options (value → label). */
export const planOptions = [
  { v: 'wa_starter', l: 'WhatsApp Starter — 20 KWD' },
  { v: 'wa_growth', l: 'WhatsApp Growth — 25 KWD' },
  { v: 'wa_pro', l: 'WhatsApp Pro — 34.90 KWD' },
  { v: 'ig_starter', l: 'Instagram Starter — 20 KWD' },
  { v: 'ig_growth', l: 'Instagram Growth — 32 KWD' },
  { v: 'ig_business', l: 'Instagram Business — 55 KWD' },
  { v: 'voice_starter', l: 'Voice Starter — 39 KWD' },
  { v: 'voice_standard', l: 'Voice Standard — 119 KWD' },
  { v: 'voice_premium', l: 'Voice Premium — 329 KWD' },
  { v: 'social_starter', l: 'Social Starter — 34 KWD' },
  { v: 'social_growth', l: 'Social Growth — 48 KWD' },
  { v: 'social_pro', l: 'Social Pro — 76 KWD' },
  { v: 'complete_starter', l: 'Complete Starter — 65 KWD' },
  { v: 'complete_growth', l: 'Complete Growth — 145 KWD' },
  { v: 'complete_pro', l: 'Complete Pro — 349 KWD' },
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
  instagram: 'Instagram Chatbot',
  voice: 'AI Voice Agent',
  bundle_social: 'Social Bundle',
  bundle_complete: 'Complete Bundle',
}
