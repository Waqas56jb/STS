/**
 * Format trained knowledge for the chatbot / voice prompts.
 * Long uploaded files are clipped so the model still sees every recent source.
 */
export function formatKnowledgeForPrompt(kb = [], { maxEach = 8000, maxTotal = 28000 } = {}) {
  if (!kb.length) return '(no knowledge base entries yet)'
  const parts = []
  let used = 0
  for (let i = 0; i < kb.length; i++) {
    const k = kb[i]
    let body = String(k.content || '')
    if (body.length > maxEach) body = body.slice(0, maxEach) + '…'
    const chunk = `(${i + 1}) ${k.title}${body ? ` — ${body}` : ''}${k.source_url ? ` [${k.source_url}]` : ''}`
    if (used + chunk.length > maxTotal) {
      parts.push('(additional trained documents exist but were omitted for length)')
      break
    }
    parts.push(chunk)
    used += chunk.length
  }
  return parts.join('\n')
}
