import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, one, many } from '../db.js'
import {
  demoMenuOptions, formatGreeting, formatMenuText, pickLang, detectMessageLang,
  DEMO_GREETING_EN, DEMO_GREETING_AR, DEMO_INTRO_EN, DEMO_INTRO_AR,
} from './chatMenuShared.js'
import { sendQrText, sendQrImage, sendQrDocument, sendQrVideo, sendQrLocation, sendQrContact } from './whatsappQr.js'
import { sendWhatsAppText } from './whatsapp.js'
import { resolveWhatsAppProvider } from './channels.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const CHAT_MENU_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'chat-menu')

export async function ensureChatMenuSchema() {
  await pool.query(`
    create table if not exists sts_chat_menus (
      business_id uuid primary key references sts_businesses(id) on delete cascade,
      enabled boolean default true,
      bilingual boolean default false,
      reset_hours int default 24,
      greeting_en text,
      greeting_ar text,
      menu_intro_en text,
      menu_intro_ar text,
      updated_at timestamptz default now()
    )`)
  await pool.query(`
    create table if not exists sts_chat_menu_options (
      id uuid primary key default gen_random_uuid(),
      business_id uuid not null references sts_businesses(id) on delete cascade,
      sort_order int not null default 1,
      title_en text not null default '',
      title_ar text not null default '',
      action_type text not null default 'static_response',
      config jsonb not null default '{}'::jsonb,
      active boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )`)
  await pool.query(`create index if not exists idx_chat_menu_opts_biz on sts_chat_menu_options(business_id, sort_order)`)
  await pool.query(`
    create table if not exists sts_chat_menu_contacts (
      business_id uuid not null references sts_businesses(id) on delete cascade,
      customer_handle text not null,
      menu_shown_at timestamptz,
      language text,
      submenu_parent_id uuid,
      booking_step int default 0,
      booking_data jsonb default '{}'::jsonb,
      pending_ai_instruction text,
      updated_at timestamptz default now(),
      primary key (business_id, customer_handle)
    )`)
  // Dialect columns on bot settings
  await pool.query(`alter table sts_bot_settings add column if not exists primary_language text default 'auto'`)
  await pool.query(`alter table sts_bot_settings add column if not exists arabic_dialect text default 'kuwaiti'`)
  await pool.query(`alter table sts_bot_settings add column if not exists dialect_behavior text default 'professional'`)
  await pool.query(`alter table sts_bot_settings add column if not exists auto_match_dialect boolean default true`)
  await pool.query(`alter table sts_bot_settings add column if not exists force_business_dialect boolean default false`)
  await pool.query(`alter table sts_bot_settings add column if not exists formality text default 'friendly'`)
  await pool.query(`alter table sts_bot_settings add column if not exists preferred_words text`)
  await pool.query(`alter table sts_bot_settings add column if not exists avoid_words text`)
  try { fs.mkdirSync(CHAT_MENU_UPLOAD_DIR, { recursive: true }) } catch { /* ok */ }
}

export async function getOrCreateMenu(businessId) {
  let menu = await one(`select * from sts_chat_menus where business_id=$1`, [businessId])
  if (!menu) {
    menu = await one(
      `insert into sts_chat_menus (business_id, enabled, bilingual, reset_hours, greeting_en, greeting_ar, menu_intro_en, menu_intro_ar)
       values ($1, true, true, 24, $2, $3, $4, $5) returning *`,
      [businessId, DEMO_GREETING_EN, DEMO_GREETING_AR, DEMO_INTRO_EN, DEMO_INTRO_AR],
    )
    const count = await one(`select count(*)::int n from sts_chat_menu_options where business_id=$1`, [businessId])
    if (!count?.n) {
      for (const o of demoMenuOptions()) {
        await pool.query(
          `insert into sts_chat_menu_options (business_id, sort_order, title_en, title_ar, action_type, config, active)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [businessId, o.sort_order, o.title_en, o.title_ar, o.action_type, JSON.stringify(o.config || {}), o.active !== false],
        )
      }
    }
  }
  const options = await many(
    `select * from sts_chat_menu_options where business_id=$1 order by sort_order asc, created_at asc`,
    [businessId],
  )
  return { menu, options: options.map(shapeOption) }
}

function shapeOption(r) {
  return {
    id: r.id,
    business_id: r.business_id,
    sort_order: r.sort_order,
    title_en: r.title_en,
    title_ar: r.title_ar,
    action_type: r.action_type,
    config: typeof r.config === 'string' ? JSON.parse(r.config) : (r.config || {}),
    active: r.active !== false,
  }
}

export async function saveMenu(businessId, body = {}) {
  const {
    enabled, bilingual, reset_hours, greeting_en, greeting_ar, menu_intro_en, menu_intro_ar, options,
  } = body
  await pool.query(
    `insert into sts_chat_menus (business_id, enabled, bilingual, reset_hours, greeting_en, greeting_ar, menu_intro_en, menu_intro_ar, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())
     on conflict (business_id) do update set
       enabled=excluded.enabled, bilingual=excluded.bilingual, reset_hours=excluded.reset_hours,
       greeting_en=excluded.greeting_en, greeting_ar=excluded.greeting_ar,
       menu_intro_en=excluded.menu_intro_en, menu_intro_ar=excluded.menu_intro_ar, updated_at=now()`,
    [
      businessId,
      enabled !== false,
      !!bilingual,
      reset_hours == null ? 24 : Number(reset_hours),
      greeting_en ?? DEMO_GREETING_EN,
      greeting_ar ?? DEMO_GREETING_AR,
      menu_intro_en ?? DEMO_INTRO_EN,
      menu_intro_ar ?? DEMO_INTRO_AR,
    ],
  )
  if (Array.isArray(options)) {
    const keep = []
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      const sort = i + 1
      const cfg = JSON.stringify(o.config || {})
      if (o.id) {
        const row = await one(
          `update sts_chat_menu_options set sort_order=$2, title_en=$3, title_ar=$4, action_type=$5, config=$6, active=$7, updated_at=now()
            where id=$1 and business_id=$8 returning id`,
          [o.id, sort, o.title_en || '', o.title_ar || '', o.action_type || 'static_response', cfg, o.active !== false, businessId],
        )
        if (row) keep.push(row.id)
      } else {
        const row = await one(
          `insert into sts_chat_menu_options (business_id, sort_order, title_en, title_ar, action_type, config, active)
           values ($1,$2,$3,$4,$5,$6,$7) returning id`,
          [businessId, sort, o.title_en || '', o.title_ar || '', o.action_type || 'static_response', cfg, o.active !== false],
        )
        keep.push(row.id)
      }
    }
    if (keep.length) {
      await pool.query(
        `delete from sts_chat_menu_options where business_id=$1 and not (id=any($2::uuid[]))`,
        [businessId, keep],
      )
    } else {
      await pool.query(`delete from sts_chat_menu_options where business_id=$1`, [businessId])
    }
  }
  return getOrCreateMenu(businessId)
}

async function getContactState(businessId, handle) {
  return one(
    `select * from sts_chat_menu_contacts where business_id=$1 and customer_handle=$2`,
    [businessId, handle],
  )
}

async function upsertContact(businessId, handle, patch = {}) {
  const cur = await getContactState(businessId, handle)
  if (!cur) {
    return one(
      `insert into sts_chat_menu_contacts (business_id, customer_handle, menu_shown_at, language, booking_step, booking_data, pending_ai_instruction, submenu_parent_id, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8, now()) returning *`,
      [
        businessId, handle,
        patch.menu_shown_at || null,
        patch.language || null,
        patch.booking_step || 0,
        JSON.stringify(patch.booking_data || {}),
        patch.pending_ai_instruction || null,
        patch.submenu_parent_id || null,
      ],
    )
  }
  const next = { ...cur, ...patch }
  return one(
    `update sts_chat_menu_contacts set
       menu_shown_at=$3, language=$4, booking_step=$5, booking_data=$6::jsonb,
       pending_ai_instruction=$7, submenu_parent_id=$8, updated_at=now()
     where business_id=$1 and customer_handle=$2 returning *`,
    [
      businessId, handle,
      next.menu_shown_at, next.language,
      next.booking_step || 0,
      JSON.stringify(next.booking_data || {}),
      next.pending_ai_instruction || null,
      next.submenu_parent_id || null,
    ],
  )
}

function needsWelcome(menu, contact) {
  if (!menu?.enabled) return false
  if (!contact?.menu_shown_at) return true
  const hours = Number(menu.reset_hours)
  if (!hours || hours <= 0) return false
  const age = (Date.now() - new Date(contact.menu_shown_at).getTime()) / 3600000
  return age >= hours
}

async function sendText(ctx, text) {
  if (!text) return
  const { provider, businessId, to, creds } = ctx
  if (provider === 'qr') return sendQrText(businessId, to, text)
  return sendWhatsAppText(creds, to, text)
}

function cfgText(cfg, lang, enKey, arKey) {
  if (lang === 'ar') return cfg[arKey] || cfg[enKey] || ''
  return cfg[enKey] || cfg[arKey] || ''
}

function resolveMediaPath(rel) {
  if (!rel) return null
  const full = path.isAbsolute(rel) ? rel : path.join(CHAT_MENU_UPLOAD_DIR, rel)
  return fs.existsSync(full) ? full : null
}

async function executeAction(ctx, option, lang) {
  const cfg = option.config || {}
  const { provider, businessId, to } = ctx

  switch (option.action_type) {
    case 'static_response': {
      await sendText(ctx, cfgText(cfg, lang, 'response_en', 'response_ar'))
      return { handled: true, continueAi: false }
    }
    case 'send_link': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      const url = cfg.url || ''
      await sendText(ctx, [msg, url].filter(Boolean).join('\n\n'))
      return { handled: true, continueAi: false }
    }
    case 'send_image': {
      const caption = cfgText(cfg, lang, 'caption_en', 'caption_ar')
      const file = resolveMediaPath(cfg.file)
      if (provider === 'qr' && file) {
        await sendQrImage(businessId, to, file, caption)
      } else {
        await sendText(ctx, caption || '📷 Image')
      }
      return { handled: true, continueAi: false }
    }
    case 'send_video': {
      const caption = cfgText(cfg, lang, 'caption_en', 'caption_ar')
      const file = resolveMediaPath(cfg.file)
      if (provider === 'qr' && file) {
        await sendQrVideo(businessId, to, file, caption)
      } else {
        await sendText(ctx, caption || '🎬 Video')
      }
      return { handled: true, continueAi: false }
    }
    case 'send_document': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      const file = resolveMediaPath(cfg.file)
      if (provider === 'qr' && file) {
        await sendQrDocument(businessId, to, file, path.basename(file), msg)
      } else {
        await sendText(ctx, msg || '📄 Document')
      }
      return { handled: true, continueAi: false }
    }
    case 'send_location': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      if (msg) await sendText(ctx, msg)
      if (provider === 'qr' && cfg.lat != null && cfg.lng != null) {
        await sendQrLocation(businessId, to, {
          name: cfg.name || '',
          address: cfg.address || '',
          lat: Number(cfg.lat),
          lng: Number(cfg.lng),
        })
      } else {
        await sendText(ctx, `${cfg.name || ''}\n${cfg.address || ''}\n${cfg.lat},${cfg.lng}`)
      }
      return { handled: true, continueAi: false }
    }
    case 'send_contact': {
      if (provider === 'qr') {
        await sendQrContact(businessId, to, {
          fullName: cfg.contact_name || 'Contact',
          org: cfg.company || '',
          phone: cfg.phone || '',
          email: cfg.email || '',
        })
      } else {
        await sendText(ctx, `${cfg.contact_name || ''}\n${cfg.company || ''}\n${cfg.phone || ''}\n${cfg.email || ''}`)
      }
      return { handled: true, continueAi: false }
    }
    case 'human_handoff': {
      await pool.query(`update sts_conversations set mode='human' where business_id=$1 and channel='whatsapp' and customer_handle=$2`, [businessId, ctx.handle])
      await sendText(ctx, cfgText(cfg, lang, 'message_en', 'message_ar') || 'A team member will assist you shortly.')
      return { handled: true, continueAi: false, handoff: true }
    }
    case 'start_ai': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      if (msg) await sendText(ctx, msg)
      await upsertContact(businessId, ctx.handle, { pending_ai_instruction: null, submenu_parent_id: null })
      return { handled: true, continueAi: true }
    }
    case 'custom_ai': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      if (msg) await sendText(ctx, msg)
      await upsertContact(businessId, ctx.handle, { pending_ai_instruction: cfg.ai_instruction || '' })
      return { handled: true, continueAi: true, aiInstruction: cfg.ai_instruction }
    }
    case 'start_submenu': {
      const subs = cfg.submenu_options || []
      const title = lang === 'ar' ? (cfg.submenu_title_ar || cfg.submenu_title_en) : (cfg.submenu_title_en || cfg.submenu_title_ar)
      const lines = [title || 'Options', '']
      subs.forEach((s, i) => {
        const t = lang === 'ar' ? (s.title_ar || s.title_en) : (s.title_en || s.title_ar)
        lines.push(`${i + 1}️⃣ ${t}`)
      })
      lines.push('', lang === 'ar' ? '٠ للرجوع للقائمة الرئيسية' : '0 to go back to main menu')
      await upsertContact(businessId, ctx.handle, { submenu_parent_id: option.id })
      await sendText(ctx, lines.join('\n'))
      return { handled: true, continueAi: false }
    }
    case 'book_appointment': {
      const msg = cfgText(cfg, lang, 'message_en', 'message_ar')
      if (msg) await sendText(ctx, msg)
      await upsertContact(businessId, ctx.handle, {
        booking_step: 1,
        booking_data: {},
        submenu_parent_id: null,
      })
      await sendText(ctx, lang === 'ar' ? 'ما اسمك؟' : 'What is your name?')
      return { handled: true, continueAi: false }
    }
    default:
      await sendText(ctx, cfgText(cfg, lang, 'response_en', 'response_ar') || option.title_en)
      return { handled: true, continueAi: false }
  }
}

function matchOption(text, options) {
  const raw = String(text || '').trim()
  const digits = raw.replace(/[^\d]/g, '')
  if (digits && /^\d{1,2}$/.test(digits)) {
    const n = Number(digits)
    const active = options.filter((o) => o.active !== false).sort((a, b) => a.sort_order - b.sort_order)
    if (n >= 1 && n <= active.length) return active[n - 1]
  }
  const lower = raw.toLowerCase()
  for (const o of options.filter((x) => x.active !== false)) {
    const en = String(o.title_en || '').toLowerCase()
    const ar = String(o.title_ar || '')
    if (en && lower.includes(en.replace(/[^\p{L}\p{N}\s]/gu, '').trim().slice(0, 12))) return o
    if (ar && raw.includes(ar.replace(/[^\u0600-\u06FF\s]/g, '').trim().slice(0, 8))) return o
  }
  // keyword maps
  const rules = [
    [/demo|تجرب|عرض/i, /free demo|تجربة/i],
    [/package|باق|سعر|price|pricing/i, /packages|باقات/i],
    [/instagram|انستغ|إنستغ/i, /instagram|إنستغرام/i],
    [/tiktok|تيك/i, /tiktok|تيك/i],
    [/location|موقع|وينكم|فينكم/i, /location|موقع/i],
    [/human|موظف|فريق|speak|talk to|كلم/i, /talk to|تحدث|team|فريق/i],
    [/book|meeting|اجتماع|احجز/i, /book|احجز|meeting/i],
    [/profile|ملف|pdf|company/i, /profile|ملف/i],
    [/service|خدم/i, /service|خدمات/i],
  ]
  for (const [pat, titlePat] of rules) {
    if (pat.test(raw)) {
      const hit = options.find((o) => titlePat.test(o.title_en || '') || titlePat.test(o.title_ar || ''))
      if (hit) return hit
    }
  }
  return null
}

const BOOKING_QUESTIONS = {
  en: [
    'What is your name?',
    'What company are you contacting us from?',
    'What service are you interested in?',
    'What day/time works for you?',
  ],
  ar: [
    'ما اسمك؟',
    'من أي شركة تتواصل معنا؟',
    'أي خدمة مهتم فيها؟',
    'أي يوم/وقت يناسبك؟',
  ],
}

async function handleBooking(ctx, contact, text, lang) {
  const step = Number(contact.booking_step || 0)
  const data = contact.booking_data || {}
  const keys = ['name', 'company', 'service', 'datetime']
  if (step >= 1 && step <= 4) {
    data[keys[step - 1]] = text
  }
  if (step < 4) {
    const next = step + 1
    await upsertContact(ctx.businessId, ctx.handle, { booking_step: next, booking_data: data })
    const qs = lang === 'ar' ? BOOKING_QUESTIONS.ar : BOOKING_QUESTIONS.en
    await sendText(ctx, qs[next - 1])
    return { handled: true, continueAi: false }
  }
  // save lead
  await pool.query(
    `insert into sts_leads (business_id, name, contact, channel, status, notes)
     values ($1,$2,$3,'whatsapp','new',$4)`,
    [
      ctx.businessId,
      data.name || ctx.handle,
      ctx.handle,
      `Meeting request\nCompany: ${data.company || '—'}\nService: ${data.service || '—'}\nWhen: ${data.datetime || '—'}`,
    ],
  ).catch(async () => {
    // notes column may not exist
    await pool.query(
      `insert into sts_leads (business_id, name, contact, channel, status)
       select $1,$2,$3,'whatsapp','new'
       where not exists (select 1 from sts_leads where business_id=$1 and contact=$3)`,
      [ctx.businessId, data.name || ctx.handle, ctx.handle],
    )
  })
  await upsertContact(ctx.businessId, ctx.handle, { booking_step: 0, booking_data: {} })
  await sendText(ctx, lang === 'ar'
    ? `شكراً ${data.name || ''}! استلمنا طلبك وبيتواصل معك فريق STS قريب.`
    : `Thanks ${data.name || ''}! We received your request — STS will contact you soon.`)
  return { handled: true, continueAi: false }
}

/**
 * Process WhatsApp inbound against chat menu.
 * @returns {{ handled: boolean, continueAi?: boolean, aiInstruction?: string, skipDefaultGreeting?: boolean }}
 */
export async function processChatMenuInbound({
  businessId, handle, text, provider, creds, to,
}) {
  const { menu, options } = await getOrCreateMenu(businessId)
  if (!menu.enabled) return { handled: false }

  const contact = await getContactState(businessId, handle)
  const lang = pickLang(text, menu.bilingual, contact?.language || detectMessageLang(text))
  const storeLang = lang === 'both' ? (detectMessageLang(text) === 'ar' ? 'ar' : 'en') : lang
  const ctx = { businessId, handle, provider: provider || resolveWhatsAppProvider(creds), creds, to: to || handle }

  // booking flow in progress
  if (contact?.booking_step > 0) {
    return handleBooking(ctx, { ...contact, booking_data: typeof contact.booking_data === 'string' ? JSON.parse(contact.booking_data) : (contact.booking_data || {}) }, text, storeLang)
  }

  // submenu navigation
  if (contact?.submenu_parent_id) {
    const parent = options.find((o) => o.id === contact.submenu_parent_id)
    const raw = String(text || '').trim()
    if (raw === '0' || /back|رجوع|القائمة/i.test(raw)) {
      await upsertContact(businessId, handle, { submenu_parent_id: null })
      await sendText(ctx, formatMenuText(menu, options, storeLang))
      return { handled: true, continueAi: false }
    }
    const subs = parent?.config?.submenu_options || []
    const digits = raw.replace(/[^\d]/g, '')
    let sub = null
    if (digits && Number(digits) >= 1 && Number(digits) <= subs.length) sub = subs[Number(digits) - 1]
    if (!sub) {
      sub = subs.find((s) => raw.toLowerCase().includes(String(s.title_en || '').toLowerCase().slice(0, 8))
        || (s.title_ar && raw.includes(s.title_ar.slice(0, 6))))
    }
    if (sub) {
      const fake = { action_type: sub.action_type, title_en: sub.title_en, title_ar: sub.title_ar, config: sub, active: true }
      await upsertContact(businessId, handle, { submenu_parent_id: null })
      return executeAction(ctx, fake, storeLang)
    }
  }

  const welcome = needsWelcome(menu, contact)
  if (welcome) {
    await sendText(ctx, formatGreeting(menu, menu.bilingual ? 'both' : storeLang))
    await new Promise((r) => setTimeout(r, 700))
    await sendText(ctx, formatMenuText(menu, options, menu.bilingual ? 'both' : storeLang))
    await upsertContact(businessId, handle, { menu_shown_at: new Date().toISOString(), language: storeLang })
    // If first message looks like a menu pick, still try to run it after welcome
    const pick = matchOption(text, options)
    if (pick && !/^(hi|hello|hey|هلا|مرحبا|السلام)/i.test(String(text).trim())) {
      await new Promise((r) => setTimeout(r, 400))
      return executeAction(ctx, pick, storeLang)
    }
    return { handled: true, continueAi: false, welcomed: true }
  }

  const pick = matchOption(text, options)
  if (pick) {
    await upsertContact(businessId, handle, { language: storeLang })
    return executeAction(ctx, pick, storeLang)
  }

  // pending custom AI instruction — let AI continue
  if (contact?.pending_ai_instruction) {
    return { handled: false, continueAi: true, aiInstruction: contact.pending_ai_instruction }
  }

  return { handled: false }
}

export async function resetContactMenu(businessId, handle) {
  await pool.query(
    `delete from sts_chat_menu_contacts where business_id=$1 and customer_handle=$2`,
    [businessId, handle],
  )
  return { ok: true }
}

export async function sendTestMenuSequence({ businessId, to, provider, creds }) {
  const { menu, options } = await getOrCreateMenu(businessId)
  const ctx = { businessId, handle: to, provider: provider || 'qr', creds, to }
  await sendText(ctx, formatGreeting(menu, menu.bilingual ? 'both' : 'en'))
  await new Promise((r) => setTimeout(r, 700))
  await sendText(ctx, formatMenuText(menu, options, menu.bilingual ? 'both' : 'en'))
  return { ok: true }
}
