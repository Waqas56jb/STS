/**
 * Channels shown in admin UI. Backend may still support others;
 * hide Instagram & Voice until those products are live.
 */
export const LIVE_CHANNELS = ['whatsapp']
export const LIVE_TRAINING_AGENTS = ['all', 'whatsapp', 'website']

export function isLiveChannel(ch) {
  return LIVE_CHANNELS.includes(String(ch || '').toLowerCase())
}

export function filterConnectionSpec(spec) {
  if (!spec || typeof spec !== 'object') return spec
  const out = {}
  for (const ch of LIVE_CHANNELS) {
    if (spec[ch]) out[ch] = spec[ch]
  }
  return out
}
