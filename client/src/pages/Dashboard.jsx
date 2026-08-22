import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { T, useLang } from '../i18n/LangContext'

const LOGO = import.meta.env.BASE_URL + 'logo.png'
import { API, clearSession, getUser } from '../lib/api'
import { ToastProvider } from './dashboard/ui'
import { Inbox } from './dashboard/Inbox'
import {
  Overview,
  WhatsAppView,
  InstagramView,
  VoiceView,
  WidgetView,
  KnowledgeView,
  AnalyticsView,
  BillingView,
  SettingsView,
} from './dashboard/Views'

/** Sidebar structure — matches the original nav order and sections. */
const NAV = [
  { v: 'overview', icon: 'layout-dashboard', label: 'n_over' },
  { v: 'inbox', icon: 'inbox', label: 'n_inbox' },
  { section: 'n_agents' },
  { v: 'whatsapp', icon: 'message-circle', label: 'n_wa' },
  { v: 'instagram', icon: 'instagram', label: 'n_ig' },
  { v: 'voice', icon: 'phone-call', label: 'n_vc' },
  { v: 'widget', icon: 'globe', label: 'n_wd' },
  { v: 'knowledge', icon: 'book-open', label: 'n_kb' },
  { section: 'n_biz' },
  { v: 'analytics', icon: 'bar-chart-3', label: 'n_an' },
  { v: 'billing', icon: 'credit-card', label: 'n_bill' },
  { v: 'settings', icon: 'settings', label: 'n_set' },
]

const TITLES = {
  overview: 'n_over', inbox: 'n_inbox', whatsapp: 'n_wa', instagram: 'n_ig',
  voice: 'n_vc', widget: 'n_wd', knowledge: 'n_kb', analytics: 'n_an',
  billing: 'n_bill', settings: 'n_set',
}

function ViewRouter({ view, summary, usage }) {
  switch (view) {
    case 'inbox': return <Inbox />
    case 'whatsapp': return <WhatsAppView />
    case 'instagram': return <InstagramView />
    case 'voice': return <VoiceView />
    case 'widget': return <WidgetView />
    case 'knowledge': return <KnowledgeView />
    case 'analytics': return <AnalyticsView />
    case 'billing': return <BillingView />
    case 'settings': return <SettingsView />
    default: return <Overview summary={summary} usage={usage} />
  }
}

export default function Dashboard() {
  const { t, toggle, isAr } = useLang()
  const navigate = useNavigate()
  const [view, setView] = useState('overview')
  const [sideOpen, setSideOpen] = useState(false)
  const [summary, setSummary] = useState({ conv: 0, ai: 0, leads: 0, by_channel: [], week: [], conversations_total: 0, messages_total: 0 })
  const [usage, setUsage] = useState({})

  const user = getUser()
  const bizName = user.business_name ? `${user.business_name} · ${user.plan || ''}` : ''

  // Boot: verify the session is real, then load summary + usage.
  useEffect(() => {
    const token = localStorage.getItem('sts_token')
    if (!token) { navigate('/'); return }
    // real API only — a missing/invalid/expired token bounces to the landing
    fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => { if (!r.ok) throw new Error('unauthorized') })
      .catch(() => { clearSession(); navigate('/') })
    fetch(API + '/me/summary', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s) return
        setSummary({
          conv: s.conversations_today ?? 0,
          ai: s.ai_resolved ?? 0,
          leads: s.leads ?? 0,
          by_channel: s.by_channel || [],
          week: s.week || [],
          conversations_total: s.conversations_total ?? 0,
          messages_total: s.messages_total ?? 0,
        })
      })
      .catch(() => {})
    fetch(API + '/me/usage', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setUsage(u))
      .catch(() => {})
  }, [])

  function logout() {
    clearSession()
    navigate('/')
  }

  function go(v) {
    setView(v)
    setSideOpen(false)
  }

  return (
    <div className="dash">
      <div className="app">
        {/* backdrop shown behind the mobile drawer */}
        <div className={`side-overlay ${sideOpen ? 'on' : ''}`} onClick={() => setSideOpen(false)} />

        {/* ============ SIDEBAR ============ */}
        <aside className={sideOpen ? 'open' : ''}>
          <div className="logo"><img className="logo-img" src={LOGO} alt="STS" /></div>
          {NAV.map((item, i) =>
            item.section ? (
              <div className="nav-sec" key={'s' + i}>{t(item.section)}</div>
            ) : (
              <button key={item.v} className={`nav-item ${view === item.v ? 'on' : ''}`} onClick={() => go(item.v)}>
                <Icon name={item.icon} />
                <span>{t(item.label)}</span>
              </button>
            ),
          )}
          <div className="side-foot">
            <button className="nav-item" onClick={toggle}><Icon name="languages" /><span>{isAr ? t('lang_switch_from_ar') : t('lang_switch')}</span></button>
            <button className="nav-item" onClick={logout}><Icon name="log-out" /><span><T k="n_out" /></span></button>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <main>
          <div className="topbar">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="burger" onClick={() => setSideOpen((o) => !o)}><Icon name="menu" /></button>
              <div>
                <h1>{t(TITLES[view])}</h1>
                <div className="sub">{bizName}</div>
              </div>
            </div>
            <div className="top-actions">
              <span className="pill"><span className="dot" /><T k="bot_live" /></span>
              <Avatar name={user.business_name || user.name || 'STS'} size={38} variant="solid" />
            </div>
          </div>

          <ViewRouter view={view} summary={summary} usage={usage} />
        </main>
      </div>
    </div>
  )
}

/* Wrap the dashboard in the toast provider so any view can call useToast(). */
export function DashboardPage() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  )
}
