import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/Avatar'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPatch, apiPostAuth } from '../../lib/api'

const CH_ICON = {
  whatsapp: ['wa', 'message-circle'],
  instagram: ['ig', 'instagram'],
  voice: ['vc', 'phone-call'],
  web: ['web', 'globe'],
}

/**
 * Admin inbox — conversations across one or all businesses the admin owns.
 * @param {string} [businessId] — filter to one business
 * @param {string} [defaultChannel] — pre-filter channel (whatsapp|instagram|web)
 * @param {boolean} [showBusiness] — show business name in list
 * @param {string} [apiBase] — '/admin' (default) or '/admin' with business in query
 */
export function AdminInbox({ businessId, defaultChannel, showBusiness = true, apiBase = '/admin', compact = false }) {
  const { t } = useAdminT()
  const storageKey = (k) => `sts_admin_inbox_${businessId || 'all'}_${k}`
  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(() => {
    try { return sessionStorage.getItem(storageKey('active')) || null } catch { return null }
  })
  const [filter, setFilter] = useState(() => {
    try { return sessionStorage.getItem(storageKey('filter')) || defaultChannel || 'all' } catch { return defaultChannel || 'all' }
  })
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(() => {
    try { return sessionStorage.getItem(storageKey('draft')) || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(true)
  const [mobileThread, setMobileThread] = useState(false)
  const [memory, setMemory] = useState(null)
  const msgRef = useRef(null)

  const active = convs.find((c) => c.id === activeId)
  const listUrl = useMemo(() => {
    const q = new URLSearchParams()
    if (businessId) q.set('business_id', businessId)
    if (filter !== 'all') q.set('channel', filter)
    const qs = q.toString()
    return `${apiBase}/conversations${qs ? `?${qs}` : ''}`
  }, [apiBase, businessId, filter])

  const list = useMemo(() => {
    const q = search.toLowerCase()
    return convs.filter((c) => {
      const hay = `${c.name || ''} ${c.business_name || ''} ${c.prev || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [convs, search])

  useEffect(() => {
    if (defaultChannel) setFilter(defaultChannel)
  }, [defaultChannel])

  useEffect(() => {
    let alive = true
    let first = true
    async function load() {
      try {
        const rows = await apiGet(listUrl)
        if (!alive) return
        setConvs((prev) => {
          const msgsById = Object.fromEntries(prev.map((c) => [c.id, c.msgs]))
          return rows.map((r) => ({ ...r, msgs: msgsById[r.id] }))
        })
        if (first && rows.length) {
          first = false
          const saved = (() => { try { return sessionStorage.getItem(storageKey('active')) } catch { return null } })()
          if (saved && rows.some((r) => r.id === saved)) openConv(saved, rows)
          else openConv(rows[0].id, rows)
        }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false) }
    }
    load()
    const id = setInterval(load, 5000)
    return () => { alive = false; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl])

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [activeId, active?.msgs?.length])

  useEffect(() => {
    if (!activeId) { setMemory(null); return }
    let alive = true
    apiGet(`${apiBase}/conversations/${activeId}/memory`)
      .then((m) => { if (alive) setMemory(m) })
      .catch(() => { if (alive) setMemory(null) })
    return () => { alive = false }
  }, [activeId, apiBase])

  async function openConv(id, source = convs) {
    setActiveId(id)
    try { sessionStorage.setItem(storageKey('active'), id) } catch { /* ignore */ }
    setMobileThread(true)
    const conv = source.find((c) => c.id === id)
    if (conv && !conv.msgs) {
      try {
        const msgs = await apiGet(`${apiBase}/conversations/${id}/messages`)
        setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, msgs, unread: 0 } : c)))
      } catch {
        setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, msgs: [], unread: 0 } : c)))
      }
    } else {
      setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
    }
  }

  function setMode(id, m) {
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, mode: m } : c)))
    apiPatch(`${apiBase}/conversations/${id}`, { mode: m }).catch(() => {})
  }

  function sendMsg() {
    const text = draft.trim()
    if (!text || !activeId) return
    setConvs((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? { ...c, prev: text, msgs: [...(c.msgs || []), { d: 'out', who: t('you'), t: text }] }
          : c,
      ),
    )
    setDraft('')
    try { sessionStorage.removeItem(storageKey('draft')) } catch { /* ignore */ }
    apiPostAuth(`${apiBase}/conversations/${activeId}/messages`, { body: text, sender: 'human' }).catch(() => {})
  }

  const channelFilters = [
    { f: 'all', label: t('all') },
    { f: 'whatsapp', label: 'WhatsApp' },
    { f: 'instagram', label: 'Instagram' },
    { f: 'web', label: 'Website' },
  ].filter((x) => !defaultChannel || x.f === 'all' || x.f === defaultChannel)

  const ci = (ch) => CH_ICON[ch] || CH_ICON.web

  return (
    <div className={`inbox ${mobileThread ? 'show-thread' : ''} ${compact ? 'inbox-compact' : ''}`}>
      <div className="conv-list">
        <div className="conv-head">
          <input placeholder={t('ix_search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!defaultChannel && (
          <div className="filt">
            {channelFilters.map((f) => (
              <button key={f.f} className={filter === f.f ? 'on' : ''} onClick={() => { setFilter(f.f); try { sessionStorage.setItem(storageKey('filter'), f.f) } catch { /* ignore */ } }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div>
          {list.map((c) => (
            <div key={c.id} className={`conv ${c.id === activeId ? 'on' : ''}`} onClick={() => openConv(c.id)}>
              <span className={`ch ${ci(c.ch)[0]}`}>
                <Icon name={ci(c.ch)[1]} />
              </span>
              <div className="info">
                <b>{c.name}</b>
                {showBusiness && c.business_name && (
                  <div className="biz-tag">{c.business_name}</div>
                )}
                <div className="prev">{c.prev}</div>
              </div>
              <div className="meta">
                {c.time}
                {c.unread ? (
                  <>
                    <br />
                    <span className="unread">{c.unread}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {!loading && list.length === 0 && (
            <div className="inbox-empty">{t('ix_empty')}</div>
          )}
        </div>
      </div>

      <div className="thread">
        <div className="thread-head">
          {active && (
            <>
              <button className="back" onClick={() => setMobileThread(false)} aria-label={t('ix_back')}>
                <Icon name="arrow-left" size={18} />
              </button>
              <span className={`ch ${ci(active.ch)[0]}`}>
                <Icon name={ci(active.ch)[1]} />
              </span>
              <div>
                <b style={{ fontSize: 14 }}>{active.name}</b>
                <div style={{ fontSize: 11.5, color: 'var(--mut)' }}>{active.phone}</div>
              </div>
              <div className="st">
                <div className="mode">
                  <button className={active.mode === 'ai' ? 'on' : ''} onClick={() => setMode(active.id, 'ai')}>AI</button>
                  <button className={active.mode === 'human' ? 'on' : ''} onClick={() => setMode(active.id, 'human')}>
                    {t('human')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="msgs" ref={msgRef}>
          {(active?.msgs || []).map((m, i) => (
            <div key={i} className={`bub ${m.d}`}>
              <span className="who">{m.who}</span>
              {m.t}
            </div>
          ))}
        </div>
        <div className="composer">
          <input
            placeholder={t('ix_type')}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); try { sessionStorage.setItem(storageKey('draft'), e.target.value) } catch { /* ignore */ } }}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />
          <button className="btn btn-g" onClick={sendMsg}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>

      <div className="cust">
        {active && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Avatar name={active.name} size={64} />
            </div>
            <h4>{active.name}</h4>
            <div className="tagline">{active.phone}</div>
            {showBusiness && active.business_name && (
              <div className="kv"><span>{t('th_biz')}</span><span>{active.business_name}</span></div>
            )}
            <div className="kv"><span>{t('ix_channel')}</span><span style={{ textTransform: 'capitalize' }}>{active.ch}</span></div>
            <div className="kv"><span>{t('ix_since')}</span><span>{active.since}</span></div>
            <div className="kv"><span>{t('ix_mode')}</span><span>{active.mode === 'ai' ? t('mode_ai') : t('human')}</span></div>
            <div className="kv" style={{ marginTop: 14, borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
              <span style={{ fontWeight: 700 }}>{t('ix_memory')}</span>
            </div>
            {memory?.message_count > 0 && (
              <>
                <div className="kv"><span>{t('ix_interactions')}</span><span>{memory.message_count}</span></div>
                {memory.last_seen && (
                  <div className="kv"><span>{t('ix_last_seen')}</span><span>{new Date(memory.last_seen).toLocaleDateString()}</span></div>
                )}
              </>
            )}
            <p style={{ fontSize: 12, color: 'var(--mut)', lineHeight: 1.5, marginTop: 8 }}>
              {memory?.summary || t('ix_no_memory')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
