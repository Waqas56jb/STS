import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/Avatar'
import { useLang } from '../../i18n/LangContext'
import { apiGet, apiPatch, apiPostAuth } from '../../lib/api'
import { chIcon } from '../../data/demo'

/**
 * Inbox — real data. Loads conversations from the API, fetches each
 * thread's messages on open, and posts human replies / mode changes back.
 */
export function Inbox() {
  const { t, lang, isAr } = useLang()
  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileThread, setMobileThread] = useState(false)
  const msgRef = useRef(null)

  const active = convs.find((c) => c.id === activeId)

  const list = useMemo(() => {
    const q = search.toLowerCase()
    return convs.filter((c) => (filter === 'all' || c.ch === filter) && (c.name || '').toLowerCase().includes(q))
  }, [convs, filter, search])

  // Load conversation list; poll so QR inbound threads appear without refresh.
  useEffect(() => {
    let alive = true
    let first = true
    async function load() {
      try {
        const rows = await apiGet('/conversations')
        if (!alive) return
        setConvs((prev) => {
          const msgsById = Object.fromEntries(prev.map((c) => [c.id, c.msgs]))
          return rows.map((r) => ({ ...r, msgs: msgsById[r.id] }))
        })
        if (first && rows.length) {
          first = false
          openConv(rows[0].id, rows)
        }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false) }
    }
    load()
    const t = setInterval(load, 4000)
    return () => { alive = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [activeId, active?.msgs?.length])

  async function openConv(id, source = convs) {
    setActiveId(id)
    setMobileThread(true)
    const conv = source.find((c) => c.id === id)
    // fetch messages if not loaded yet
    if (conv && !conv.msgs) {
      try {
        const msgs = await apiGet(`/conversations/${id}/messages`)
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
    apiPatch(`/conversations/${id}`, { mode: m }).catch(() => {})
  }

  function sendMsg() {
    const text = draft.trim()
    if (!text || !activeId) return
    setConvs((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? { ...c, prev: text, msgs: [...(c.msgs || []), { d: 'out', who: isAr ? 'أنت' : 'You', t: text }] }
          : c,
      ),
    )
    setDraft('')
    apiPostAuth(`/conversations/${activeId}/messages`, { body: text, sender: 'human' }).catch(() => {})
  }

  const filters = [
    { f: 'all', label: t('f_all') },
    { f: 'whatsapp', label: 'WhatsApp' },
    { f: 'instagram', label: 'Instagram' },
    { f: 'voice', label: t('f_calls') },
    { f: 'web', label: t('f_web') },
  ]

  const ci = (ch) => chIcon[ch] || chIcon.web

  return (
    <div className={`inbox ${mobileThread ? 'show-thread' : ''}`}>
      {/* conversation list */}
      <div className="conv-list">
        <div className="conv-head">
          <input placeholder={t('srch')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filt">
          {filters.map((f) => (
            <button key={f.f} className={filter === f.f ? 'on' : ''} onClick={() => setFilter(f.f)}>
              {f.label}
            </button>
          ))}
        </div>
        <div>
          {list.map((c) => (
            <div key={c.id} className={`conv ${c.id === activeId ? 'on' : ''}`} onClick={() => openConv(c.id)}>
              <span className={`ch ${ci(c.ch)[0]}`}>
                <Icon name={ci(c.ch)[1]} />
              </span>
              <div className="info">
                <b>{c.name}</b>
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
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--mut)', fontSize: 13 }}>
              {isAr ? 'لا توجد محادثات بعد' : 'No conversations yet'}
            </div>
          )}
        </div>
      </div>

      {/* thread */}
      <div className="thread">
        <div className="thread-head">
          {active && (
            <>
              <button className="back" onClick={() => setMobileThread(false)} aria-label="Back to conversations">
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
                    {lang === 'ar' ? 'موظف' : 'Human'}
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
            placeholder={t('type_msg')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />
          <button className="btn btn-g" onClick={sendMsg}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>

      {/* customer panel */}
      <div className="cust">
        {active && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Avatar name={active.name} size={64} />
            </div>
            <h4>{active.name}</h4>
            <div className="tagline">{active.phone}</div>
            <div className="kv"><span>{isAr ? 'القناة' : 'Channel'}</span><span style={{ textTransform: 'capitalize' }}>{active.ch}</span></div>
            <div className="kv"><span>{isAr ? 'عميل منذ' : 'Customer since'}</span><span>{active.since}</span></div>
            <div className="kv"><span>{isAr ? 'الطلبات' : 'Orders'}</span><span>{active.orders}</span></div>
            <div className="kv"><span>{isAr ? 'الوضع' : 'Mode'}</span><span>{active.mode === 'ai' ? 'AI' : 'Human'}</span></div>
          </>
        )}
      </div>
    </div>
  )
}
