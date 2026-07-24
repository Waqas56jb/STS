import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { WHATSAPP } from '../../lib/api'
import { invoices } from '../../data/demo'
import { Switch, useToast } from './ui'
import { WeekChart, ChannelChart, MonthChart, ResolutionChart, LeadsChart } from './Charts'

/* ===================== OVERVIEW ===================== */
export function Overview({ summary }) {
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="lbl"><T k="st_conv" /><Icon name="messages-square" /></div>
          <div className="val">{summary.conv}</div>
          <div className="trend">▲ 12% <T k="vs_yest" /></div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_ai" /><Icon name="bot" /></div>
          <div className="val">{summary.ai}%</div>
          <div className="trend">▲ 4%</div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_leads" /><Icon name="target" /></div>
          <div className="val">{summary.leads}</div>
          <div className="trend">▲ 9%</div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_rt" /><Icon name="timer" /></div>
          <div className="val">2.1s</div>
          <div className="trend"><T k="instant" /></div>
        </div>
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="activity" /><T k="ov_ch1" /></h3><div className="chart-box"><WeekChart /></div></div>
        <div className="card"><h3><Icon name="pie-chart" /><T k="ov_ch2" /></h3><div className="chart-box"><ChannelChart /></div></div>
      </div>
      <div className="grid g3">
        <div className="card">
          <h3><Icon name="message-circle" />WhatsApp</h3>
          <div className="kv"><T k="u_used" /><span><b>3,412</b> / 5,000</span></div>
          <div className="progress"><i style={{ width: '68%' }} /></div>
        </div>
        <div className="card">
          <h3><Icon name="instagram" />Instagram</h3>
          <div className="kv"><T k="u_cont" /><span><b>2,105</b> / 5,000</span></div>
          <div className="progress"><i style={{ width: '42%', background: 'linear-gradient(90deg,var(--igA),var(--igB))' }} /></div>
        </div>
        <div className="card">
          <h3><Icon name="phone-call" /><T k="n_vc" /></h3>
          <div className="kv"><T k="u_min" /><span><b>512</b> / 900</span></div>
          <div className="progress"><i style={{ width: '57%', background: 'var(--vc)' }} /></div>
        </div>
      </div>
    </>
  )
}

/* ===================== WHATSAPP ===================== */
export function WhatsAppView() {
  const toast = useToast()
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="plug-zap" /><T k="wa_conn" /></h3>
        <div className="row">
          <div><b><T k="wa_st" /></b><p><T k="wa_stp" /></p></div>
          <span className="badge b-ok"><T k="connected" /></span>
        </div>
        <div className="field" style={{ marginTop: 14 }}><label><T k="wa_num" /></label><input defaultValue="+965 5000 1234" readOnly /></div>
        <div className="field"><label><T k="wa_disp" /></label><input defaultValue="Al Noor Perfumes" readOnly /></div>
        <div className="field"><label>Phone Number ID</label><input defaultValue="1093345XXXXXXX" readOnly /></div>
        <div className="hint"><T k="wa_note" /></div>
      </div>
      <div className="card">
        <h3><Icon name="bot" /><T k="agent_beh" /></h3>
        <div className="row"><div><b><T k="auto_re" /></b><p><T k="auto_rep" /></p></div><Switch defaultChecked /></div>
        <div className="row"><div><b><T k="handoff" /></b><p><T k="handoffp" /></p></div><Switch defaultChecked /></div>
        <div className="row"><div><b><T k="ooh" /></b><p><T k="oohp" /></p></div><Switch /></div>
        <div className="field" style={{ marginTop: 14 }}><label><T k="greet" /></label>
          <textarea rows="2" defaultValue="Hala! 👋 Welcome to Al Noor Perfumes. I'm your AI assistant — how can I help you today?" />
        </div>
        <div className="field"><label><T k="tone" /></label>
          <SelectI18n options={['tn1', 'tn2', 'tn3']} />
        </div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
    </div>
  )
}

/* ===================== INSTAGRAM ===================== */
export function InstagramView() {
  const kws = [
    { k: 'PRICE', d: 'ig_kw1' },
    { k: 'DELIVERY', d: 'ig_kw2' },
    { k: 'OFFER', d: 'ig_kw3' },
  ]
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="plug-zap" /><T k="ig_conn" /></h3>
        <div className="row">
          <div><b>@alnoor.perfumes</b><p><T k="ig_stp" /></p></div>
          <span className="badge b-ok"><T k="connected" /></span>
        </div>
        <div className="field" style={{ marginTop: 14 }}><label><T k="ig_page" /></label><input defaultValue="Al Noor Perfumes KW" readOnly /></div>
        <div className="row"><div><b><T k="ig_dm" /></b></div><Switch defaultChecked /></div>
        <div className="row"><div><b><T k="ig_story" /></b></div><Switch defaultChecked /></div>
        <div className="row"><div><b><T k="ig_cmt" /></b><p><T k="ig_cmtp" /></p></div><Switch /></div>
      </div>
      <div className="card">
        <h3><Icon name="zap" /><T k="ig_kw" /></h3>
        {kws.map((k) => (
          <div className="kb-item" key={k.k}>
            <div className="ic"><Icon name="hash" /></div>
            <div style={{ flex: 1 }}><b>{k.k}</b><span><T k={k.d} /></span></div>
            <button className="btn btn-o" style={{ padding: '6px 12px' }}><T k="edit" /></button>
          </div>
        ))}
        <button className="btn btn-p"><Icon name="plus" size={16} /><T k="add_kw" /></button>
      </div>
    </div>
  )
}

/* ===================== VOICE ===================== */
export function VoiceView() {
  const toast = useToast()
  const recs = [
    { ic: 'phone-incoming', c: '#E0EAFF', col: '#3730A3', b: '+965 66xx 1122 · 3:42 min', d: 'vc_r1' },
    { ic: 'phone-incoming', c: '#E0EAFF', col: '#3730A3', b: '+965 55xx 7788 · 1:58 min', d: 'vc_r2' },
    { ic: 'phone-outgoing', c: '#FEF3C7', col: '#92400E', b: '+965 99xx 3344 · 4:15 min', d: 'vc_r3' },
  ]
  return (
    <div className="grid g2" style={{ marginBottom: 18 }}>
      <div className="card">
        <h3><Icon name="phone-call" /><T k="vc_cfg" /></h3>
        <div className="row"><div><b><T k="vc_num" /></b><p>+965 2222 8899 · Twilio</p></div><span className="badge b-ok"><T k="active" /></span></div>
        <div className="field" style={{ marginTop: 14 }}><label><T k="vc_voice" /></label>
          <select>
            <option>Layla — Arabic (Kuwaiti), warm</option>
            <option>Sara — Arabic (MSA), professional</option>
            <option>Emma — English, friendly</option>
            <option>ElevenLabs — Aria (Premium)</option>
          </select>
        </div>
        <div className="field"><label><T k="vc_greetl" /></label>
          <textarea rows="2" defaultValue="Thank you for calling Al Noor Perfumes. This is the AI assistant — how may I help you?" />
        </div>
        <div className="row"><div><b><T k="vc_in" /></b></div><Switch defaultChecked /></div>
        <div className="row"><div><b><T k="vc_fw" /></b></div><Switch defaultChecked /></div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
      <div className="card">
        <h3><Icon name="file-audio" /><T k="vc_rec" /></h3>
        {recs.map((r, i) => (
          <div className="kb-item" key={i}>
            <div className="ic" style={{ background: r.c, color: r.col }}><Icon name={r.ic} /></div>
            <div style={{ flex: 1 }}><b>{r.b}</b><span><T k={r.d} /></span></div>
            <button className="btn btn-o" style={{ padding: '6px 12px' }}><T k="view_lbl" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===================== WIDGET ===================== */
const EMBED = '<script src="https://widget.sts.app/w.js"\n data-business="biz_alnoor_7f3a" defer></script>'
export function WidgetView() {
  const toast = useToast()
  function copy() {
    navigator.clipboard?.writeText(EMBED).catch(() => {})
    toast()
  }
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="code-2" /><T k="wd_emb" /></h3>
        <p style={{ color: 'var(--mut)', marginBottom: 14 }}><T k="wd_p" /></p>
        <div className="code">
          {'<script src="https://widget.sts.app/w.js"'}
          <br />
          {' data-business="biz_alnoor_7f3a" defer></script>'}
          <button className="copy" onClick={copy}><T k="copy" /></button>
        </div>
        <div className="row" style={{ marginTop: 16 }}><div><b><T k="wd_on" /></b></div><Switch defaultChecked /></div>
        <div className="field" style={{ marginTop: 8 }}><label><T k="wd_col" /></label><input type="color" defaultValue="#0FBE8F" style={{ height: 44, padding: 5 }} /></div>
        <div className="field"><label><T k="wd_pos" /></label><SelectI18n options={['wd_br', 'wd_bl']} /></div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
      <div className="card" style={{ background: 'linear-gradient(160deg,#0C2A44,#071A2B)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: '#fff' }}><Icon name="eye" style={{ color: 'var(--lagoon)' }} /><T k="wd_prev" /></h3>
        <div style={{ flex: 1, position: 'relative', border: '1px dashed rgba(255,255,255,.2)', borderRadius: 14, minHeight: 320 }}>
          <div style={{ position: 'absolute', bottom: 16, insetInlineEnd: 16, width: 270, background: '#fff', borderRadius: 16, color: 'var(--ink)', boxShadow: '0 20px 50px rgba(0,0,0,.5)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--lagoon)', padding: '13px 15px', color: '#03271B', fontWeight: 800, fontSize: 13.5 }}>Al Noor Perfumes</div>
            <div style={{ padding: 13, fontSize: 12.5 }}>
              <div style={{ background: '#F0F3F6', borderRadius: 10, padding: '9px 11px', marginBottom: 8 }}><T k="wd_m1" /></div>
              <div style={{ background: '#E8FBF4', borderRadius: 10, padding: '9px 11px', textAlign: 'end' }}><T k="wd_m2" /></div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 13px', fontSize: 12, color: 'var(--mut)' }}><T k="wd_type" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===================== KNOWLEDGE ===================== */
export function KnowledgeView() {
  const toast = useToast()
  const srcs = [
    { icon: 'file-text', b: 'Price-List-2026.pdf', d: 'kb_s1', badge: 'b-ok', st: 'trained' },
    { icon: 'file-text', b: 'Delivery-Policy.docx', d: 'kb_s2', badge: 'b-ok', st: 'trained' },
    { icon: 'globe', b: 'alnoorperfumes.com/faq', d: 'kb_s3', badge: 'b-ok', st: 'trained' },
    { icon: 'message-square', bKey: 'kb_s4b', d: 'kb_s4', badge: 'b-ok', st: 'trained' },
    { icon: 'file-spreadsheet', b: 'Ramadan-Offers.xlsx', d: 'kb_s5', badge: 'b-warn', st: 'processing' },
  ]
  const { t } = useLang()
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="upload-cloud" /><T k="kb_tr" /></h3>
        <div className="drop" onClick={() => toast()}>
          <Icon name="file-up" style={{ width: 30, height: 30, marginBottom: 8 }} />
          <br /><b><T k="kb_drop" /></b><br />
          <span style={{ fontSize: 12 }}><T k="kb_types" /></span>
        </div>
        <div className="field"><label><T k="kb_url" /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="https://alnoorperfumes.com/faq" />
            <button className="btn btn-p"><T k="import" /></button>
          </div>
        </div>
        <div className="field"><label><T k="kb_qa" /></label>
          <input placeholder={t('kb_q')} style={{ marginBottom: 8 }} />
          <textarea rows="2" placeholder={t('kb_a')} />
        </div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="brain" size={16} /><T k="kb_train" /></button>
      </div>
      <div className="card">
        <h3><Icon name="library" /><T k="kb_src" /> <span className="badge b-info" style={{ marginInlineStart: 'auto' }}>6</span></h3>
        {srcs.map((s, i) => (
          <div className="kb-item" key={i}>
            <div className="ic"><Icon name={s.icon} /></div>
            <div style={{ flex: 1 }}><b>{s.bKey ? <T k={s.bKey} /> : s.b}</b><span><T k={s.d} /></span></div>
            <span className={`badge ${s.badge}`}><T k={s.st} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===================== ANALYTICS ===================== */
export function AnalyticsView() {
  const rows = [
    { q: 'q1', ct: 214, res: '97%', b: 'b-ok' },
    { q: 'q2', ct: 188, res: '99%', b: 'b-ok' },
    { q: 'q3', ct: 96, res: '100%', b: 'b-ok' },
    { q: 'q4', ct: 41, res: '62%', b: 'b-warn' },
  ]
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><T k="an_c1" /></h3><div className="chart-box"><MonthChart /></div></div>
        <div className="card"><h3><Icon name="bot" /><T k="an_c2" /></h3><div className="chart-box"><ResolutionChart /></div></div>
      </div>
      <div className="grid g2">
        <div className="card">
          <h3><Icon name="help-circle" /><T k="an_c3" /></h3>
          <div className="tbl">
            <table>
              <thead><tr><th><T k="th_q" /></th><th><T k="th_ct" /></th><th><T k="th_res" /></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.q}><td><T k={r.q} /></td><td>{r.ct}</td><td><span className={`badge ${r.b}`}>{r.res}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card"><h3><Icon name="target" /><T k="an_c4" /></h3><div className="chart-box"><LeadsChart /></div></div>
      </div>
    </>
  )
}

/* ===================== BILLING ===================== */
export function BillingView() {
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><T k="bl_plan" /><Icon name="package" /></div><div className="val" style={{ fontSize: 20 }}>Complete Growth</div><div className="trend">145 KWD / <T k="mo" /></div></div>
        <div className="card stat"><div className="lbl"><T k="bl_next" /><Icon name="calendar" /></div><div className="val" style={{ fontSize: 20 }}>1 Aug 2026</div><div className="trend"><T k="auto_renew" /></div></div>
        <div className="card stat"><div className="lbl"><T k="bl_status" /><Icon name="shield-check" /></div><div className="val" style={{ fontSize: 20, color: 'var(--lagoon-d)' }}><T k="paid" /></div><div className="trend"><T k="thanks" /></div></div>
      </div>
      <div className="card">
        <h3><Icon name="receipt" /><T k="bl_inv" /></h3>
        <div className="tbl">
          <table>
            <thead><tr><th><T k="th_no" /></th><th><T k="th_date" /></th><th><T k="th_desc" /></th><th><T k="th_amt" /></th><th><T k="th_st" /></th><th /></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.no}>
                  <td>{inv.no}</td><td>{inv.date}</td><td>{inv.desc}</td><td>{inv.amt}</td>
                  <td><span className="badge b-ok"><T k="paid" /></span></td>
                  <td><button className="btn btn-o" style={{ padding: '6px 12px' }}><Icon name="download" size={14} />PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-p"><Icon name="arrow-up-circle" size={16} /><T k="bl_up" /></button>
          <a className="btn btn-o" href={WHATSAPP}><Icon name="message-circle" size={16} /><T k="bl_help" /></a>
        </div>
      </div>
    </>
  )
}

/* ===================== SETTINGS ===================== */
export function SettingsView() {
  const toast = useToast()
  const { t } = useLang()
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="building-2" /><T k="se_biz" /></h3>
        <div className="field"><label><T k="f_biz" /></label><input defaultValue="Al Noor Perfumes" /></div>
        <div className="field"><label><T k="f_email" /></label><input defaultValue="owner@alnoorperfumes.com" /></div>
        <div className="field"><label><T k="se_hrs" /></label><input defaultValue="Sat–Thu, 10:00 – 22:00" /></div>
        <div className="field"><label><T k="se_lang" /></label>
          <select><option>{t('se_auto')}</option><option>العربية</option><option>English</option></select>
        </div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
      <div className="card">
        <h3><Icon name="lock" /><T k="se_sec" /></h3>
        <div className="field"><label><T k="se_cur" /></label><input type="password" placeholder="••••••••" /></div>
        <div className="field"><label><T k="se_new" /></label><input type="password" placeholder="••••••••" /></div>
        <button className="btn btn-p"><Icon name="key-round" size={16} /><T k="se_upd" /></button>
        <div className="row" style={{ marginTop: 20 }}><div><b><T k="se_notif" /></b><p><T k="se_notifp" /></p></div><Switch defaultChecked /></div>
      </div>
    </div>
  )
}

/* A <select> whose <option> labels are translated by key. */
function SelectI18n({ options }) {
  const { t } = useLang()
  return (
    <select>
      {options.map((o) => (
        <option key={o}>{t(o)}</option>
      ))}
    </select>
  )
}
