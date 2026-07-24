import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { WHATSAPP } from '../../lib/api'
import {
  demoInvs, demoPays, demoPlans, chIco, planLbl, stBadge,
} from '../../data/adminDemo'
import { useToast } from '../ui'
import {
  RevenueChart, GrowthChart, PlanChart, MessagesChart, ArpuChart, UsageChart,
} from './Charts'

/* ===================== OVERVIEW ===================== */
export function Overview() {
  const { t } = useAdminT()
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><span>{t('k_mrr')}</span><Icon name="banknote" /></div><div className="val">2,847 <small style={{ fontSize: 14 }}>KWD</small></div><div className="trend">▲ 18% {t('vs_lm')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_paid')}</span><Icon name="crown" /></div><div className="val">31</div><div className="trend">▲ 4 {t('this_mo')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_free')}</span><Icon name="user" /></div><div className="val">12</div><div className="trend">{t('k_conv')}</div></div>
        <div className="card stat"><div className="lbl"><span>{t('k_due')}</span><Icon name="alert-triangle" /></div><div className="val">2</div><div className="trend bad">193 KWD {t('pending')}</div></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><span>{t('ch_rev')}</span></h3><div className="chart-box"><RevenueChart /></div></div>
        <div className="card"><h3><Icon name="users" /><span>{t('ch_growth')}</span></h3><div className="chart-box"><GrowthChart /></div></div>
      </div>
      <div className="grid g2">
        <div className="card"><h3><Icon name="pie-chart" /><span>{t('ch_plan')}</span></h3><div className="chart-box"><PlanChart /></div></div>
        <div className="card"><h3><Icon name="activity" /><span>{t('ch_msg')}</span></h3><div className="chart-box"><MessagesChart /></div></div>
      </div>
    </>
  )
}

/* ===================== ACCESS REQUESTS ===================== */
export function Requests({ requests, onApprove, onReject }) {
  const { t, isAr } = useAdminT()
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
        <div style={{ textAlign: 'center', color: 'var(--mut)', padding: 40 }}>{isAr ? 'لا توجد طلبات جديدة 🎉' : 'No new requests 🎉'}</div>
      )}
    </div>
  )
}

/* ===================== USERS ===================== */
export function Users({ users, onToggle }) {
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
                    <img className="avatar-s" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.biz)}&background=EAF9F3&color=0A9873&bold=true`} alt="" />
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
                  <button className="btn btn-o" style={{ padding: '6px 11px' }} title={t('login_as')}><Icon name="log-in" size={14} /></button>
                  <button className="btn btn-o" style={{ padding: '6px 11px' }} title={t('edit')}><Icon name="pencil" size={14} /></button>
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
export function Payments() {
  const { t } = useAdminT()
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><span>{t('p_col')}</span><Icon name="check-circle-2" /></div><div className="val">2,654 <small style={{ fontSize: 14 }}>KWD</small></div></div>
        <div className="card stat"><div className="lbl"><span>{t('p_pending')}</span><Icon name="clock" /></div><div className="val">193 <small style={{ fontSize: 14 }}>KWD</small></div></div>
        <div className="card stat"><div className="lbl"><span>{t('p_fail')}</span><Icon name="x-circle" /></div><div className="val">48 <small style={{ fontSize: 14 }}>KWD</small></div></div>
      </div>
      <div className="card">
        <h3><Icon name="credit-card" /><span>{t('p_recent')}</span></h3>
        <div className="tbl">
          <table>
            <thead><tr><th>{t('th_ref')}</th><th>{t('th_biz')}</th><th>{t('th_meth')}</th><th>{t('th_amt')}</th><th>{t('th_date')}</th><th>{t('th_st')}</th></tr></thead>
            <tbody>
              {demoPays.map((p) => (
                <tr key={p.ref}>
                  <td><b>{p.ref}</b></td><td>{p.biz}</td><td>{p.meth}</td><td><b>{p.amt} KWD</b></td><td>{p.date}</td>
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
  const toast = useToast()
  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder={t('srch_i')} />
        <select><option>{t('f_all')}</option><option>{t('paid')}</option><option>{t('unpaid')}</option><option>{t('overdue')}</option></select>
        <button className="btn btn-p" onClick={() => toast()}><Icon name="plus" size={15} />{t('new_inv')}</button>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>{t('th_no')}</th><th>{t('th_biz')}</th><th>{t('th_desc')}</th><th>{t('th_amt')}</th><th>{t('th_due')}</th><th>{t('th_st')}</th><th /></tr></thead>
          <tbody>
            {demoInvs.map((i) => (
              <tr key={i.no}>
                <td><b>{i.no}</b></td><td>{i.biz}</td><td>{i.desc}</td><td><b>{i.amt} KWD</b></td><td>{i.due}</td>
                <td><span className={`badge ${stBadge(i.st)}`}>{i.st.toUpperCase()}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-o" style={{ padding: '6px 11px' }} title="PDF"><Icon name="download" size={14} /></button>
                  {i.st !== 'paid' && (
                    <button className="btn btn-o" style={{ padding: '6px 11px' }} onClick={() => toast()} title={t('remind')}><Icon name="bell" size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ===================== PLANS ===================== */
export function Plans() {
  const { t } = useAdminT()
  const toast = useToast()
  return (
    <div className="card">
      <h3><Icon name="package" /><span>{t('pl_h')}</span></h3>
      <div className="tbl">
        <table>
          <thead><tr><th>{t('th_plan')}</th><th>{t('th_cat')}</th><th>{t('th_quota')}</th><th>{t('th_price')}</th><th>{t('th_subs')}</th><th /></tr></thead>
          <tbody>
            {demoPlans.map((p) => (
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
export function Analytics() {
  const { t } = useAdminT()
  const top = [
    { biz: 'Al Noor Perfumes', msgs: '5,517', min: '512', ai: '86%', b: 'b-ok', mrr: '145 KWD' },
    { biz: 'Shgardi Auto', msgs: '4,890', min: '804', ai: '91%', b: 'b-ok', mrr: '349 KWD' },
    { biz: 'Dar Al Teeb', msgs: '3,204', min: '—', ai: '88%', b: 'b-ok', mrr: '76 KWD' },
    { biz: 'Kuwait Dental Co.', msgs: '2,911', min: '377', ai: '74%', b: 'b-warn', mrr: '145 KWD' },
  ]
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><span>{t('an_arpu')}</span></h3><div className="chart-box"><ArpuChart /></div></div>
        <div className="card"><h3><Icon name="bar-chart-3" /><span>{t('an_ch')}</span></h3><div className="chart-box"><UsageChart /></div></div>
      </div>
      <div className="card">
        <h3><Icon name="trophy" /><span>{t('an_top')}</span></h3>
        <div className="tbl">
          <table>
            <thead><tr><th>{t('th_biz')}</th><th>{t('th_msgs')}</th><th>{t('th_min')}</th><th>{t('th_ai')}</th><th>{t('th_mrr')}</th></tr></thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.biz}><td>{r.biz}</td><td>{r.msgs}</td><td>{r.min}</td><td><span className={`badge ${r.b}`}>{r.ai}</span></td><td>{r.mrr}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ===================== SETTINGS ===================== */
export function Settings() {
  const { t } = useAdminT()
  const toast = useToast()
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="settings" /><span>{t('se_pl')}</span></h3>
        <div className="field"><label>{t('se_wa')}</label><input defaultValue="+965 0000 0000" /></div>
        <div className="field"><label>{t('se_em')}</label><input defaultValue="sts@shgardiauto.com" /></div>
        <div className="field"><label>{t('se_cur')}</label><select><option>KWD</option><option>USD</option></select></div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} />{t('save')}</button>
      </div>
      <div className="card">
        <h3><Icon name="key-round" /><span>{t('se_keys')}</span></h3>
        <div className="field"><label>Meta App ID</label><input defaultValue="10933•••••••" type="password" /></div>
        <div className="field"><label>OpenAI API Key</label><input defaultValue="sk-•••••••••••" type="password" /></div>
        <div className="field"><label>Twilio SID</label><input defaultValue="AC59•••••••••" type="password" /></div>
        <div className="field"><label>ElevenLabs Key</label><input defaultValue="el_••••••••••" type="password" /></div>
        <button className="btn btn-p" onClick={() => toast()}><Icon name="save" size={16} />{t('save')}</button>
      </div>
    </div>
  )
}
