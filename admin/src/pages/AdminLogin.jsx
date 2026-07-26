import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useAdminT } from '../i18n/admin'
import { apiPost, saveSession } from '../lib/api'

const LOGO = import.meta.env.BASE_URL + 'logo.png'

/**
 * Elegant, on-theme admin login page. Split layout: a navy/green brand
 * panel on the left, the sign-in form on the right.
 *
 * Auth flow mirrors the rest of the app:
 *  - success + role 'admin' → save session, enter the panel
 *  - success but not admin  → refuse with a clear message
 *  - 401/403                → "invalid credentials"
 *  - server offline (5xx / network) → "cannot reach the server" (real API only)
 */
export function AdminLogin({ onSuccess }) {
  const { t, toggle, isAr } = useAdminT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const { token, user } = await apiPost('/auth/login', { email, password }, { retries: 2 })
      if (user.role !== 'admin') {
        setErr(t('lg_notadmin'))
        setBusy(false)
        return
      }
      saveSession({ token, user })
      onSuccess()
    } catch (ex) {
      // Real API only — no demo fallback.
      if (ex.status === 401 || ex.status === 403) {
        setErr(t('lg_invalid'))
      } else {
        setErr(isAr ? 'تعذّر الاتصال بالخادم' : 'Cannot reach the server')
      }
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      {/* ---------- Brand panel ---------- */}
      <aside className="al-brand">
        <div className="al-glow" aria-hidden="true" />
        <div className="al-brand-top">
          <img className="al-logoimg" src={LOGO} alt="STS Tech Solutions" />
          <span className="al-tag">{t('lg_tag')}</span>
        </div>

        <div className="al-brand-body">
          <h1>{t('lg_brand_h')}</h1>
          <p>{t('lg_brand_p')}</p>
          <div className="al-points">
            <div><Icon name="user-check" /><span>{t('lg_p1')}</span></div>
            <div><Icon name="credit-card" /><span>{t('lg_p2')}</span></div>
            <div><Icon name="bar-chart-3" /><span>{t('lg_p3')}</span></div>
          </div>
        </div>
      </aside>

      {/* ---------- Form ---------- */}
      <main className="al-form-wrap">
        <button type="button" className="al-lang" onClick={toggle}>
          <Icon name="languages" size={16} />
          {isAr ? 'English' : 'العربية'}
        </button>

        <form className="al-card" onSubmit={submit}>
          <img className="al-mobilelogo" src={LOGO} alt="STS" />

          <h2>{t('lg_welcome')}</h2>
          <p className="sub">{t('lg_sub')}</p>

          {err && (
            <div className="al-err">
              <Icon name="alert-triangle" size={16} />
              <span>{err}</span>
            </div>
          )}

          <div className="al-field">
            <label>{t('lg_email')}</label>
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="admin@shgardiauto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="al-field">
            <label>{t('lg_pass')}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="al-btn" disabled={busy}>
            {busy ? t('lg_busy') : t('lg_btn')}
            {!busy && <Icon name="arrow-right" size={17} />}
          </button>

          <p className="al-hint">
            <Icon name="lock" size={13} />
            {t('lg_hint')}
          </p>
        </form>
      </main>
    </div>
  )
}
