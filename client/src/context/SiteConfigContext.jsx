import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { API } from '../lib/api'
import { priceData as defaultPricing } from '../data/pricing'

const SiteConfigContext = createContext(null)
export { SiteConfigContext }

const DEFAULT = {
  theme: {
    primary: '#0FBE8F',
    primaryDark: '#0A9873',
    navy: '#071A2B',
    navyLight: '#0C2A44',
    accent: '#5B8DEF',
    whatsapp: '#25D366',
    sand: '#F6F4EF',
    fontDisplay: 'Sora',
    fontBody: 'Inter',
  },
  copy: { en: {}, ar: {} },
  pricing: defaultPricing,
  contact: {
    whatsapp: '+965 510 22389',
    email: 'sts@shgardiauto.com',
    currency: 'KWD',
    whatsapp_url: 'https://wa.me/96551022389',
  },
}

function applyTheme(theme) {
  if (!theme) return
  const root = document.documentElement
  root.style.setProperty('--lagoon', theme.primary)
  root.style.setProperty('--lagoon-d', theme.primaryDark)
  root.style.setProperty('--ink', theme.navy)
  root.style.setProperty('--ink-2', theme.navyLight)
  root.style.setProperty('--voice', theme.accent)
  root.style.setProperty('--wa', theme.whatsapp)
  root.style.setProperty('--sand', theme.sand)
  if (theme.fontDisplay) root.style.setProperty('--disp', `'${theme.fontDisplay}', sans-serif`)
  if (theme.fontBody) root.style.setProperty('--body', `'${theme.fontBody}', sans-serif`)
}

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT)

  const load = () => {
    fetch(`${API.replace(/\/$/, '')}/site-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setConfig((c) => ({
          theme: { ...c.theme, ...d.theme },
          copy: d.copy || c.copy,
          pricing: d.pricing && Object.keys(d.pricing).length ? d.pricing : c.pricing,
          contact: { ...c.contact, ...d.contact },
        }))
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    applyTheme(config.theme)
  }, [config.theme])

  const value = useMemo(() => ({
    ...config,
    whatsappUrl: config.contact?.whatsapp_url || DEFAULT.contact.whatsapp_url,
    reload: load,
  }), [config])

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
