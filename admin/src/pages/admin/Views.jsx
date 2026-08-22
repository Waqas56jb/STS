import { useEffect, useState } from 'react'
import '../../lib/charts'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/Avatar'
import { useAdminT } from '../../i18n/admin'
import { WHATSAPP, apiGet, apiPut } from '../../lib/api'
import { chIco, planLbl, stBadge } from '../../data/adminDemo'
import { useToast } from '../ui'
import {
  RevenueChart, GrowthChart, PlanChart, MessagesChart, ArpuChart, UsageChart,
} from './Charts'
import { InvoiceModal } from './InvoiceModal'

const nfmt = (n) => Number(n || 0).toLocaleString('en')

/* ===================== OVERVIEW ===================== */
export function Overview({ summary = {}, analytics }) {
  const { t } = useAdminT()
  const msgs7 = summary.messages_7d ?? analytics?.totals?.messages
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><span>{t('k_mrr')}</span><Icon name="banknote" /></div><div className="val">{nfmt(summary.mrr)} <small style={{ fontSize: 14 }}>KWD</small></div><div className="trend">{t('vs_lm')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_paid')}</span><Icon name="crown" /></div><div className="val">{summary.paid ?? 0}</div><div className="trend">{t('this_mo')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_free')}</span><Icon name="user" /></div><div className="val">{summary.free ?? 0}</div><div className="trend">{t('k_conv')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_due')}</span><Icon name="alert-triangle" /></div><div className="val">{summary.overdue ?? 0}</div><div className="trend bad">{nfmt(summary.overdue_amount)} KWD {t('pending')}</div></div>
      </div>
      {analytics?.arpu != null && (
        <div className="grid g3" style={{ marginBottom: 18 }}>
          <div className="card stat"><div className="lbl"><span>{t('an_arpu_val')}</span><Icon name="trending-up" /></div><div className="val">{nfmt(analytics.arpu)} <small style={{ fontSize: 14 }}>KWD</small></div></div>
          <div className="card stat"><div className="lbl"><span>{t('k_msgs_7d')}</span><Icon name="activity" /></div><div className="val">{nfmt(msgs7)}</div></div>
          <div className="card stat"><div className="lbl"><span>{t('k_collected')}</span><Icon name="check-circle-2" /></div><div className="val">{nfmt(summary.payment_stats?.collected_month)} <small style={{ fontSize: 14 }}>KWD</small></div><div className="trend">{t('p_col')}</div></div>
        </div>
      )}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><span>{t('ch_rev')}</span></h3><div className="chart-box"><RevenueChart data={analytics?.revenue_monthly} /></div></div>
        <div className="card"><h3><Icon name="users" /><span>{t('ch_growth')}</span></h3><div className="chart-box"><GrowthChart data={analytics?.growth_monthly} /></div></div>
      </div>
      <div className="grid g2">
        <div className="card"><h3><Icon name="pie-chart" /><span>{t('ch_plan')}</span></h3><div className="chart-box"><PlanChart data={analytics?.by_plan} /></div></div>
        <div className="card"><h3><Icon name="activity" /><span>{t('ch_msg')}</span></h3><div className="chart-box"><MessagesChart data={analytics?.messages_daily} /></div></div>
      </div>
    </>
  )
}

/* ===================== ACCESS REQUESTS ===================== */
export function Requests({ requests, onApprove, onReject }) {
  const { t } = useAdminT()
  return (
    <div className="card">
      <h3><Icon name="user-plus" /><span>{t('rq_new')}</span></h3>
      {requests.length ? (
        requests.map((r) => (
          <div className="req-card" key={r.id}>
            <div className="rh">
              <div><b>{r.business_name}</b><div className="meta">{r.contact_name} · {r.email} · {r.whatsapp}</div></div>
              <span className="badge b-info">{planLbl[r.interested_plan] || r.interested_plan}</span>
            </div>
            <p>&quot;{r.message}&quot;</p>
            <div className="rh">
              <span className="meta">{r.created}</span>
              <div className="acts">
                <a className="btn btn-o" style={{ padding: '7px 13px' }} href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Icon name="message-circle" size={14} />{t('wa_reply')}
                </a>
                <button className="btn btn-r" style={{ padding: '7px 13px' }} onClick={() => onReject(r.id)}>{t('reject')}</button>
                <button className="btn btn-g" style={{ padding: '7px 13px' }} onClick={() => onApprove(r.id)}>
                  <Icon name="user-check" size={14} />{t('approve')}
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--mut)', padding: 40 }}>{t('no_requests')}</div>
      )}
    </div>
  )
}

/* ===================== USERS ===================== */
export function Users({ users, onToggle, onConnections, onCredentials }) {
  const { t } = useAdminT()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const rows = users.filter(
    (u) => (filter === 'all' || u.status === filter) && u.biz.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder={t('srch_u')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t('f_all')}</option>
          <option value="paid">{t('paid')}</option>
          <option value="free">{t('free')}</option>
          <option value="suspended">{t('susp')}</option>
        </select>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>{t('th_biz')}</th><th>{t('th_plan')}</th><th>{t('th_ch')}</th><th>{t('th_mrr')}</th><th>{t('th_st')}</th><th>{t('th_act')}</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="uc">
                    <Avatar name={u.biz} size={32} className="avatar-s" />
                    <div><b>{u.biz}</b><span>{u.email}</span></div>
                  </div>
                </td>
                <td>{u.plan}</td>
                <td>
                  {u.ch.map((c) => (
                    <Icon key={c} name={chIco[c][1]} style={{ width: 15, color: chIco[c][0], marginInlineEnd: 5, display: 'inline' }} />
                  ))}
                </td>
                <td><b>{u.mrr} KWD</b></td>
                <td><span className={`badge ${stBadge(u.status)}`}>{t(u.status === 'suspended' ? 'susp' : u.status).toUpperCase()}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-conn" style={{ padding: '6px 11px' }} onClick={() => onConnections?.(u)} title={t('connections')}>
                    <Icon name="plug-zap" size={14} />
                  </button>
                  <button className="btn btn-o" style={{ padding: '6px 11px' }} onClick={() => onCredentials?.(u)} title={t('credentials')}>
                    <Icon name="key-round" size={14} />
                  </button>
                  <button className={`btn ${u.status === 'suspended' ? 'btn-g' : 'btn-r'}`} style={{ padding: '6px 11px' }} onClick={() => onToggle(u.id)} title={u.status === 'suspended' ? t('activate') : t('suspend')}>
                    <Icon name={u.status === 'suspended' ? 'play' : 'pause'} size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ===================== PAYMENTS ===================== */
const amtNum = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0

export function Payments({ paymentStats }) {
  const { t } = useAdminT()
  const [pays, setPays] = useState([])
  const [stats, setStats] = useState(paymentStats || null)

  const load = () => {
    apiGet('/admin/payments').then(setPays).catch(() => {})
    if (!paymentStats) {
      apiGet('/admin/summary').then((s) => s?.payment_stats && setStats(s.payment_stats)).catch(() => {})
    }
  }
  useEffect(() => { load() }, [paymentStats])
  useEffect(() => { if (paymentStats) setStats(paymentStats) }, [paymentStats])

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const sum = (st, monthOnly = false) => pays.filter((p) => {
    if (p.st !== st) return false
    if (!monthOnly) return true
    const d = new Date(p.date)
    return !Number.isNaN(d.getTime()) && d >= monthStart
  }).reduce((n, p) => n + amtNum(p.amt), 0).toFixed(2)

  const collected = stats?.collected_month != null ? Number(stats.collected_month).toFixed(2) : sum('paid', true)
  const pending = stats?.pending != null ? Number(stats.pending).toFixed(2) : sum('pending')
  const failed = stats?.failed != null ? Number(stats.failed).toFixed(2) : sum('failed')
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><span>{t('p_col')}</span><Icon name="check-circle-2" /></div><div className="val">{collected} <small style={{ fontSize: 14 }}>KWD</small></div></div>
        <div className="card stat"><div className="lbl"><span>{t('p_pending')}</span><Icon name="clock" /></div><div className="val">{pending} <small style={{ fontSize: 14 }}>KWD</small></div></div>
        <div className="card stat"><div className="lbl"><span>{t('p_fail')}</span><Icon name="x-circle" /></div><div className="val">{failed} <small style={{ fontSize: 14 }}>KWD</small></div></div>
      </div>
      <div className="card">
        <h3><Icon name="credit-card" /><span>{t('p_recent')}</span></h3>
        <div className="tbl">
          <table>
            <thead><tr><th>{t('th_ref')}</th><th>{t('th_biz')}</th><th>{t('th_meth')}</th><th>{t('th_amt')}</th><th>{t('th_date')}</th><th>{t('th_st')}</th></tr></thead>
            <tbody>
              {pays.map((p) => (
                <tr key={p.ref}>
                  <td><b>{p.ref}</b></td><td>{p.biz}</td><td>{p.meth}</td><td><b>{p.amt}</b></td><td>{p.date}</td>
                  <td><span className={`badge ${stBadge(p.st)}`}>{p.st.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ===================== INVOICES ===================== */
export function Invoices() {
  const { t } = useAdminT()
  const [invs, setInvs] = useState([])
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [viewKey, setViewKey] = useState(null)
  useEffect(() => { apiGet('/admin/invoices').then(setInvs).catch(() => {}) }, [])
  const rows = invs.filter((i) => (f === 'all' || i.st === f) && (i.no + i.biz).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input placeholder={t('srch_i')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={f} onChange={(e) => setF(e.target.value)}>
            <option value="all">{t('f_all')}</option><option value="paid">{t('paid')}</option><option value="unpaid">{t('unpaid')}</option><option value="overdue">{t('overdue')}</option>
          </select>
        </div>
        <div className="tbl">
          <table>
            <thead><tr><th>{t('th_no')}</th><th>{t('th_biz')}</th><th>{t('th_desc')}</th><th>{t('th_amt')}</th><th>{t('th_due')}</th><th>{t('th_st')}</th><th /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id || i.no}>
                  <td><b>{i.no}</b></td><td>{i.biz}</td><td>{i.desc}</td><td><b>{i.amt}</b></td><td>{i.due}</td>
                  <td><span className={`badge ${stBadge(i.st)}`}>{i.st.toUpperCase()}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-o"
                      style={{ padding: '6px 11px' }}
                      title={t('inv_view')}
                      onClick={() => setViewKey(i.id || i.no)}
                    >
                      <Icon name="file-text" size={14} />
                    </button>
                    <button
                      className="btn btn-g"
                      style={{ padding: '6px 11px', marginInlineStart: 6 }}
                      title={t('inv_download')}
                      onClick={() => setViewKey(i.id || i.no)}
                    >
                      <Icon name="download" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div style={{ textAlign: 'center', color: 'var(--mut)', padding: 40, fontSize: 13 }}>{t('inv_empty')}</div>
          )}
        </div>
      </div>
      {viewKey && <InvoiceModal invoiceKey={viewKey} onClose={() => setViewKey(null)} />}
    </>
  )
}

/* ===================== PLANS ===================== */
export function Plans() {
  const { t } = useAdminT()
  const toast = useToast()
  const [plans, setPlans] = useState([])
  useEffect(() => { apiGet('/admin/plans').then(setPlans).catch(() => {}) }, [])
  return (
    <div className="card">
      <h3><Icon name="package" /><span>{t('pl_h')}</span></h3>
      <div className="tbl">
        <table>
          <thead><tr><th>{t('th_plan')}</th><th>{t('th_cat')}</th><th>{t('th_quota')}</th><th>{t('th_price')}</th><th>{t('th_subs')}</th><th /></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.name}>
                <td><b>{p.name}</b></td><td>{p.cat}</td><td>{p.quota}</td><td><b>{p.price} KWD</b></td><td>{p.subs}</td>
                <td><button className="btn btn-o" style={{ padding: '6px 12px' }} onClick={() => toast()}><Icon name="pencil" size={13} />{t('edit')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ===================== ANALYTICS ===================== */
export function Analytics({ analytics: passed }) {
  const { t } = useAdminT()
  const [self, setSelf] = useState(null)
  const [loading, setLoading] = useState(!passed)

  const fetchData = () => {
    setLoading(true)
    apiGet('/admin/analytics')
      .then(setSelf)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (passed) { setSelf(null); setLoading(false); return undefined }
    fetchData()
    const id = setInterval(fetchData, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed])

  const a = passed || self
  const top = a?.top_businesses || []
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><span>{t('an_arpu_val')}</span><Icon name="trending-up" /></div><div className="val">{nfmt(a?.arpu)} <small style={{ fontSize: 14 }}>KWD</small></div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_msgs_7d')}</span><Icon name="activity" /></div><div className="val">{nfmt(a?.totals?.messages)}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_biz')}</span><Icon name="building-2" /></div><div className="val">{a?.totals?.businesses ?? 0}</div></div>
      </div>
      {loading && !a ? (
        <div style={{ textAlign: 'center', color: 'var(--mut)', padding: 40 }}>{t('loading')}</div>
      ) : (
      <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><span>{t('an_arpu')}</span></h3><div className="chart-box"><ArpuChart data={a?.arpu_monthly} /></div></div>
        <div className="card"><h3><Icon name="bar-chart-3" /><span>{t('an_ch')}</span></h3><div className="chart-box"><UsageChart data={a?.usage_by_channel} /></div></div>
      </div>
      <div className="card">
        <h3><Icon name="trophy" /><span>{t('an_top')}</span></h3>
        <div className="tbl">
          <table>
            <thead><tr><th>{t('th_biz')}</th><th>{t('th_msgs')}</th><th>{t('th_min')}</th><th>{t('th_mrr')}</th></tr></thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.biz}><td>{r.biz}</td><td>{Number(r.msgs).toLocaleString('en')}</td><td>{r.voice_min || '—'}</td><td>{r.mrr}</td></tr>
              ))}
            </tbody>
          </table>
          {top.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--mut)', padding: 24, fontSize: 13 }}>
              {t('no_data')}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </>
  )
}
