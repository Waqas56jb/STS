import { resolveOpenAIKey } from './ai.js'
import {
  DEFAULT_TTS_VOICE, TTS1_VOICES, normalizeTtsVoice,
  PREVIEW_SAMPLE_BI,
} from './ttsVoices.js'

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'
const TTS_URL = 'https://api.openai.com/v1/audio/speech'
const WHISPER_MODEL = 'whisper-1'
const TTS_MODEL_PRIMARY = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
const TTS_MODEL_FALLBACK = 'tts-1'

function extForMime(mimeType = '') {
  const m = String(mimeType).toLowerCase()
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a'
  if (m.includes('webm')) return 'webm'
  return 'ogg'
}

/** Transcribe a WhatsApp voice note with OpenAI Whisper. */
export async function transcribeWhatsAppAudio(buffer, mimeType = 'audio/ogg') {
  const key = await resolveOpenAIKey()
  if (!key) throw new Error('OpenAI key missing for voice transcription')
  const ext = extForMime(mimeType)
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/ogg' }), `voice.${ext}`)
  form.append('model', WHISPER_MODEL)
  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Whisper failed (${res.status})`)
  return String(data.text || '').trim()
}

async function synthesize({ text, voice, format, model }) {
  const key = await resolveOpenAIKey()
  if (!key) throw new Error('OpenAI key missing for voice reply')
  const input = String(text || '').trim().slice(0, 4096)
  if (!input) throw new Error('Empty reply for TTS')
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      voice: normalizeTtsVoice(voice),
      input,
      response_format: format,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    const e = new Error(`TTS failed (${res.status}): ${err.slice(0, 200)}`)
    e.status = res.status
    throw e
  }
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Convert reply text to audio.
 * @param {string} text
 * @param {{ voice?: string, format?: 'opus'|'mp3' }} [opts]
 */
export async function textToSpeech(text, { voice = DEFAULT_TTS_VOICE, format = 'opus' } = {}) {
  const v = normalizeTtsVoice(voice)
  const models = TTS1_VOICES.has(v)
    ? [TTS_MODEL_PRIMARY, TTS_MODEL_FALLBACK]
    : [TTS_MODEL_PRIMARY, TTS_MODEL_FALLBACK]
  // Prefer primary; if voice only exists on mini-tts and primary fails, try fallback only for tts-1 voices
  let lastErr
  for (const model of models) {
    if (model === TTS_MODEL_FALLBACK && !TTS1_VOICES.has(v)) continue
    try {
      const buffer = await synthesize({ text, voice: v, format, model })
      const mimetype = format === 'mp3' ? 'audio/mpeg' : 'audio/ogg; codecs=opus'
      return { buffer, mimetype, voice: v, model }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('TTS failed')
}

/** WhatsApp voice note (Ogg Opus). */
export async function textToWhatsAppVoice(text, { voice } = {}) {
  return textToSpeech(text, { voice, format: 'opus' })
}

/** Browser-friendly preview (MP3). */
export async function previewTtsVoice(voice, text) {
  const sample = String(text || '').trim() || PREVIEW_SAMPLE_BI
  return textToSpeech(sample, { voice, format: 'mp3' })
}
