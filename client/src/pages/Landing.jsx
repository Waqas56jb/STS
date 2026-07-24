import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Reveal } from '../components/Reveal'
import { ShowcaseMock } from '../components/ShowcaseMocks'
import { T, useLang } from '../i18n/LangContext'
import { useScrolled } from '../hooks/useScrolled'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { apiPost, saveSession, WHATSAPP } from '../lib/api'
import { priceData, priceTabs } from '../data/pricing'

const services = [
  { ic: 'g1', icon: 'message-circle', h: 's1h', p: 's1p' },
  { ic: 'g2', icon: 'instagram', h: 's2h', p: 's2p' },
  { ic: 'g3', icon: 'phone-call', h: 's3h', p: 's3p' },
  { ic: 'g4', icon: 'layout-dashboard', h: 's4h', p: 's4p' },
]

const showcases = [
  { eye: 'sh1e', h: 'sh1h', p: 'sh1p', flip: false, li: ['sh1l1', 'sh1l2', 'sh1l3'], mock: 'inbox' },
  { eye: 'sh2e', h: 'sh2h', p: 'sh2p', flip: true, li: ['sh2l1', 'sh2l2', 'sh2l3'], mock: 'train' },
  { eye: 'sh3e', h: 'sh3h', p: 'sh3p', flip: false, li: ['sh3l1', 'sh3l2', 'sh3l3'], mock: 'reports' },
]

const steps = [
  { n: '01', h: 'st1h', p: 'st1p' },
  { n: '02', h: 'st2h', p: 'st2p' },
  { n: '03', h: 'st3h', p: 'st3p' },
]

const why = [
  { icon: 'badge-check', h: 'w1h', p: 'w1p' },
  { icon: 'clock', h: 'w2h', p: 'w2p' },
  { icon: 'target', h: 'w3h', p: 'w3p' },
  { icon: 'inbox', h: 'w4h', p: 'w4p' },
  { icon: 'wrench', h: 'w5h', p: 'w5p' },
  { icon: 'languages', h: 'w6h', p: 'w6p' },
]

const NAV_LINKS = [
  { href: '#services', k: 'nav_services' },
  { href: '#how', k: 'nav_how' },
  { href: '#pricing', k: 'nav_pricing' },
  { href: '#request', k: 'nav_contact' },
]

/* ---------------- Nav ---------------- */
function Nav({ onLogin }) {
  const scrolled = useScrolled(30)
  const { toggle, isAr } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  useLockBodyScroll(menuOpen)

  const close = () => setMenuOpen(false)

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <div className="wrap nav-in">
        <a className="logo" href="#top" onClick={close}>
          <span className="logo-mark">
            <Icon name="messages-square" />
          </span>
          STS
        </a>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}><T k={l.k} /></a>
          ))}
        </div>
        <div className="nav-cta">
          <button className="lang-sw nav-desktop" onClick={toggle}>{isAr ? 'EN' : 'عربي'}</button>
          <button className="btn btn-ghost nav-desktop" style={{ padding: '9px 20px' }} onClick={onLogin}>
            <T k="nav_login" />
          </button>
          <a className="btn btn-wa nav-desktop" style={{ padding: '9px 20px' }} href={WHATSAPP} target="_blank" rel="noreferrer">
            <Icon name="message-circle" size={17} />
            <T k="wa_us" />
          </a>
          <button
            className="burger"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={24} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mm-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={close}><T k={l.k} /></a>
          ))}
        </div>
        <div className="mm-actions">
          <a className="btn btn-wa" href={WHATSAPP} target="_blank" rel="noreferrer" onClick={close}>
            <Icon name="message-circle" size={18} />
            <T k="wa_us" />
          </a>
          <button className="btn btn-ghost" onClick={() => { close(); onLogin() }}>
            <T k="nav_login" />
          </button>
          <button className="lang-sw mm-lang" onClick={toggle}>{isAr ? 'English' : 'العربية'}</button>
        </div>
      </div>
    </nav>
  )
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-in">
        <div>
          <span className="kicker">
            <Icon name="sparkles" size={15} />
            <T k="hero_kick" />
          </span>
          <T as="h1" k="hero_h1" html />
          <p className="sub"><T k="hero_sub" /></p>
          <div className="hero-cta">
            <a className="btn btn-wa" href={WHATSAPP} target="_blank" rel="noreferrer">
              <Icon name="message-circle" size={18} />
              <T k="wa_us" />
            </a>
            <a className="btn btn-ghost" href="#request">
              <T k="req_access" />
              <Icon name="arrow-right" size={18} />
            </a>
          </div>
          <div className="trust">
            <span><Icon name="shield-check" /><T k="t1" /></span>
            <span><Icon name="clock" /><T k="t2" /></span>
            <span><Icon name="users" /><T k="t3" /></span>
          </div>
        </div>
        <div className="stage">
          <div className="orb o1"><Icon name="message-circle" size={17} />WhatsApp</div>
          <div className="orb o2"><Icon name="instagram" size={17} />Instagram</div>
          <div className="orb o3"><Icon name="phone-call" size={17} /><T k="voice_lbl" /></div>
          <div className="dash-card">
            <div className="dash-top"><b><T k="inbox_lbl" /></b><span className="dot" /></div>
            <div className="msg">
              <span className="chip wa"><Icon name="message-circle" size={17} /></span>
              <span className="t"><b>Sara · WhatsApp</b><T k="m1" /></span>
            </div>
            <div className="msg">
              <span className="chip ig"><Icon name="instagram" size={17} /></span>
              <span className="t"><b>@khalid.kw · Instagram</b><T k="m2" /></span>
            </div>
            <div className="msg">
              <span className="chip vc"><Icon name="phone-call" size={17} /></span>
              <span className="t"><b><T k="m3b" /></b><T k="m3" /></span>
            </div>
            <div className="reply">
              <span className="bubble">
                <T k="m4" />
                <span className="typing"><i /><i /><i /></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ---------------- Pricing ---------------- */
function Pricing() {
  const [tab, setTab] = useState('p-wa')
  const { t } = useLang()
  return (
    <section id="pricing">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="eyebrow"><T k="pr_eye" /></span>
          <h2><T k="pr_h" /></h2>
          <p><T k="pr_p" /></p>
        </Reveal>
        <div className="tabs" role="tablist">
          {priceTabs.map((tb) => (
            <button key={tb.id} className={`tab ${tab === tb.id ? 'on' : ''}`} onClick={() => setTab(tb.id)}>
              {t(tb.label)}
            </button>
          ))}
        </div>
        <div className="pane on">
          <div className="pgrid">
            {priceData[tab].map((plan) => (
              <div key={plan.name} className={`plan ${plan.hot ? 'hot' : ''}`}>
                {plan.hot && <span className="tag">{t(plan.tag || 'popular')}</span>}
                <h3>{plan.name}</h3>
                <div className="who">{plan.whoLiteral ? plan.who : t(plan.who)}</div>
                <div className="price">
                  {plan.price} <small>KWD/<T k="mo" /></small>
                </div>
                {plan.was && (
                  <div className="was">{plan.was} KWD <T k="sep" /></div>
                )}
                {plan.save && <span className="save" dangerouslySetInnerHTML={{ __html: t(plan.save) }} />}
                <ul>
                  {plan.feats.map((f) => (
                    <li key={f}><Icon name="check" /><span>{t(f)}</span></li>
                  ))}
                </ul>
                <a className={`btn ${plan.hot ? 'btn-primary' : 'btn-dark'}`} href="#request">
                  {t('get_started')}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Request form ---------------- */
function RequestForm() {
  const { t } = useLang()
  const [ok, setOk] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.target))
    try {
      await apiPost('/requests', data)
    } catch {
      /* still show success locally so the lead isn't lost — matches original */
    }
    setOk(true)
    e.target.reset()
  }

  return (
    <form className="access reveal in" onSubmit={onSubmit}>
      <h3><T k="fm_h" /></h3>
      <div className="hint"><T k="fm_hint" /></div>
      <div className="f-row">
        <div className="field"><label><T k="f_biz" /></label><input required name="business_name" placeholder="Al Noor Perfumes" /></div>
        <div className="field"><label><T k="f_name" /></label><input required name="contact_name" placeholder="Ahmed Al-Sabah" /></div>
      </div>
      <div className="f-row">
        <div className="field"><label><T k="f_email" /></label><input required type="email" name="email" placeholder="you@business.com" /></div>
        <div className="field"><label><T k="f_wa" /></label><input required name="whatsapp" placeholder="+965 5xxx xxxx" /></div>
      </div>
      <div className="field">
        <label><T k="f_plan" /></label>
        <select name="interested_plan">
          <option value="whatsapp">WhatsApp Chatbot</option>
          <option value="instagram">Instagram Chatbot</option>
          <option value="voice">AI Voice Agent</option>
          <option value="bundle_social">Social Bundle (WA + IG)</option>
          <option value="bundle_complete">Complete Bundle (WA + IG + Voice)</option>
        </select>
      </div>
      <div className="field">
        <label><T k="f_msg" /></label>
        <textarea rows="3" name="message" placeholder={t('f_msg_ph')} />
      </div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} type="submit">
        <T k="f_send" />
        <Icon name="send" size={17} />
      </button>
      <div className={`ok-note ${ok ? 'show' : ''}`}><T k="f_ok" /></div>
    </form>
  )
}

/* ---------------- Login modal ---------------- */
function LoginModal({ open, onClose }) {
  const { t, isAr } = useLang()
  const navigate = useNavigate()
  const [err, setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    const email = e.target.lgEmail.value
    const password = e.target.lgPass.value
    try {
      const { token, user } = await apiPost('/auth/login', { email, password })
      saveSession({ token, user })
      // route by role — admin panel is a separate app served at /admin/,
      // the client dashboard is a route in this app (matches the original
      // admin/admin.html vs client/client.html redirect).
      if (user.role === 'admin') {
        window.location.href = '/admin/'
      } else {
        navigate('/dashboard')
      }
    } catch (ex) {
      // A real 401/403 means wrong credentials → show the error.
      // Anything else (network TypeError, or a 5xx when the API server is
      // offline) → open the dashboard in demo mode, mirroring the
      // dashboard's own try-API-then-demo behaviour.
      if (ex.status === 401 || ex.status === 403) {
        setErr(isAr ? 'بيانات الدخول غير صحيحة' : ex.message || 'Invalid credentials')
      } else {
        saveSession({ token: 'demo', user: { role: 'client', business_name: 'Al Noor Perfumes', plan: 'Complete Growth' } })
        navigate('/dashboard')
      }
    }
  }

  return (
    <div className={`modal ${open ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3><T k="lg_h" /></h3>
        <p><T k="lg_p" /></p>
        <form onSubmit={onSubmit}>
          <div className="field"><label><T k="f_email" /></label><input required type="email" name="lgEmail" placeholder="you@business.com" /></div>
          <div className="field"><label><T k="f_pass" /></label><input required type="password" name="lgPass" placeholder="••••••••" /></div>
          <button className="btn btn-dark" style={{ width: '100%', justifyContent: 'center' }} type="submit">{t('lg_btn')}</button>
          <div className="ok-note" style={{ display: err ? 'block' : 'none', background: '#FEE2E2', color: '#991B1B' }}>{err}</div>
        </form>
        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 13 }}>
          <T k="lg_no" />{' '}
          <a href="#request" onClick={onClose} style={{ color: 'var(--lagoon-d)', fontWeight: 700 }}><T k="req_access" /></a>
        </p>
      </div>
    </div>
  )
}

/* ---------------- Page ---------------- */
export default function Landing() {
  const { t } = useLang()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="site" id="top">
      <Nav onLogin={() => setLoginOpen(true)} />
      <Hero />

      <div className="strip">
        <div className="wrap row">
          <span>Meta Business</span><span>WhatsApp API</span><span>Instagram DM</span>
          <span>OpenAI</span><span>Twilio Voice</span><span>ElevenLabs</span>
        </div>
      </div>

      {/* SERVICES */}
      <section id="services">
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="eyebrow"><T k="sv_eye" /></span>
            <h2><T k="sv_h" /></h2>
            <p><T k="sv_p" /></p>
          </Reveal>
          <div className="cards">
            {services.map((s) => (
              <Reveal className="card" key={s.h}>
                <div className={`ic ${s.ic}`}><Icon name={s.icon} /></div>
                <h3><T k={s.h} /></h3>
                <p><T k={s.p} /></p>
              </Reveal>
            ))}
          </div>

          {showcases.map((sc) => (
            <Reveal className={`show ${sc.flip ? 'flip' : ''}`} key={sc.h}>
              <div>
                <span className="eyebrow"><T k={sc.eye} /></span>
                <h3><T k={sc.h} /></h3>
                <p><T k={sc.p} /></p>
                <ul>
                  {sc.li.map((l) => (
                    <li key={l}><Icon name="check-circle-2" /><span><T k={l} /></span></li>
                  ))}
                </ul>
              </div>
              <div className="show-img"><ShowcaseMock kind={sc.mock} /></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="steps-sec" id="how">
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="eyebrow"><T k="hw_eye" /></span>
            <h2><T k="hw_h" /></h2>
            <p><T k="hw_p" /></p>
          </Reveal>
          <div className="steps">
            {steps.map((s) => (
              <Reveal className="step" key={s.n}>
                <div className="n">{s.n}</div>
                <h3><T k={s.h} /></h3>
                <p><T k={s.p} /></p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Pricing />

      {/* WHY */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="eyebrow"><T k="wy_eye" /></span>
            <h2><T k="wy_h" /></h2>
          </Reveal>
          <div className="why">
            {why.map((w) => (
              <Reveal className="card" key={w.h}>
                <div className="ic"><Icon name={w.icon} /></div>
                <div>
                  <h4><T k={w.h} /></h4>
                  <p><T k={w.p} /></p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST */}
      <section className="req" id="request">
        <div className="wrap req-in">
          <Reveal>
            <span className="eyebrow" style={{ color: 'var(--lagoon)' }}><T k="rq_eye" /></span>
            <h2><T k="rq_h" /></h2>
            <p><T k="rq_p" /></p>
            <div className="pts">
              <div><Icon name="check-circle-2" /><T k="rq1" /></div>
              <div><Icon name="check-circle-2" /><T k="rq2" /></div>
              <div><Icon name="check-circle-2" /><T k="rq3" /></div>
            </div>
            <div style={{ marginTop: 32 }}>
              <a className="btn btn-wa" href={WHATSAPP} target="_blank" rel="noreferrer">
                <Icon name="message-circle" size={18} />
                <T k="wa_pref" />
              </a>
            </div>
          </Reveal>
          <RequestForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <div className="wrap">
          <div className="f-grid">
            <div>
              <a className="logo" href="#top" style={{ marginBottom: 16 }}>
                <span className="logo-mark"><Icon name="messages-square" /></span>STS
              </a>
              <p style={{ fontSize: 14, maxWidth: 300, marginTop: 14 }}><T k="ft_p" /></p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <a href={WHATSAPP} aria-label="WhatsApp" style={socialStyle}><Icon name="message-circle" size={17} /></a>
                <a href="#" aria-label="Instagram" style={socialStyle}><Icon name="instagram" size={17} /></a>
                <a href="#" aria-label="X" style={socialStyle}><Icon name="twitter" size={17} /></a>
              </div>
            </div>
            <div>
              <h5><T k="ft_srv" /></h5>
              <a href="#services"><T k="s1h" /></a>
              <a href="#services"><T k="s2h" /></a>
              <a href="#services"><T k="s3h" /></a>
              <a href="#services"><T k="s4h" /></a>
            </div>
            <div>
              <h5><T k="ft_co" /></h5>
              <a href="#how"><T k="nav_how" /></a>
              <a href="#pricing"><T k="nav_pricing" /></a>
              <a href="#request"><T k="req_access" /></a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLoginOpen(true) }}><T k="nav_login" /></a>
            </div>
            <div>
              <h5><T k="ft_ct" /></h5>
              <a href="mailto:sts@shgardiauto.com">sts@shgardiauto.com</a>
              <a href={WHATSAPP}>+965 0000 0000</a>
              <a href="#"><T k="ft_kw" /></a>
            </div>
          </div>
          <div className="f-bot">
            <span>© 2026 STS. <T k="ft_rights" /></span>
            <T k="ft_meta" />
          </div>
        </div>
      </footer>

      <a className="wa-float" href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp us">
        <Icon name="message-circle" size={26} />
      </a>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}

const socialStyle = {
  width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.08)',
  display: 'grid', placeItems: 'center', margin: 0,
}
