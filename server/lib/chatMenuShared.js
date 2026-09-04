/**
 * WhatsApp Chat Menu — schema helpers + defaults for STS demo menu.
 */
export const ACTION_TYPES = [
  'static_response',
  'send_link',
  'send_image',
  'send_video',
  'send_document',
  'send_location',
  'send_contact',
  'start_ai',
  'human_handoff',
  'start_submenu',
  'book_appointment',
  'custom_ai',
]

export const RESET_PRESETS = [
  { hours: 24, label: '24 hours' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
  { hours: 0, label: 'Never (manual reset only)' },
]

export const DEMO_GREETING_EN =
  '👋 Welcome to STS Solutions!\n\nWe help businesses automate customer service, sales and communication using AI.'
export const DEMO_GREETING_AR =
  'مرحباً بك في STS للحلول التقنية 👋\n\nنساعد الشركات على أتمتة خدمة العملاء والمبيعات والتواصل باستخدام الذكاء الاصطناعي.'
export const DEMO_INTRO_EN = 'How can we help you today?'
export const DEMO_INTRO_AR = 'كيف نقدر نساعدك اليوم؟'

/** Seed options for STS Official / new menus */
export function demoMenuOptions() {
  return [
    {
      sort_order: 1,
      title_en: 'Our Services ⚙️',
      title_ar: 'خدماتنا ⚙️',
      action_type: 'start_submenu',
      active: true,
      config: {
        submenu_title_en: 'Our Services',
        submenu_title_ar: 'خدماتنا',
        submenu_options: [
          { title_en: 'WhatsApp AI', title_ar: 'واتساب AI', action_type: 'static_response', response_en: 'WhatsApp AI automates customer chats 24/7 in Arabic & English.', response_ar: 'واتساب AI يؤتمت محادثات عملائك على مدار الساعة بالعربية والإنجليزية.' },
          { title_en: 'Instagram AI', title_ar: 'إنستغرام AI', action_type: 'static_response', response_en: 'Instagram AI replies to DMs automatically.', response_ar: 'إنستغرام AI يرد على الرسائل تلقائياً.' },
          { title_en: 'Website Chatbot', title_ar: 'شات بوت الموقع', action_type: 'static_response', response_en: 'Embed our website chatbot on your site.', response_ar: 'أضف شات بوت الموقع إلى موقعك.' },
          { title_en: 'Voice AI', title_ar: 'الوكيل الصوتي', action_type: 'static_response', response_en: 'AI answers your business phone calls.', response_ar: 'الذكاء الاصطناعي يجيب على مكالمات هاتف نشاطك.' },
          { title_en: 'Custom Software', title_ar: 'برمجيات مخصصة', action_type: 'static_response', response_en: 'We build custom automation for your workflow.', response_ar: 'نبني أتمتة مخصصة لسير عملك.' },
        ],
      },
    },
    {
      sort_order: 2,
      title_en: 'Packages 💼',
      title_ar: 'الباقات 💼',
      action_type: 'static_response',
      active: true,
      config: {
        response_en: '🚀 Try the STS AI chatbot for free! Our team can prepare a demo for your business.\n\nPackages start from WhatsApp Starter to Complete Pro — ask for a quote!',
        response_ar: '🚀 جرّب بوت STS بالذكاء الاصطناعي مجاناً! يمكن لفريقنا تجهيز تجربة خاصة لنشاطك التجاري.\n\nالباقات تبدأ من واتساب Starter حتى Complete Pro — اطلب عرض سعر!',
      },
    },
    {
      sort_order: 3,
      title_en: 'Free Demo 🚀',
      title_ar: 'تجربة مجانية 🚀',
      action_type: 'start_ai',
      active: true,
      config: {
        message_en: 'Great! Tell me about your business and I’ll help you explore a free demo.',
        message_ar: 'ممتاز! خبرني عن نشاطك وسأساعدك تستكشف تجربة مجانية.',
      },
    },
    {
      sort_order: 4,
      title_en: 'Instagram 📸',
      title_ar: 'إنستغرام 📸',
      action_type: 'send_link',
      active: true,
      config: {
        message_en: '📸 Follow STS on Instagram to see our latest AI automation projects and demos.',
        message_ar: '📸 تابع STS على إنستغرام لمشاهدة أحدث مشاريع وحلول الأتمتة والذكاء الاصطناعي.',
        url: 'https://www.instagram.com/sts_q8/',
      },
    },
    {
      sort_order: 5,
      title_en: 'TikTok 🎥',
      title_ar: 'تيك توك 🎥',
      action_type: 'send_link',
      active: true,
      config: {
        message_en: '🎥 Watch STS demos and tips on TikTok.',
        message_ar: '🎥 شاهد عروض STS ونصائحنا على تيك توك.',
        url: 'https://www.tiktok.com/@sts_q8',
      },
    },
    {
      sort_order: 6,
      title_en: 'Company Profile 📄',
      title_ar: 'الملف التعريفي 📄',
      action_type: 'send_document',
      active: true,
      config: {
        message_en: 'Here is our company profile. (Upload a PDF in Chat Menu to attach the real file.)',
        message_ar: 'هذا ملفنا التعريفي. (ارفع PDF من قائمة الشات لإرفاق الملف الحقيقي.)',
      },
    },
    {
      sort_order: 7,
      title_en: 'Book a Meeting 📅',
      title_ar: 'احجز اجتماع 📅',
      action_type: 'book_appointment',
      active: true,
      config: {
        message_en: 'Let’s book a meeting. I’ll ask a few quick questions.',
        message_ar: 'خلّنا نحجز اجتماع. بسوي أسألك كم سؤال سريع.',
      },
    },
    {
      sort_order: 8,
      title_en: 'Our Location 📍',
      title_ar: 'موقعنا 📍',
      action_type: 'send_location',
      active: true,
      config: {
        message_en: '📍 Visit us at STS Solutions.',
        message_ar: '📍 زورونا في STS للحلول التقنية.',
        name: 'STS Solutions',
        address: 'Kuwait City, Kuwait',
        lat: 29.3759,
        lng: 47.9774,
      },
    },
    {
      sort_order: 9,
      title_en: 'Talk to STS 👨‍💼',
      title_ar: 'تحدث مع فريق STS 👨‍💼',
      action_type: 'human_handoff',
      active: true,
      config: {
        message_en: 'A member of the STS team will assist you shortly.',
        message_ar: 'سيقوم أحد أعضاء فريق STS بمساعدتك قريباً.',
      },
    },
  ]
}

/** Country Arabic dialects — English replies always stay American English. */
export const ARABIC_DIALECTS = [
  { id: 'bahraini', label: 'Bahrain — اللهجة البحرينية', country: 'Bahrain' },
  { id: 'kuwaiti', label: 'Kuwait — اللهجة الكويتية', country: 'Kuwait' },
  { id: 'saudi', label: 'Saudi Arabia — اللهجة السعودية', country: 'Saudi Arabia' },
  { id: 'iraqi', label: 'Iraq — اللهجة العراقية', country: 'Iraq' },
  { id: 'jordanian', label: 'Jordan — اللهجة الأردنية', country: 'Jordan' },
  { id: 'yemeni', label: 'Yemen — اللهجة اليمنية', country: 'Yemen' },
  { id: 'qatari', label: 'Qatar — اللهجة القطرية', country: 'Qatar' },
  { id: 'omani', label: 'Oman — اللهجة العُمانية', country: 'Oman' },
  { id: 'emirati', label: 'UAE — اللهجة الإماراتية', country: 'United Arab Emirates' },
  { id: 'auto', label: 'Automatic — Detect customer dialect', country: null },
]

export const ENGLISH_ACCENT = {
  id: 'american',
  label: 'American English',
  note: 'All English replies use American English (spelling, phrasing, tone).',
}

export const DIALECT_LABELS = Object.fromEntries(
  ARABIC_DIALECTS.filter((d) => d.country).map((d) => [d.id, d.country]),
)

export const DIALECT_BEHAVIORS = [
  { id: 'strict', label: 'Strict dialect' },
  { id: 'light', label: 'Light dialect' },
  { id: 'professional', label: 'Professional dialect' },
  { id: 'formal', label: 'Formal Arabic' },
]

export const FORMALITY_LEVELS = [
  { id: 'very_casual', label: 'Very casual' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'formal', label: 'Formal' },
]

export function detectMessageLang(text) {
  const s = String(text || '')
  const ar = (s.match(/[\u0600-\u06FF]/g) || []).length
  const la = (s.match(/[A-Za-z]/g) || []).length
  if (ar > la * 0.6 && ar > 2) return 'ar'
  if (la > ar * 0.6 && la > 2) return 'en'
  return 'unknown'
}

export function pickLang(text, bilingual, preferred) {
  if (bilingual) return 'both'
  const d = detectMessageLang(text)
  if (d === 'ar' || d === 'en') return d
  if (preferred === 'ar' || preferred === 'en') return preferred
  return 'en'
}

export function formatMenuText(menu, options, lang = 'en') {
  const intro = lang === 'ar'
    ? (menu.menu_intro_ar || menu.menu_intro_en || DEMO_INTRO_AR)
    : (menu.menu_intro_en || menu.menu_intro_ar || DEMO_INTRO_EN)
  const lines = [intro, '']
  const active = (options || []).filter((o) => o.active !== false).sort((a, b) => a.sort_order - b.sort_order)
  active.forEach((o, i) => {
    const n = i + 1
    const title = lang === 'ar' ? (o.title_ar || o.title_en) : (o.title_en || o.title_ar)
    if (lang === 'both') {
      lines.push(`${n}️⃣ ${o.title_en || ''}`)
      if (o.title_ar) lines.push(`   ${o.title_ar}`)
    } else {
      lines.push(`${n}️⃣ ${title}`)
    }
  })
  return lines.join('\n').trim()
}

export function formatGreeting(menu, lang = 'en') {
  if (lang === 'both' || menu.bilingual) {
    return [menu.greeting_en || DEMO_GREETING_EN, '', menu.greeting_ar || DEMO_GREETING_AR].join('\n')
  }
  if (lang === 'ar') return menu.greeting_ar || menu.greeting_en || DEMO_GREETING_AR
  return menu.greeting_en || menu.greeting_ar || DEMO_GREETING_EN
}
