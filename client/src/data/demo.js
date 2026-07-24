/**
 * Demo dashboard data — transcribed 1:1 from client.html. Used as the
 * fallback when the API is offline, exactly like the original which
 * tried the API then fell back to this seed data.
 */
export const demoConvs = [
  {
    id: 1, ch: 'whatsapp', name: 'Sara Al-Mutairi', prev: 'Is the new oud collection available?',
    time: '2m', unread: 2, mode: 'ai', phone: '+965 66xx 1122', since: 'Mar 2026', orders: 7,
    msgs: [
      { d: 'in', who: 'Sara', t: 'Hi! Is the new oud collection available for delivery?' },
      { d: 'ai', who: 'AI Agent', t: 'Hala Sara! 👋 Yes — the Royal Oud collection arrived this week. 50ml is 45 KWD and 100ml is 79 KWD. Would you like me to reserve one?' },
      { d: 'in', who: 'Sara', t: 'Yes please, 50ml. Do you deliver to Salmiya?' },
      { d: 'ai', who: 'AI Agent', t: 'We do! Delivery to Salmiya is 1.5 KWD, arriving same day for orders before 6 PM. Shall I confirm your order?' },
    ],
  },
  {
    id: 2, ch: 'instagram', name: '@khalid.kw', prev: 'How much is the premium package?',
    time: '11m', unread: 1, mode: 'ai', phone: 'IG DM', since: 'Jul 2026', orders: 0,
    msgs: [
      { d: 'in', who: '@khalid.kw', t: 'How much is the premium gift package?' },
      { d: 'ai', who: 'AI Agent', t: 'Ahlan! The premium gift box (3 x 30ml + candle) is 62 KWD, with free engraving this week ✨' },
    ],
  },
  {
    id: 3, ch: 'voice', name: '+965 55xx 7788', prev: 'Call · 1:58 · resolved by AI',
    time: '32m', unread: 0, mode: 'ai', phone: '+965 55xx 7788', since: '—', orders: 1,
    msgs: [
      { d: 'in', who: 'Caller', t: '[Transcript] What time do you close today?' },
      { d: 'ai', who: 'Voice AI', t: '[Transcript] We are open until 10 PM tonight. Anything else I can help with?' },
    ],
  },
  {
    id: 4, ch: 'web', name: 'Website visitor #8812', prev: 'Do you ship internationally?',
    time: '1h', unread: 0, mode: 'human', phone: 'Web widget', since: '—', orders: 0,
    msgs: [
      { d: 'in', who: 'Visitor', t: 'Do you ship internationally?' },
      { d: 'ai', who: 'AI Agent', t: 'Currently we deliver inside Kuwait. For GCC shipping, let me connect you with our team.' },
      { d: 'out', who: 'You', t: 'Hi! We can arrange GCC shipping via Aramex — where would you like it sent?' },
    ],
  },
  {
    id: 5, ch: 'whatsapp', name: 'Fatima H.', prev: 'Shukran! Order received 🌸',
    time: '3h', unread: 0, mode: 'ai', phone: '+965 99xx 4451', since: 'Jan 2026', orders: 12,
    msgs: [
      { d: 'ai', who: 'AI Agent', t: 'Your order #1042 is out for delivery 🚚' },
      { d: 'in', who: 'Fatima', t: 'Shukran! Order received 🌸' },
    ],
  },
]

export const chIcon = {
  whatsapp: ['wa', 'message-circle'],
  instagram: ['ig', 'instagram'],
  voice: ['vc', 'phone-call'],
  web: ['web', 'globe'],
}

export const invoices = [
  { no: 'INV-2026-0107', date: '1 Jul 2026', desc: 'Complete Growth — July', amt: '145.00 KWD' },
  { no: 'INV-2026-0086', date: '1 Jun 2026', desc: 'Complete Growth — June', amt: '145.00 KWD' },
  { no: 'INV-2026-0061', date: '1 May 2026', desc: 'Complete Growth — May', amt: '145.00 KWD' },
  { no: 'INV-2026-0043', date: '1 Apr 2026', desc: 'Social Growth — April', amt: '48.00 KWD' },
]
