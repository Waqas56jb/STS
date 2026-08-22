/** Platform-wide website branding, copy, and pricing — stored in sts_settings.site_config */

export const DEFAULT_WHATSAPP = '+965 510 22389'
export const DEFAULT_EMAIL = 'sts@shgardiauto.com'

export const PLAN_CODE_MAP = {
  'p-wa': ['wa_starter', 'wa_growth', 'wa_pro'],
  'p-ig': ['ig_starter', 'ig_growth', 'ig_business'],
  'p-vc': ['voice_starter', 'voice_standard', 'voice_premium'],
  'p-b1': ['social_starter', 'social_growth', 'social_pro'],
  'p-b2': ['complete_starter', 'complete_growth', 'complete_pro'],
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
      hero_h1: 'All your customer conversations — <span class="grad">WhatsApp, Instagram & Calls</span> — handled by AI, in one dashboard',
      hero_sub: 'STS builds, connects and manages AI chatbots for your business. Auto-reply 24/7, hand off to humans when needed, and never miss a lead — while you watch everything from a single inbox.',
      pr_h: 'Simple, transparent pricing',
      pr_p: 'Choose the channel bundle that fits your business. Upgrade anytime.',
      cta_h: 'Ready to automate your customer conversations?',
    },
    ar: {
      hero_kick: 'واجهة واتساب الرسمية من ميتا للأعمال',
      hero_h1: 'كل محادثات عملائك — <span class="grad">واتساب، إنستغرام والمكالمات</span> — بالذكاء الاصطناعي، في لوحة واحدة',
      hero_sub: 'STS تبني وتربط وتدير روبوتات الدردشة لعملك. رد تلقائي 24/7، تحويل للبشر عند الحاجة، ولا تفوّت أي عميل محتمل.',
      pr_h: 'أسعار بسيطة وشفافة',
      pr_p: 'اختر الباقة المناسبة لعملك. يمكنك الترقية في أي وقت.',
      cta_h: 'جاهز لأتمتة محادثات عملائك؟',
    },
  },
  pricing: {
    'p-wa': [
      { code: 'wa_starter', name: 'WhatsApp Starter', who: 'who_s', price: '20', hot: false, feats: ['pw1', 'pw_api', 'pw_ho', 'pw_kb'] },
      { code: 'wa_growth', name: 'WhatsApp Growth', who: 'who_g', price: '25', hot: true, feats: ['pw2', 'pw_api', 'pw_ho', 'pw_rep'] },
      { code: 'wa_pro', name: 'WhatsApp Pro', who: 'who_p', price: '34.90', hot: false, feats: ['pw3', 'pw_api', 'pw_ho', 'pw_pri'] },
    ],
    'p-ig': [
      { code: 'ig_starter', name: 'Instagram Starter', who: 'who_s', price: '20', hot: false, feats: ['pi1', 'pi_dm', 'pw_kb'] },
      { code: 'ig_growth', name: 'Instagram Growth', who: 'who_g', price: '32', hot: true, feats: ['pi2', 'pi_dm', 'pw_rep'] },
      { code: 'ig_business', name: 'Instagram Business', who: 'who_p', price: '55', hot: false, feats: ['pi3', 'pi_dm', 'pw_pri'] },
    ],
    'p-vc': [
      { code: 'voice_starter', name: 'Voice Starter', who: 'vc_std', price: '39', hot: false, feats: ['pv1', 'pv_tr', 'pv_ar'] },
      { code: 'voice_standard', name: 'Voice Standard', who: 'vc_std', price: '119', hot: true, feats: ['pv2', 'pv_tr', 'pv_in'] },
      { code: 'voice_premium', name: 'Voice Premium', who: 'vc_el', price: '329', hot: false, feats: ['pv2', 'pv_el', 'pw_pri'] },
    ],
    'p-b1': [
      { code: 'social_starter', name: 'Social Starter', who: 'WA Starter + IG Starter', whoLiteral: true, price: '34', was: '40', save: 'sv6', hot: false, feats: ['b_all2', 'b_inb'] },
      { code: 'social_growth', name: 'Social Growth', who: 'WA Growth + IG Growth', whoLiteral: true, price: '48', was: '57', save: 'sv9', hot: true, tag: 'best_value', feats: ['b_all2g', 'b_inb'] },
      { code: 'social_pro', name: 'Social Pro', who: 'WA Pro + IG Business', whoLiteral: true, price: '76', was: '89.90', save: 'sv13', hot: false, feats: ['b_all2p', 'pw_pri'] },
    ],
    'p-b2': [
      { code: 'complete_starter', name: 'Complete Starter', who: 'WA + IG + Voice Starter', whoLiteral: true, price: '65', was: '79', save: 'sv14', hot: false, feats: ['b_3ch', 'pw_kb'] },
      { code: 'complete_growth', name: 'Complete Growth', who: 'WA + IG Growth + Voice Standard', whoLiteral: true, price: '145', was: '176', save: 'sv31', hot: true, tag: 'best_value', feats: ['b_3ch', 'pw_rep'] },
      { code: 'complete_pro', name: 'Complete Pro', who: 'WA Pro + IG Business + Voice Premium', whoLiteral: true, price: '349', was: '418.90', save: 'sv69', hot: false, feats: ['b_3ch', 'pv_el'] },
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
      if (!p?.code) continue
      updates.push({
        code: p.code,
        name: p.name,
        price_kwd: Number(String(p.price).replace(/[^\d.]/g, '')) || 0,
      })
    }
  }
  return updates
}
