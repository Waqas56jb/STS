import WebSocket from 'ws'
import { pool, one, many } from '../db.js'
import { resolveOpenAIKey } from './ai.js'

/**
 * Voice agent = Twilio phone line ⇄ OpenAI Realtime API (speech-to-speech).
 *
 * Twilio streams the caller's audio (G.711 μ-law 8kHz) over a WebSocket
 * (Media Streams). We relay it to OpenAI's Realtime API, which does STT + LLM
 * + TTS in one pipeline (multilingual, low-latency, interruptible), and relay
 * its audio back to Twilio. Transcripts are captured per turn and saved to
 * sts_call_logs. Only OpenAI is used — no other STT/TTS provider.
 *
 * NOTE: this needs a persistent WebSocket host (Render/Railway/VPS) — it will
 * NOT run on Vercel serverless.
 */
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17'
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`
const VOICE = process.env.OPENAI_REALTIME_VOICE || 'alloy'
const SUMMARY_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const LANG_NAME = {
  ar: 'Arabic', en: 'English', hi: 'Hindi', ur: 'Urdu', fr: 'French',
  es: 'Spanish', tr: 'Turkish', fa: 'Persian', tl: 'Tagalog',
}
const TONE = {
  friendly: 'friendly, warm and natural', professional: 'professional and concise',
  playful: 'upbeat and casual',
}

/* ---------------- Twilio REST + TwiML helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))

/** TwiML that opens a Media Stream to our bridge, passing call context. */
export function twimlStream(wsUrl, params = {}) {
  const tags = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<Parameter name="${esc(k)}" value="${esc(v)}"/>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${esc(wsUrl)}">${tags}</Stream></Connect></Response>`
}

/** Place an outbound call via Twilio REST (no SDK needed). */
export async function twilioCreateCall({ accountSid, authToken, from, to, twimlUrl, statusCallback }) {
  const body = new URLSearchParams({ To: to, From: from, Url: twimlUrl })
  if (statusCallback) {
    body.set('StatusCallback', statusCallback)
    body.append('StatusCallbackEvent', 'initiated')
    body.append('StatusCallbackEvent', 'ringing')
    body.append('StatusCallbackEvent', 'answered')
    body.append('StatusCallbackEvent', 'completed')
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Twilio call failed (${res.status})`)
  return data // { sid, status, ... }
}

/* ---------------- system prompt (KB + tone + language) ---------------- */
async function buildInstructions(businessId, direction) {
  const [biz, bot, kb] = await Promise.all([
    one(`select name from sts_businesses where id=$1`, [businessId]),
    one(`select greeting, tone, language from sts_bot_settings where business_id=$1 and channel='voice'`, [businessId]),
    many(`select title, content, source_url from sts_knowledge_sources where business_id=$1 and status='trained' order by created_at desc limit 40`, [businessId]),
  ])
  const name = biz?.name || 'this business'
  const tone = TONE[bot?.tone] || TONE.friendly
  const lang = (bot?.language || 'auto').toLowerCase()

  let languageRule
  if (lang && lang !== 'auto') {
    const ln = LANG_NAME[lang] || lang
    languageRule = `Speak ONLY in ${ln} for the entire call. Do not switch to any other language even if the caller uses one.`
  } else {
    languageRule = `Start in English. Greet the caller, then ask which language they prefer. From then on speak ENTIRELY in the caller's language, matching whatever language they speak (Arabic, English, Hindi, Urdu, etc.).`
  }

  const kbText = kb.length
    ? kb.map((k, i) => `(${i + 1}) ${k.title}${k.content ? ` — ${k.content}` : ''}${k.source_url ? ` [${k.source_url}]` : ''}`).join('\n')
    : '(no knowledge base entries yet)'

  const purpose = direction === 'outbound'
    ? `This is an OUTBOUND call you are placing on behalf of the business. When the person answers, greet them, introduce yourself as ${name}'s assistant, and carry out the purpose below.`
    : `This is an INBOUND call from a customer to ${name}. Answer their questions and help them.`

  return [
    `You are a real-time voice assistant for "${name}". Speak naturally and briefly, like a human on a phone call — short sentences, no lists, no markdown.`,
    `Be ${tone}.`,
    languageRule,
    purpose,
    bot?.greeting ? `Opening line / purpose: ${bot.greeting}` : '',
    `Answer using ONLY the business knowledge below. If something isn't covered, say you'll have a team member follow up — never invent prices, availability, or policies.`,
    '',
    'BUSINESS KNOWLEDGE:',
    kbText,
  ].filter(Boolean).join('\n')
}

/* ---------------- the bridge ---------------- */
export function attachVoiceBridge(twilioWs, defaultPublicWsUrl) {
  let streamSid = null
  let callSid = null
  let businessId = null
  let direction = 'inbound'
  let fromNum = null
  let toNum = null
  let openaiWs = null
  let closed = false
  const turns = []
  const startedAt = new Date()

  const sendTwilio = (obj) => { if (twilioWs.readyState === WebSocket.OPEN) twilioWs.send(JSON.stringify(obj)) }

  twilioWs.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid
      callSid = msg.start.callSid
      const p = msg.start.customParameters || {}
      businessId = p.businessId || null
      direction = p.direction || 'inbound'
      fromNum = p.from || null
      toNum = p.to || null
      await openOpenAI()
    } else if (msg.event === 'media') {
      if (openaiWs?.readyState === WebSocket.OPEN) {
        openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.media.payload }))
      }
    } else if (msg.event === 'stop') {
      finish()
    }
  })
  twilioWs.on('close', finish)
  twilioWs.on('error', () => finish())

  async function openOpenAI() {
    const apiKey = await resolveOpenAIKey()
    if (!apiKey || !businessId) { twilioWs.close(); return }
    const instructions = await buildInstructions(businessId, direction)
    openaiWs = new WebSocket(REALTIME_URL, {
      headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Beta': 'realtime=v1' },
    })
    openaiWs.on('open', () => {
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          instructions,
          voice: VOICE,
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 500, prefix_padding_ms: 300 },
        },
      }))
      // agent speaks first (greeting) — for both inbound and outbound
      openaiWs.send(JSON.stringify({ type: 'response.create' }))
    })
    openaiWs.on('message', (data) => {
      let ev
      try { ev = JSON.parse(data.toString()) } catch { return }
      handleOpenAI(ev)
    })
    openaiWs.on('error', (e) => console.error('OpenAI RT error:', e.message))
    openaiWs.on('close', () => {})
  }

  function handleOpenAI(ev) {
    switch (ev.type) {
      case 'response.audio.delta':
        if (streamSid && ev.delta) sendTwilio({ event: 'media', streamSid, media: { payload: ev.delta } })
        break
      case 'input_audio_buffer.speech_started':
        // barge-in: stop the agent's current audio on Twilio + cancel the response
        if (streamSid) sendTwilio({ event: 'clear', streamSid })
        if (openaiWs?.readyState === WebSocket.OPEN) openaiWs.send(JSON.stringify({ type: 'response.cancel' }))
        break
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript?.trim()) turns.push({ role: 'user', text: ev.transcript.trim(), at: new Date().toISOString() })
        break
      case 'response.audio_transcript.done':
        if (ev.transcript?.trim()) turns.push({ role: 'agent', text: ev.transcript.trim(), at: new Date().toISOString() })
        break
      case 'error':
        console.error('OpenAI RT event error:', JSON.stringify(ev.error || ev))
        break
    }
  }

  async function finish() {
    if (closed) return
    closed = true
    try { if (openaiWs?.readyState === WebSocket.OPEN) openaiWs.close() } catch { /* ignore */ }
    try { if (twilioWs.readyState === WebSocket.OPEN) twilioWs.close() } catch { /* ignore */ }
    if (!businessId || !callSid) return
    const durationSec = Math.round((Date.now() - startedAt.getTime()) / 1000)
    const text = turns.map((t) => `${t.role === 'user' ? 'Caller' : 'Agent'}: ${t.text}`).join('\n')
    const summary = await summarize(text).catch(() => null)
    try {
      await pool.query(
        `insert into sts_call_logs (business_id, caller, direction, from_number, to_number, status,
             provider_call_sid, transcript, transcript_json, summary, duration_sec, started_at, ended_at)
         values ($1,$2,$3,$4,$5,'completed',$6,$7,$8,$9,$10,$11, now())
         on conflict (provider_call_sid) do update set
             transcript=excluded.transcript, transcript_json=excluded.transcript_json,
             summary=excluded.summary, duration_sec=excluded.duration_sec,
             status='completed', ended_at=now()`,
        [businessId, direction === 'inbound' ? fromNum : toNum, direction, fromNum, toNum,
         callSid, text, JSON.stringify(turns), summary, durationSec, startedAt.toISOString()],
      )
    } catch (e) { console.error('save call log:', e.message) }
  }
}

/** Short call summary via a normal chat completion (best-effort). */
async function summarize(transcript) {
  if (!transcript?.trim()) return null
  const key = await resolveOpenAIKey()
  if (!key) return null
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      messages: [
        { role: 'system', content: 'Summarize this phone call in one short sentence (the caller\'s intent + outcome).' },
        { role: 'user', content: transcript.slice(0, 4000) },
      ],
      max_tokens: 60, temperature: 0.3,
    }),
  })
  const d = await res.json().catch(() => ({}))
  return res.ok ? d?.choices?.[0]?.message?.content?.trim() || null : null
}
