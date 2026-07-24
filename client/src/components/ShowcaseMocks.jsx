import { Icon } from './Icon'
import { Avatar } from './Avatar'

/**
 * Self-contained "product screenshot" mock panels for the landing showcase
 * section — replaces the old Unsplash photos so nothing loads from the
 * internet. Each mock matches the caption of its showcase block and is
 * styled with the .mk-* classes (see index.css, .site scope).
 */

function MockInbox() {
  const rows = [
    { ch: 'wa', icon: 'message-circle', name: 'Sara · WhatsApp', prev: 'Is the new collection available?', time: '2m' },
    { ch: 'ig', icon: 'instagram', name: '@khalid.kw · Instagram', prev: 'How much is the premium box?', time: '9m' },
    { ch: 'vc', icon: 'phone-call', name: 'Incoming call · AI Voice', prev: 'Transcript ready · 1:58', time: '32m' },
  ]
  return (
    <div className="mk">
      <div className="mk-head"><b>Unified Inbox</b><span className="live" /></div>
      {rows.map((r) => (
        <div className="mk-row" key={r.name}>
          <span className={`mk-chip ${r.ch}`}><Icon name={r.icon} size={15} /></span>
          <div className="mt"><b>{r.name}</b><span>{r.prev}</span></div>
          <span className="mk-time">{r.time}</span>
        </div>
      ))}
    </div>
  )
}

function MockKnowledge() {
  const docs = [
    { icon: 'file-text', name: 'Price-List-2026.pdf', meta: '42 products', badge: 'Trained' },
    { icon: 'file-text', name: 'Delivery-Policy.docx', meta: 'Areas & fees', badge: 'Trained' },
    { icon: 'globe', name: 'website.com/faq', meta: '18 Q&As', badge: 'Trained' },
  ]
  return (
    <div className="mk">
      <div className="mk-head"><b>Knowledge base</b><span className="mk-badge">Training 82%</span></div>
      {docs.map((d) => (
        <div className="mk-row" key={d.name}>
          <span className="mk-chip doc"><Icon name={d.icon} size={15} /></span>
          <div className="mt"><b>{d.name}</b><span>{d.meta}</span></div>
          <span className="mk-badge">{d.badge}</span>
        </div>
      ))}
      <div className="mk-prog"><i style={{ width: '82%' }} /></div>
    </div>
  )
}

function MockReports() {
  const bars = [42, 68, 55, 84, 60, 92, 74]
  const stats = [
    { v: '8s', l: 'Avg. response' },
    { v: '34%', l: 'Chat → lead' },
    { v: '312', l: 'Conversations' },
  ]
  return (
    <div className="mk">
      <div className="mk-head"><b>Reports · last 7 days</b><span className="live" /></div>
      <div className="mk-bars">
        {bars.map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mk-stats">
        {stats.map((s) => (
          <div key={s.l}><b>{s.v}</b><span>{s.l}</span></div>
        ))}
      </div>
    </div>
  )
}

const MOCKS = { inbox: MockInbox, train: MockKnowledge, reports: MockReports }

export function ShowcaseMock({ kind }) {
  const Cmp = MOCKS[kind] || MockInbox
  return <Cmp />
}

/* Avatar re-exported for convenience if a mock ever needs a face. */
export { Avatar }
