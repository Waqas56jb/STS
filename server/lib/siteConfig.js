/** Platform-wide website branding, copy, and pricing — stored in sts_settings.site_config */

export const DEFAULT_WHATSAPP = '+965 510 22389'
export const DEFAULT_EMAIL = 'sts@shgardiauto.com'

export const PLAN_CODE_MAP = {
  'p-wa': ['wa_starter', 'wa_growth', 'wa_pro'],
}

export const DEFAULT_SITE_CONFIG = {
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
  copy: {
    en: {
      hero_kick: 'Official Meta WhatsApp Business API',
      hero_h1: 'Your WhatsApp customer conversations — <span class="grad">handled by AI</span>, in one dashboard',
      hero_sub: 'STS builds, connects and manages AI WhatsApp chatbots for your business. Auto-reply 24/7, hand off to humans when needed, and never miss a lead — while you watch everything from a single inbox.',
      pr_h: 'Simple, transparent pricing',
      pr_p: 'WhatsApp plans for every business size. Upgrade anytime.',
      cta_h: 'Ready to automate your WhatsApp conversations?',
    },
    ar: {
      hero_kick: 'واجهة واتساب الرسمية من ميتا للأعمال',
      hero_h1: 'محادثات واتساب عملائك — <span class="grad">بالذكاء الاصطناعي</span>، في لوحة واحدة',
      hero_sub: 'STS تبني وتربط وتدير روبوتات واتساب لعملك. رد تلقائي 24/7، تحويل للبشر عند الحاجة، ولا تفوّت أي عميل محتمل.',
      pr_h: 'أسعار بسيطة وشفافة',
      pr_p: 'باقات واتساب لكل حجم نشاط. يمكنك الترقية في أي وقت.',
      cta_h: 'جاهز لأتمتة محادثات واتساب؟',
    },
  },
  pricing: {
    'p-wa': [
      { code: 'wa_starter', name: 'WhatsApp Starter', who: 'who_s', price: '14.990', hot: false, feats: ['pw1', 'pw_api', 'pw_ho', 'pw_kb', 'pw_extra'] },
      { code: 'wa_growth', name: 'WhatsApp Growth', who: 'who_g', price: '19.990', hot: true, feats: ['pw2', 'pw_api', 'pw_ho', 'pw_rep', 'pw_extra'] },
      { code: 'wa_pro', name: 'WhatsApp Pro', who: 'who_p', price: '27.990', hot: false, feats: ['pw3', 'pw_api', 'pw_ho', 'pw_pri', 'pw_extra'] },
      { code: 'wa_custom', name: 'Custom', who: 'who_custom', price: 'Quote', priceIsLabel: true, hot: false, custom: true, feats: ['pw_custom1', 'pw_custom2', 'pw_extra', 'pw_pri'] },
    ],
  },
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base
  const out = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out
}

export function parseSiteConfig(raw) {
  if (!raw) return structuredClone(DEFAULT_SITE_CONFIG)
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return deepMerge(structuredClone(DEFAULT_SITE_CONFIG), parsed)
  } catch {
    return structuredClone(DEFAULT_SITE_CONFIG)
  }
}

export function waLink(number) {
  const digits = String(number || DEFAULT_WHATSAPP).replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : 'https://wa.me/96551022389'
}

/** Push landing-page prices into sts_plans so billing stays in sync. */
export function pricingPlanUpdates(pricing) {
  const updates = []
  for (const plans of Object.values(pricing || {})) {
    for (const p of plans || []) {
      if (!p?.code || p.custom || p.priceIsLabel) continue
      const n = Number(String(p.price).replace(/[^\d.]/g, ''))
      if (!Number.isFinite(n)) continue
      updates.push({
        code: p.code,
        name: p.name,
        price_kwd: n,
      })
    }
  }
  return updates
}
