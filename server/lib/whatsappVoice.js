import { resolveOpenAIKey } from './ai.js'

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'
const TTS_URL = 'https://api.openai.com/v1/audio/speech'
const WHISPER_MODEL = 'whisper-1'
const TTS_MODEL = 'tts-1'
const TTS_VOICE = 'alloy'

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

/** Convert reply text to an Ogg Opus buffer suitable for WhatsApp voice notes. */
export async function textToWhatsAppVoice(text) {
  const key = await resolveOpenAIKey()
  if (!key) throw new Error('OpenAI key missing for voice reply')
  const input = String(text || '').trim().slice(0, 4096)
  if (!input) throw new Error('Empty reply for TTS')
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input,
      response_format: 'opus',
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`TTS failed (${res.status}): ${err.slice(0, 200)}`)
  }
  return { buffer: Buffer.from(await res.arrayBuffer()), mimetype: 'audio/ogg; codecs=opus' }
}
