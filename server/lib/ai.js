import { one, many } from '../db.js'
import { decryptJSON } from './crypto.js'
import { formatKnowledgeForPrompt } from './kbPrompt.js'

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

/** Widget bot settings are stored as `web`; knowledge UI uses `website`. */
export function botChannel(channel) {
  return channel === 'website' ? 'web' : channel
}

const KB_SCOPE = `channel='all' or channel=$2 or ($2 in ('web','website') and channel in ('web','website'))`

const TONE = {
  friendly: 'friendly, warm and helpful',
  professional: 'professional, precise and concise',
  playful: 'playful, upbeat and casual',
}

/** Resolve the OpenAI API key: env override first, else the platform key. */
export async function resolveOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const row = await one(`select value from sts_settings where key='openai_key'`)
  if (!row?.value) return null
  try { return decryptJSON(row.value)?.v || null } catch { return null }
}

/** Build the grounding system prompt from bot settings + knowledge base. */
function buildSystemPrompt({ businessName, bot, kb }) {
  const tone = TONE[bot?.tone] || TONE.friendly
  const kbText = formatKnowledgeForPrompt(kb)
  return [
    `You are the WhatsApp customer-service assistant for "${businessName || 'this business'}".`,
    `Answer using ONLY the business knowledge below (uploaded documents, training notes, Q&As, and URLs). If the answer isn't there, say you'll connect the customer to a team member — do not guess or invent prices, stock, delivery times or policies.`,
    `Be ${tone}. Reply in the customer's language (Arabic or English, matching their message). Keep replies short and natural for WhatsApp — 1 to 4 short sentences, no markdown.`,
    bot?.greeting ? `Tone/greeting reference: ${bot.greeting}` : '',
    bot?.rules ? `AGENT RULES (always follow):\n${bot.rules}` : '',
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
    one(`select greeting, tone, language, rules from sts_bot_settings where business_id=$1 and channel=$2`, [businessId, botChannel(channel)]),
    // this channel's own knowledge + shared 'all' (+ web/website aliases)
    many(`select title, content, source_url from sts_knowledge_sources where business_id=$1 and status='trained' and (${KB_SCOPE}) order by created_at desc limit 80`, [businessId, channel]),
    resolveOpenAIKey(),
  ])

  const fallback = bot?.greeting || 'Thanks for your message! Our team will get back to you shortly.'
  if (!key) {
    console.error('OpenAI key missing — using greeting fallback')
    return fallback
  }

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
