import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useLang } from '../../i18n/LangContext'
import { API } from '../../lib/api'
import { chIcon, demoConvs } from '../../data/demo'

/**
 * Inbox view — a faithful React port of the original vanilla inbox
 * (conversation list + thread + customer panel), including channel
 * filters, search, AI/Human mode toggle and the human-reply composer.
 */
export function Inbox() {
  const { t, lang, isAr } = useLang()
  const [convs, setConvs] = useState(demoConvs)
  const [activeId, setActiveId] = useState(demoConvs[0].id)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  // On phones the inbox is a single pane; opening a conversation slides to
  // the thread, the back button returns to the list.
  const [mobileThread, setMobileThread] = useState(false)
  const msgRef = useRef(null)

  const active = convs.find((c) => c.id === activeId)

  const list = useMemo(() => {
    const q = search.toLowerCase()
    return convs.filter((c) => (filter === 'all' || c.ch === filter) && c.name.toLowerCase().includes(q))
  }, [convs, filter, search])

  // Keep the newest message in view, like the original scrollTop tweak.
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [activeId, active?.msgs.length])

  function openConv(id) {
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
    setActiveId(id)
    setMobileThread(true)
  }

  function setMode(id, m) {
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, mode: m } : c)))
  }

  function sendMsg() {
    const text = draft.trim()
    if (!text) return
    setConvs((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? { ...c, prev: text, msgs: [...c.msgs, { d: 'out', who: isAr ? 'أنت' : 'You', t: text }] }
          : c,
      ),
    )
    setDraft('')
    // Best-effort relay to the API (ignored when offline), as in the original.
    const token = localStorage.getItem('sts_token')
    fetch(`${API}/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ body: text, sender: 'human' }),
    }).catch(() => {})
  }

  const filters = [
    { f: 'all', label: t('f_all') },
    { f: 'whatsapp', label: 'WhatsApp' },
    { f: 'instagram', label: 'Instagram' },
    { f: 'voice', label: t('f_calls') },
    { f: 'web', label: t('f_web') },
  ]

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
              <span className={`ch ${chIcon[c.ch][0]}`}>
                <Icon name={chIcon[c.ch][1]} />
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
              <span className={`ch ${chIcon[active.ch][0]}`}>
                <Icon name={chIcon[active.ch][1]} />
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
          {active?.msgs.map((m, i) => (
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
            <img
              className="avatar"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(active.name)}&background=EAF9F3&color=0A9873&bold=true`}
              alt=""
            />
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
