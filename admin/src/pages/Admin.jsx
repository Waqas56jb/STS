import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useLang } from '../i18n/LangContext'
import { useAdminT } from '../i18n/admin'
import { API, apiGet, clearSession } from '../lib/api'
import { ToastProvider, useToast } from './ui'
import { demoRequests, demoUsers, planOptions } from '../data/adminDemo'
import {
  Overview, Requests, Users, Payments, Invoices, Plans, Analytics, Settings,
} from './admin/Views'

const LOGO = import.meta.env.BASE_URL + 'image.png'

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
  const [requests, setRequests] = useState(demoRequests)
  const [users, setUsers] = useState(demoUsers)
  const [modalOpen, setModalOpen] = useState(false)
  const formRef = useRef(null)

  // Boot: try the live admin API, fall back to demo (matches admin.html).
  useEffect(() => {
    const token = localStorage.getItem('sts_token')
    if (!token) return
    ;(async () => {
      try {
        const [rq, ru] = await Promise.all([
          apiGet('/admin/requests').catch(() => null),
          apiGet('/admin/businesses').catch(() => null),
        ])
        if (Array.isArray(rq) && rq.length) setRequests(rq)
        if (Array.isArray(ru) && ru.length) setUsers(ru)
      } catch {
        /* demo mode */
      }
    })()
  }, [])

  const done = () => toast(isAr ? 'تم ✓' : 'Done ✓')

  function go(v) {
    setView(v)
    setSideOpen(false)
  }

  function openAdd() {
    setModalOpen(true)
  }

  function approveReq(id) {
    const r = requests.find((x) => x.id === id)
    setModalOpen(true)
    // Prefill the add-business form on the next tick, once the modal exists.
    requestAnimationFrame(() => {
      const f = formRef.current
      if (f && r) {
        f.business_name.value = r.business_name
        f.owner_name.value = r.contact_name
        f.email.value = r.email
        f.whatsapp.value = r.whatsapp
      }
    })
    const token = localStorage.getItem('sts_token')
    fetch(`${API}/admin/requests/${id}/approve`, { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {})
    setRequests((rs) => rs.filter((x) => x.id !== id))
  }

  function rejectReq(id) {
    const token = localStorage.getItem('sts_token')
    fetch(`${API}/admin/requests/${id}/reject`, { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {})
    setRequests((rs) => rs.filter((x) => x.id !== id))
    done()
  }

  function toggleSuspend(id) {
    setUsers((us) =>
      us.map((u) => {
        if (u.id !== id) return u
        const status = u.status === 'suspended' ? 'paid' : 'suspended'
        const token = localStorage.getItem('sts_token')
        fetch(`${API}/admin/businesses/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ status }),
        }).catch(() => {})
        return { ...u, status }
      }),
    )
    done()
  }

  function createBiz(e) {
    e.preventDefault()
    const f = e.target
    const data = Object.fromEntries(new FormData(f))
    const token = localStorage.getItem('sts_token')
    fetch(API + '/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(data),
    }).catch(() => {})

    const label = f.plan_code.selectedOptions[0].text
    setUsers((us) => [
      {
        id: Date.now(),
        biz: data.business_name,
        email: data.email,
        plan: label.split(' — ')[0],
        mrr: parseFloat(label.split('— ')[1]) || 0,
        ch: ['wa'],
        status: data.plan_code === 'free' ? 'free' : 'paid',
      },
      ...us,
    ])
    setModalOpen(false)
    done()
    f.reset()
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
      case 'users': return <Users users={users} onToggle={toggleSuspend} />
      case 'payments': return <Payments />
      case 'invoices': return <Invoices />
      case 'plans': return <Plans />
      case 'analytics': return <Analytics />
      case 'settings': return <Settings />
      default: return <Overview />
    }
  }

  return (
    <div className="admin">
      <div className="app">
        <div className={`side-overlay ${sideOpen ? 'on' : ''}`} onClick={() => setSideOpen(false)} />

        {/* ============ SIDEBAR ============ */}
        <aside className={sideOpen ? 'open' : ''}>
          <div className="logo"><span className="logo-mark"><img src={LOGO} alt="STS" /></span>STS</div>
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
