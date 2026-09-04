/**
 * Curated OpenAI TTS voices for WhatsApp voice notes + phone agents.
 * Labels describe accent / character so users can pick before saving.
 */
export const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy', accent: 'Neutral American', gender: 'Neutral', style: 'Clear & balanced — great default' },
  { id: 'ash', label: 'Ash', accent: 'American', gender: 'Male', style: 'Calm, confident' },
  { id: 'ballad', label: 'Ballad', accent: 'American soft', gender: 'Male', style: 'Warm storytelling' },
  { id: 'coral', label: 'Coral', accent: 'American bright', gender: 'Female', style: 'Friendly & upbeat' },
  { id: 'echo', label: 'Echo', accent: 'American warm', gender: 'Male', style: 'Warm, conversational' },
  { id: 'fable', label: 'Fable', accent: 'British', gender: 'Male', style: 'Expressive UK accent' },
  { id: 'nova', label: 'Nova', accent: 'American energetic', gender: 'Female', style: 'Energetic & clear' },
  { id: 'onyx', label: 'Onyx', accent: 'American deep', gender: 'Male', style: 'Deep, authoritative' },
  { id: 'sage', label: 'Sage', accent: 'American calm', gender: 'Female', style: 'Soft, professional' },
  { id: 'shimmer', label: 'Shimmer', accent: 'American soft', gender: 'Female', style: 'Gentle & light' },
  { id: 'verse', label: 'Verse', accent: 'American expressive', gender: 'Male', style: 'Dynamic, engaging' },
]

export const DEFAULT_TTS_VOICE = 'alloy'

/** Voices supported by classic tts-1 (fallback if gpt-4o-mini-tts rejects a voice). */
export const TTS1_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])

export function normalizeTtsVoice(id) {
  const v = String(id || '').toLowerCase().trim()
  if (TTS_VOICES.some((x) => x.id === v)) return v
  return DEFAULT_TTS_VOICE
}

export function listTtsVoices() {
  return TTS_VOICES.map((v) => ({ ...v }))
}

export const PREVIEW_SAMPLE_EN =
  'Hello! Thanks for contacting us. How can I help you today?'
export const PREVIEW_SAMPLE_AR =
  'مرحباً! شكراً لتواصلك معنا. كيف يمكنني مساعدتك اليوم؟'
export const PREVIEW_SAMPLE_BI =
  'Hello! مرحباً. This is how your WhatsApp voice reply will sound.'
