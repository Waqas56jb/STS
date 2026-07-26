import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useLang } from '../i18n/LangContext'
import { useAdminT } from '../i18n/admin'
import { apiGet, apiPostAuth, apiPatch, clearSession } from '../lib/api'
import { ToastProvider, useToast } from './ui'
import { planOptions } from '../data/adminDemo'
import {
  Overview, Requests, Users, Payments, Invoices, Plans, Analytics, Settings,
} from './admin/Views'
import { ConnectionModal } from './admin/ConnectionModal'

const LOGO = import.meta.env.BASE_URL + 'logo.png'

/** Sidebar structure — matches the admin.html order + request-count badge. */
const NAV = [
  { v: 'overview', icon: 'layout-dashboard', label: 'n_over' },
  { v: 'requests', icon: 'user-plus', label: 'n_req', badge: true },
  { v: 'users', icon: 'users', label: 'n_users' },
  { v: 'payments', icon: 'credit-card', label: 'n_pay' },
  { v: 'invoices', icon: 'receipt', label: 'n_inv' },
  { v: 'plans', icon: 'package', label: 'n_plans' },
  { v: 'analytics', icon: 'bar-chart-3', label: 'n_an' },
  { v: 'settings', icon: 'settings', label: 'n_set' },
]

const TITLES = {
  overview: 'n_over', requests: 'n_req', users: 'n_users', payments: 'n_pay',
  invoices: 'n_inv', plans: 'n_plans', analytics: 'n_an', settings: 'n_set',
}

function AdminInner({ onLogout }) {
  const { t, isAr } = useAdminT()
  const { toggle } = useLang()
  const toast = useToast()

  const [view, setView] = useState('overview')
  const [sideOpen, setSideOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState({ mrr: 0, paid: 0, free: 0, overdue: 0, overdue_amount: 0 })
  const [modalOpen, setModalOpen] = useState(false)
  const [connBiz, setConnBiz] = useState(null) // business whose connections modal is open
  const formRef = useRef(null)

  // Load all admin data from the live API.
  async function reload() {
    const [rq, ru, sm] = await Promise.all([
      apiGet('/admin/requests').catch(() => []),
      apiGet('/admin/businesses').catch(() => []),
      apiGet('/admin/summary').catch(() => null),
    ])
    setRequests(Array.isArray(rq) ? rq : [])
    setUsers(Array.isArray(ru) ? ru : [])
    if (sm) setSummary(sm)
  }
  useEffect(() => { reload() }, [])

  const done = () => toast(isAr ? 'تم ✓' : 'Done ✓')

  function go(v) {
    setView(v)
    setSideOpen(false)
  }

  function openAdd() {
    setModalOpen(true)
  }

  async function approveReq(id) {
    const r = requests.find((x) => x.id === id)
    setModalOpen(true)
    requestAnimationFrame(() => {
      const f = formRef.current
      if (f && r) {
        f.business_name.value = r.business_name
        f.owner_name.value = r.contact_name || ''
        f.email.value = r.email
        f.whatsapp.value = r.whatsapp || ''
      }
    })
    await apiPostAuth(`/admin/requests/${id}/approve`, {}).catch(() => {})
    await reload()
  }

  async function rejectReq(id) {
    await apiPostAuth(`/admin/requests/${id}/reject`, {}).catch(() => {})
    await reload()
    done()
  }

  async function toggleSuspend(id) {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const status = u.status === 'suspended' ? 'paid' : 'suspended'
    setUsers((us) => us.map((x) => (x.id === id ? { ...x, status } : x)))
    await apiPatch(`/admin/businesses/${id}`, { status }).catch(() => {})
    await reload()
    done()
  }

  async function createBiz(e) {
    e.preventDefault()
    const f = e.target
    const data = Object.fromEntries(new FormData(f))
    await apiPostAuth('/admin/businesses', data).catch(() => {})
    setModalOpen(false)
    f.reset()
    await reload()
    done()
  }

  function logout() {
    clearSession()
    // return to the admin login screen
    if (onLogout) onLogout()
    else window.location.href = '/'
  }

  function renderView() {
    switch (view) {
      case 'requests': return <Requests requests={requests} onApprove={approveReq} onReject={rejectReq} />
      case 'users': return <Users users={users} onToggle={toggleSuspend} onConnections={setConnBiz} />
      case 'payments': return <Payments />
      case 'invoices': return <Invoices />
      case 'plans': return <Plans />
      case 'analytics': return <Analytics />
      case 'settings': return <Settings />
      default: return <Overview summary={summary} />
    }
  }

  return (
    <div className="admin">
      <div className="app">
        <div className={`side-overlay ${sideOpen ? 'on' : ''}`} onClick={() => setSideOpen(false)} />

        {/* ============ SIDEBAR ============ */}
        <aside className={sideOpen ? 'open' : ''}>
          <div className="logo"><img className="logo-img" src={LOGO} alt="STS" /></div>
          <div className="admin-tag">{t('adm_tag')}</div>
          {NAV.map((item) => (
            <button key={item.v} className={`nav-item ${view === item.v ? 'on' : ''}`} onClick={() => go(item.v)}>
              <Icon name={item.icon} />
              <span>{t(item.label)}</span>
              {item.badge && requests.length > 0 && <span className="cnt">{requests.length}</span>}
            </button>
          ))}
          <div className="side-foot">
            <button className="nav-item" onClick={toggle}><Icon name="languages" /><span>{isAr ? 'English' : 'عربي'}</span></button>
            <button className="nav-item" onClick={logout}><Icon name="log-out" /><span>{t('n_out')}</span></button>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <main>
          <div className="topbar">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="burger" onClick={() => setSideOpen((o) => !o)}><Icon name="menu" /></button>
              <div>
                <h1>{t(TITLES[view])}</h1>
                <div style={{ color: 'var(--mut)', fontSize: 13 }}>{t('adm_sub')}</div>
              </div>
            </div>
            <button className="btn btn-gold" onClick={openAdd}><Icon name="plus" size={16} />{t('add_biz')}</button>
          </div>

          {renderView()}
        </main>
      </div>

      {/* ADD / EDIT BUSINESS MODAL */}
      <div className={`modal ${modalOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal-card">
          <button className="modal-x" onClick={() => setModalOpen(false)}><Icon name="x" /></button>
          <h3 style={{ marginBottom: 4 }}>{t('ad_h')}</h3>
          <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 20 }}>{t('ad_p')}</p>
          <form ref={formRef} onSubmit={createBiz}>
            <div className="field"><label>{t('f_biz')}</label><input required name="business_name" placeholder="Dar Al Teeb" /></div>
            <div className="field"><label>{t('f_owner')}</label><input required name="owner_name" placeholder="Mohammed A." /></div>
            <div className="field"><label>{t('f_email')}</label><input required type="email" name="email" placeholder="owner@business.com" /></div>
            <div className="field"><label>{t('f_wa')}</label><input name="whatsapp" placeholder="+965 5xxx xxxx" /></div>
            <div className="field"><label>{t('th_plan')}</label>
              <select name="plan_code">
                {planOptions.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>{t('f_pass')}</label><input required name="password" defaultValue="Sts@2026!" /></div>
            <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }}><Icon name="user-check" size={16} />{t('ad_btn')}</button>
          </form>
        </div>
      </div>

      {/* CHANNEL CONNECTIONS MODAL */}
      {connBiz && <ConnectionModal business={connBiz} onClose={() => setConnBiz(null)} />}
    </div>
  )
}

export function AdminPage({ onLogout }) {
  return (
    <ToastProvider>
      <AdminInner onLogout={onLogout} />
    </ToastProvider>
  )
}
