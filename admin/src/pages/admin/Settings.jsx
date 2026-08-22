import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut } from '../../lib/api'
import { useToast } from '../ui'
import { priceTabs } from '../../data/sitePricing'

const FONT_OPTS = ['Inter', 'Sora', 'Poppins', 'DM Sans', 'IBM Plex Sans Arabic']
const COPY_KEYS = [
  { k: 'hero_kick', label: 'se_copy_kick' },
  { k: 'hero_h1', label: 'se_copy_h1', html: true },
  { k: 'hero_sub', label: 'se_copy_sub' },
  { k: 'pr_h', label: 'se_copy_pr_h' },
  { k: 'pr_p', label: 'se_copy_pr_p' },
  { k: 'cta_h', label: 'se_copy_cta' },
]
const THEME_FIELDS = [
  { k: 'primary', label: 'se_col_primary' },
  { k: 'primaryDark', label: 'se_col_primary_d' },
  { k: 'navy', label: 'se_col_navy' },
  { k: 'navyLight', label: 'se_col_navy_l' },
  { k: 'accent', label: 'se_col_accent' },
  { k: 'whatsapp', label: 'se_col_wa' },
  { k: 'sand', label: 'se_col_sand' },
]

const TABS = [
  { id: 'contact', icon: 'phone', label: 'se_tab_contact' },
  { id: 'brand', icon: 'palette', label: 'se_tab_brand' },
  { id: 'content', icon: 'type', label: 'se_tab_content' },
  { id: 'pricing', icon: 'tags', label: 'se_tab_pricing' },
]

function emptyConfig() {
  return {
    theme: {
      primary: '#0FBE8F', primaryDark: '#0A9873', navy: '#071A2B', navyLight: '#0C2A44',
      accent: '#5B8DEF', whatsapp: '#25D366', sand: '#F6F4EF', fontDisplay: 'Sora', fontBody: 'Inter',
    },
    copy: { en: {}, ar: {} },
    pricing: {},
  }
}

function Preview({ theme, copy, contact, pricing, lang }) {
  const c = copy?.[lang] || {}
  const plans = pricing?.['p-wa'] || []
  const hot = plans.find((p) => p.hot) || plans[1] || plans[0]
  const style = {
    '--pv-primary': theme.primary,
    '--pv-navy': theme.navy,
    '--pv-sand': theme.sand,
    '--pv-wa': theme.whatsapp,
    '--pv-disp': `'${theme.fontDisplay}', sans-serif`,
    '--pv-body': `'${theme.fontBody}', sans-serif`,
  }
  return (
    <div className="settings-preview" style={style}>
      <div className="settings-preview-bar">
        <span className="settings-preview-dot" />
        <span className="settings-preview-dot" />
        <span className="settings-preview-dot" />
        <span className="settings-preview-url">www.stsq8.com</span>
      </div>
      <div className="settings-preview-hero">
        <div className="settings-preview-kick">{c.hero_kick || 'STS'}</div>
        <div className="settings-preview-h1" dangerouslySetInnerHTML={{ __html: c.hero_h1 || 'Your AI customer hub' }} />
        <p className="settings-preview-sub">{c.hero_sub || ''}</p>
        <div className="settings-preview-btns">
          <span className="settings-preview-btn primary">Get started</span>
          <span className="settings-preview-btn wa">WhatsApp</span>
        </div>
      </div>
      {hot && (
        <div className="settings-preview-plan">
          <div className="settings-preview-plan-name">{hot.name}</div>
          <div className="settings-preview-plan-price">{hot.price} <small>{contact?.currency || 'KWD'}</small></div>
        </div>
      )}
      <div className="settings-preview-foot">{contact?.whatsapp || '+965 510 22389'}</div>
    </div>
  )
}

export function Settings() {
  const { t } = useAdminT()
  const toast = useToast()
  const [tab, setTab] = useState('contact')
  const [langTab, setLangTab] = useState('en')
  const [priceTab, setPriceTab] = useState('p-wa')
  const [saving, setSaving] = useState(false)
  const [contact, setContact] = useState({ support_whatsapp: '+965 510 22389', support_email: 'sts@shgardiauto.com', currency: 'KWD' })
  const [cfg, setCfg] = useState(emptyConfig)

  const load = () => apiGet('/admin/settings').then((d) => {
    if (!d) return
    setContact({
      support_whatsapp: d.support_whatsapp || '+965 510 22389',
      support_email: d.support_email || 'sts@shgardiauto.com',
      currency: d.currency || 'KWD',
    })
    if (d.site_config) setCfg((x) => ({ ...x, ...d.site_config }))
  }).catch(() => {})

  useEffect(() => { load() }, [])

  const setTheme = (k, v) => setCfg((c) => ({ ...c, theme: { ...c.theme, [k]: v } }))
  const setCopy = (lang, k, v) => setCfg((c) => ({
    ...c,
    copy: { ...c.copy, [lang]: { ...(c.copy?.[lang] || {}), [k]: v } },
  }))
  const setPlan = (tabId, idx, patch) => setCfg((c) => {
    const rows = [...(c.pricing?.[tabId] || [])]
    rows[idx] = { ...rows[idx], ...patch }
    return { ...c, pricing: { ...c.pricing, [tabId]: rows } }
  })

  const previewLang = langTab
  const previewContact = useMemo(() => ({ ...contact, whatsapp: contact.support_whatsapp }), [contact])

  async function saveAll() {
    setSaving(true)
    try {
      await apiPut('/admin/settings', {
        support_whatsapp: contact.support_whatsapp,
        support_email: contact.support_email,
        currency: contact.currency,
        site_config: cfg,
      })
      toast(t('toast_saved'))
    } catch {
      toast(t('toast_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-shell">
      <div className="settings-head">
        <div>
          <h2 className="settings-title">{t('se_title')}</h2>
          <p className="settings-sub">{t('se_sub')}</p>
        </div>
        <button className="btn btn-g" onClick={saveAll} disabled={saving}>
          <Icon name="save" size={16} />
          {saving ? t('saving') : t('se_save_all')}
        </button>
      </div>

      <div className="settings-layout">
        <div className="settings-main">
          <div className="settings-tabs">
            {TABS.map((tb) => (
              <button key={tb.id} type="button" className={`settings-tab ${tab === tb.id ? 'on' : ''}`} onClick={() => setTab(tb.id)}>
                <Icon name={tb.icon} size={16} />
                <span>{t(tb.label)}</span>
              </button>
            ))}
          </div>

          {tab === 'contact' && (
            <div className="settings-card">
              <h3><Icon name="headphones" /><span>{t('se_contact_h')}</span></h3>
              <p className="settings-hint">{t('se_contact_p')}</p>
              <div className="settings-grid-2">
                <div className="field">
                  <label>{t('se_wa')}</label>
                  <input value={contact.support_whatsapp} onChange={(e) => setContact((c) => ({ ...c, support_whatsapp: e.target.value }))} placeholder="+965 510 22389" />
                </div>
                <div className="field">
                  <label>{t('se_em')}</label>
                  <input value={contact.support_email} onChange={(e) => setContact((c) => ({ ...c, support_email: e.target.value }))} placeholder="support@company.com" />
                </div>
                <div className="field">
                  <label>{t('se_cur')}</label>
                  <select value={contact.currency} onChange={(e) => setContact((c) => ({ ...c, currency: e.target.value }))}>
                    <option value="KWD">KWD</option>
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'brand' && (
            <div className="settings-card">
              <h3><Icon name="palette" /><span>{t('se_brand_h')}</span></h3>
              <p className="settings-hint">{t('se_brand_p')}</p>
              <div className="settings-colors">
                {THEME_FIELDS.map((f) => (
                  <label key={f.k} className="settings-color">
                    <input type="color" value={cfg.theme?.[f.k] || '#000000'} onChange={(e) => setTheme(f.k, e.target.value)} />
                    <span>{t(f.label)}</span>
                    <code>{cfg.theme?.[f.k]}</code>
                  </label>
                ))}
              </div>
              <div className="settings-grid-2" style={{ marginTop: 18 }}>
                <div className="field">
                  <label>{t('se_font_head')}</label>
                  <select value={cfg.theme?.fontDisplay || 'Sora'} onChange={(e) => setTheme('fontDisplay', e.target.value)}>
                    {FONT_OPTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('se_font_body')}</label>
                  <select value={cfg.theme?.fontBody || 'Inter'} onChange={(e) => setTheme('fontBody', e.target.value)}>
                    {FONT_OPTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'content' && (
            <div className="settings-card">
              <h3><Icon name="type" /><span>{t('se_content_h')}</span></h3>
              <p className="settings-hint">{t('se_content_p')}</p>
              <div className="settings-lang-tabs">
                <button type="button" className={langTab === 'en' ? 'on' : ''} onClick={() => setLangTab('en')}>English</button>
                <button type="button" className={langTab === 'ar' ? 'on' : ''} onClick={() => setLangTab('ar')}>العربية</button>
              </div>
              {COPY_KEYS.map((row) => (
                <div className="field" key={row.k}>
                  <label>{t(row.label)}</label>
                  {row.html ? (
                    <textarea rows={3} value={cfg.copy?.[langTab]?.[row.k] || ''} onChange={(e) => setCopy(langTab, row.k, e.target.value)} />
                  ) : (
                    <textarea rows={row.k.includes('sub') || row.k.includes('p') ? 3 : 2} value={cfg.copy?.[langTab]?.[row.k] || ''} onChange={(e) => setCopy(langTab, row.k, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'pricing' && (
            <div className="settings-card">
              <h3><Icon name="tags" /><span>{t('se_pricing_h')}</span></h3>
              <p className="settings-hint">{t('se_pricing_p')}</p>
              <div className="settings-price-tabs">
                {priceTabs.map((tb) => (
                  <button key={tb.id} type="button" className={priceTab === tb.id ? 'on' : ''} onClick={() => setPriceTab(tb.id)}>{t(tb.label)}</button>
                ))}
              </div>
              <div className="settings-plan-list">
                {(cfg.pricing?.[priceTab] || []).map((plan, idx) => (
                  <div key={plan.code || idx} className="settings-plan-row">
                    <div className="field"><label>{t('se_plan_name')}</label>
                      <input value={plan.name || ''} onChange={(e) => setPlan(priceTab, idx, { name: e.target.value })} />
                    </div>
                    <div className="field"><label>{t('se_plan_price')}</label>
                      <input value={plan.price || ''} onChange={(e) => setPlan(priceTab, idx, { price: e.target.value })} />
                    </div>
                    <div className="field"><label>{t('se_plan_was')}</label>
                      <input value={plan.was || ''} onChange={(e) => setPlan(priceTab, idx, { was: e.target.value || null })} placeholder="—" />
                    </div>
                    <label className="settings-check">
                      <input type="checkbox" checked={!!plan.hot} onChange={(e) => setPlan(priceTab, idx, { hot: e.target.checked })} />
                      <span>{t('se_plan_hot')}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="settings-aside">
          <div className="settings-card settings-preview-wrap">
            <h3><Icon name="eye" /><span>{t('se_preview')}</span></h3>
            <p className="settings-hint">{t('se_preview_p')}</p>
            <Preview theme={cfg.theme} copy={cfg.copy} contact={previewContact} pricing={cfg.pricing} lang={previewLang} />
          </div>
          <div className="settings-card settings-tip">
            <Icon name="sparkles" size={18} />
            <p>{t('se_tip')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
