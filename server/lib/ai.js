import { one, many } from '../db.js'
import { decryptJSON } from './crypto.js'

/**
 * The AI "brain" for the chat agents. Generates a reply grounded in the
 * business's knowledge base + bot settings using OpenAI chat completions.
 *
 * The OpenAI key comes from the platform admin Settings (sts_settings.openai_key,
 * stored encrypted) so the admin manages it centrally; an OPENAI_API_KEY env
 * var overrides it for local dev. With no key configured, the agent falls back
 * to the configured greeting so the WhatsApp plumbing still works end-to-end.
 */
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const TONE = {
  friendly: 'friendly, warm and helpful',
  professional: 'professional, precise and concise',
  playful: 'playful, upbeat and casual',
}

/** Resolve the OpenAI API key: env override first, else the platform key. */
async function resolveOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const row = await one(`select value from sts_settings where key='openai_key'`)
  if (!row?.value) return null
  try { return decryptJSON(row.value)?.v || null } catch { return null }
}

/** Build the grounding system prompt from bot settings + knowledge base. */
function buildSystemPrompt({ businessName, bot, kb }) {
  const tone = TONE[bot?.tone] || TONE.friendly
  const kbText = kb.length
    ? kb.map((k, i) => `(${i + 1}) ${k.title}${k.content ? ` — ${k.content}` : ''}${k.source_url ? ` [${k.source_url}]` : ''}`).join('\n')
    : '(no knowledge base entries yet)'
  return [
    `You are the WhatsApp customer-service assistant for "${businessName || 'this business'}".`,
    `Answer using ONLY the business knowledge below. If the answer isn't there, say you'll connect the customer to a team member — do not guess or invent prices, stock, delivery times or policies.`,
    `Be ${tone}. Reply in the customer's language (Arabic or English, matching their message). Keep replies short and natural for WhatsApp — 1 to 4 short sentences, no markdown.`,
    bot?.greeting ? `Tone/greeting reference: ${bot.greeting}` : '',
    '',
    'BUSINESS KNOWLEDGE:',
    kbText,
  ].filter(Boolean).join('\n')
}

/**
 * Generate a reply.
 * @param {string} businessId
 * @param {string} businessName
 * @param {string} channel        - 'whatsapp' | 'instagram' | ...
 * @param {string} userText       - the incoming customer message
 * @param {Array}  history        - [{ role:'user'|'assistant', content }] prior turns
 */
export async function generateReply({ businessId, businessName, channel = 'whatsapp', userText, history = [] }) {
  const [bot, kb, key] = await Promise.all([
    one(`select greeting, tone, language from sts_bot_settings where business_id=$1 and channel=$2`, [businessId, channel]),
    many(`select title, content, source_url from sts_knowledge_sources where business_id=$1 and status='trained' order by created_at desc limit 40`, [businessId]),
    resolveOpenAIKey(),
  ])

  const fallback = bot?.greeting || 'Thanks for your message! Our team will get back to you shortly.'
  if (!key) return fallback // no LLM configured → safe templated reply

  const messages = [
    { role: 'system', content: buildSystemPrompt({ businessName, bot, kb }) },
    ...history.slice(-6),
    { role: 'user', content: userText },
  ]

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 300 }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('OpenAI error:', data?.error?.message || res.status)
      return fallback
    }
    return data?.choices?.[0]?.message?.content?.trim() || fallback
  } catch (e) {
    console.error('OpenAI request failed:', e.message)
    return fallback
  }
}
