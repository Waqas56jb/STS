/**
 * Admin demo data — transcribed 1:1 from admin.html. Used as the fallback
 * when the /api/admin/* endpoints are offline, exactly like the original.
 */
export const demoRequests = [
  { id: 1, business_name: 'Lulu Flowers KW', contact_name: 'Noura S.', email: 'noura@luluflowers.com', whatsapp: '+965 66x 1189', interested_plan: 'bundle_social', message: 'We get 100+ Instagram DMs a day and miss most of them. Need auto-replies in Arabic and English.', created: 'Today, 09:12' },
  { id: 2, business_name: 'Q8 Fitness Hub', contact_name: 'Bader A.', email: 'bader@q8fitness.com', whatsapp: '+965 99x 5521', interested_plan: 'bundle_complete', message: 'Want WhatsApp bot for class bookings plus a voice agent to answer calls about membership.', created: 'Yesterday, 18:40' },
  { id: 3, business_name: 'Mama Ghanima Kitchen', contact_name: 'Ghanima F.', email: 'orders@mamaghanima.com', whatsapp: '+965 55x 7710', interested_plan: 'whatsapp', message: 'Daily menu orders on WhatsApp are overwhelming us. Can the bot take orders?', created: '2 days ago' },
]

export const demoUsers = [
  { id: 1, biz: 'Al Noor Perfumes', email: 'owner@alnoorperfumes.com', plan: 'Complete Growth', mrr: 145, ch: ['wa', 'ig', 'vc'], status: 'paid' },
  { id: 2, biz: 'Shgardi Auto', email: 'sts@shgardiauto.com', plan: 'Complete Pro', mrr: 349, ch: ['wa', 'ig', 'vc'], status: 'paid' },
  { id: 3, biz: 'Dar Al Teeb', email: 'info@daralteeb.com', plan: 'Social Pro', mrr: 76, ch: ['wa', 'ig'], status: 'paid' },
  { id: 4, biz: 'Kuwait Dental Co.', email: 'admin@kwdental.com', plan: 'Complete Growth', mrr: 145, ch: ['wa', 'ig', 'vc'], status: 'paid' },
  { id: 5, biz: 'Bayt Al Halwa', email: 'hala@baytalhalwa.com', plan: 'WhatsApp Growth', mrr: 25, ch: ['wa'], status: 'paid' },
  { id: 6, biz: 'Marina Cafe', email: 'mgr@marinacafe.kw', plan: 'Free / Trial', mrr: 0, ch: ['wa'], status: 'free' },
  { id: 7, biz: 'Zahra Boutique', email: 'zahra@zboutique.com', plan: 'Instagram Growth', mrr: 32, ch: ['ig'], status: 'paid' },
  { id: 8, biz: 'GulfTech Repairs', email: 'ops@gulftech.kw', plan: 'WhatsApp Starter', mrr: 20, ch: ['wa'], status: 'suspended' },
]

export const demoPays = [
  { ref: 'PAY-8841', biz: 'Shgardi Auto', meth: 'KNET', amt: '349.00', date: '21 Jul 2026', st: 'paid' },
  { ref: 'PAY-8836', biz: 'Al Noor Perfumes', meth: 'Credit Card', amt: '145.00', date: '20 Jul 2026', st: 'paid' },
  { ref: 'PAY-8830', biz: 'Dar Al Teeb', meth: 'Bank Transfer', amt: '76.00', date: '18 Jul 2026', st: 'paid' },
  { ref: 'PAY-8822', biz: 'GulfTech Repairs', meth: 'KNET', amt: '20.00', date: '15 Jul 2026', st: 'failed' },
  { ref: 'PAY-8817', biz: 'Zahra Boutique', meth: 'Link', amt: '32.00', date: '14 Jul 2026', st: 'pending' },
]

export const demoInvs = [
  { no: 'INV-2026-0112', biz: 'Shgardi Auto', desc: 'Complete Pro — July', amt: '349.00', due: '1 Jul 2026', st: 'paid' },
  { no: 'INV-2026-0107', biz: 'Al Noor Perfumes', desc: 'Complete Growth — July', amt: '145.00', due: '1 Jul 2026', st: 'paid' },
  { no: 'INV-2026-0104', biz: 'Kuwait Dental Co.', desc: 'Complete Growth — July', amt: '145.00', due: '1 Jul 2026', st: 'unpaid' },
  { no: 'INV-2026-0101', biz: 'GulfTech Repairs', desc: 'WhatsApp Starter — July', amt: '20.00', due: '1 Jul 2026', st: 'overdue' },
  { no: 'INV-2026-0099', biz: 'Marina Cafe', desc: 'Setup fee', amt: '48.00', due: '25 Jun 2026', st: 'overdue' },
]

export const demoPlans = [
  { name: 'WhatsApp Starter', cat: 'WhatsApp', quota: '2,500 msgs', price: '20.00', subs: 6 },
  { name: 'WhatsApp Growth', cat: 'WhatsApp', quota: '5,000 msgs', price: '25.00', subs: 8 },
  { name: 'WhatsApp Pro', cat: 'WhatsApp', quota: '10,000 msgs', price: '34.90', subs: 3 },
  { name: 'Instagram Starter', cat: 'Instagram', quota: '2,500 contacts', price: '20.00', subs: 2 },
  { name: 'Instagram Growth', cat: 'Instagram', quota: '5,000 contacts', price: '32.00', subs: 4 },
  { name: 'Instagram Business', cat: 'Instagram', quota: '10,000 contacts', price: '55.00', subs: 1 },
  { name: 'Voice Starter', cat: 'Voice', quota: '150 min', price: '39.00', subs: 2 },
  { name: 'Voice Standard', cat: 'Voice', quota: '900 min', price: '119.00', subs: 2 },
  { name: 'Voice Premium (ElevenLabs)', cat: 'Voice', quota: '900 min', price: '329.00', subs: 1 },
  { name: 'Social Starter', cat: 'Bundle', quota: 'WA+IG Starter', price: '34.00', subs: 1 },
  { name: 'Social Growth', cat: 'Bundle', quota: 'WA+IG Growth', price: '48.00', subs: 2 },
  { name: 'Social Pro', cat: 'Bundle', quota: 'WA Pro + IG Biz', price: '76.00', subs: 2 },
  { name: 'Complete Starter', cat: 'Bundle', quota: 'All 3 Starter', price: '65.00', subs: 1 },
  { name: 'Complete Growth', cat: 'Bundle', quota: 'All 3 Growth', price: '145.00', subs: 4 },
  { name: 'Complete Pro', cat: 'Bundle', quota: 'All 3 Pro', price: '349.00', subs: 1 },
]

/** Add-business modal plan dropdown options (value → label). */
export const planOptions = [
  { v: 'wa_starter', l: 'WhatsApp Starter — 20 KWD' },
  { v: 'wa_growth', l: 'WhatsApp Growth — 25 KWD' },
  { v: 'wa_pro', l: 'WhatsApp Pro — 34.90 KWD' },
  { v: 'ig_starter', l: 'Instagram Starter — 20 KWD' },
  { v: 'ig_growth', l: 'Instagram Growth — 32 KWD' },
  { v: 'ig_business', l: 'Instagram Business — 55 KWD' },
  { v: 'voice_starter', l: 'Voice Starter — 39 KWD' },
  { v: 'voice_standard', l: 'Voice Standard — 119 KWD' },
  { v: 'voice_premium', l: 'Voice Premium — 329 KWD' },
  { v: 'social_starter', l: 'Social Starter — 34 KWD' },
  { v: 'social_growth', l: 'Social Growth — 48 KWD' },
  { v: 'social_pro', l: 'Social Pro — 76 KWD' },
  { v: 'complete_starter', l: 'Complete Starter — 65 KWD' },
  { v: 'complete_growth', l: 'Complete Growth — 145 KWD' },
  { v: 'complete_pro', l: 'Complete Pro — 349 KWD' },
  { v: 'free', l: 'Free / Trial — 0 KWD' },
]

/* ---- helpers (ported from admin.html) ---- */
export const stBadge = (s) =>
  ({ paid: 'b-ok', free: 'b-free', suspended: 'b-bad', pending: 'b-warn', failed: 'b-bad', unpaid: 'b-warn', overdue: 'b-bad' }[s] || 'b-info')

export const chIco = {
  wa: ['#25D366', 'message-circle'],
  ig: ['#DD2A7B', 'instagram'],
  vc: ['#5B8DEF', 'phone-call'],
}

export const planLbl = {
  whatsapp: 'WhatsApp Chatbot',
  instagram: 'Instagram Chatbot',
  voice: 'AI Voice Agent',
  bundle_social: 'Social Bundle',
  bundle_complete: 'Complete Bundle',
}
