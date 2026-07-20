/**
 * Monthly pricing — PUBLIC figures only.
 *
 * ⚠️ Deliberately excluded: OpenAI cost, fixed cost, total cost, profit and
 * margin. Those are internal numbers from the pricing sheet and must not be
 * published — they would expose the cost base to customers and competitors.
 * Keep them out of this file; anything here renders on the public page.
 *
 * All prices are monthly, in KWD.
 */

export const currency = 'KWD'

/* ---------------- Standalone services ---------------- */

export const standalonePlans = [
  {
    id: 'whatsapp',
    icon: 'whatsapp',
    accent: 'whatsapp',
    name: 'WhatsApp AI Chatbot',
    blurb:
      'Official WhatsApp Business API with 24/7 automated replies and clean human handoff.',
    unit: 'messages / month',
    tiers: [
      {
        name: 'Starter',
        volume: '2,500',
        price: 20.0,
        features: [
          '2,500 messages per month',
          'Official Meta WhatsApp API',
          '24/7 automated replies',
          'Human handoff to your team',
          'Conversation history',
        ],
      },
      {
        name: 'Growth',
        volume: '5,000',
        price: 25.0,
        popular: true,
        features: [
          '5,000 messages per month',
          'Everything in Starter',
          'Custom chatbot training',
          'Lead capture & tagging',
          'Priority support',
        ],
      },
      {
        name: 'Pro',
        volume: '10,000',
        price: 34.9,
        features: [
          '10,000 messages per month',
          'Everything in Growth',
          'Advanced automation rules',
          'Multi-agent assignment',
          'Monthly performance report',
        ],
      },
    ],
  },
  {
    id: 'instagram',
    icon: 'instagram',
    accent: 'instagram',
    name: 'Instagram Chatbot',
    blurb:
      'Automated Instagram DM replies in your brand voice, powered by ManyChat + n8n + AI.',
    unit: 'contacts / month',
    tiers: [
      {
        name: 'Starter',
        volume: '2,500',
        price: 20.0,
        features: [
          '2,500 contacts per month',
          'Instant DM auto-replies',
          'On-brand tone & language',
          'Story reply automation',
          'Conversation history',
        ],
      },
      {
        name: 'Growth',
        volume: '5,000',
        price: 32.0,
        popular: true,
        features: [
          '5,000 contacts per month',
          'Everything in Starter',
          'Comment-to-DM automation',
          'Lead capture & tagging',
          'Priority support',
        ],
      },
      {
        name: 'Business',
        volume: '10,000',
        price: 55.0,
        features: [
          '10,000 contacts per month',
          'Everything in Growth',
          'Advanced flow builder',
          'Product catalogue answers',
          'Monthly performance report',
        ],
      },
    ],
  },
  {
    id: 'voice',
    icon: 'phone',
    accent: 'voice',
    name: 'AI Voice Calling Agent',
    blurb:
      'A natural-sounding AI agent that answers inbound calls, makes outbound calls, and logs every transcript.',
    unit: 'included minutes / month',
    tiers: [
      {
        name: 'Voice Starter',
        volume: '150',
        price: 39.0,
        note: 'Standard voice',
        features: [
          '150 included minutes',
          'Inbound call answering',
          'Standard AI voice',
          'Full call transcripts',
          'Call summary & logging',
        ],
      },
      {
        name: 'Voice Standard',
        volume: '900',
        price: 119.0,
        popular: true,
        note: 'Standard voice',
        features: [
          '900 included minutes',
          'Inbound + outbound calling',
          'Standard AI voice',
          'Full call transcripts',
          'CRM-ready call data',
        ],
      },
      {
        name: 'Voice Premium',
        volume: '900',
        price: 329.0,
        note: 'ElevenLabs premium voice',
        features: [
          '900 included minutes',
          'Inbound + outbound calling',
          'Premium ElevenLabs voice',
          'Most natural conversation quality',
          'Priority call routing',
        ],
      },
    ],
  },
]

/* ---------------- Bundles ---------------- */

export const bundles = [
  {
    id: 'social',
    name: 'Social Bundle',
    subtitle: 'WhatsApp + Instagram',
    description:
      'Both messaging channels answered by one AI, with a single shared inbox and one monthly bill.',
    icon: 'layers',
    tiers: [
      {
        name: 'Social Starter',
        includes: 'WhatsApp Starter + Instagram Starter',
        separate: 40.0,
        price: 34.0,
        features: ['2,500 WhatsApp messages', '2,500 Instagram contacts', 'Shared unified inbox'],
      },
      {
        name: 'Social Growth',
        includes: 'WhatsApp Growth + Instagram Growth',
        separate: 57.0,
        price: 48.0,
        popular: true,
        features: ['5,000 WhatsApp messages', '5,000 Instagram contacts', 'Lead capture across both'],
      },
      {
        name: 'Social Pro',
        includes: 'WhatsApp Pro + Instagram Business',
        separate: 89.9,
        price: 76.0,
        features: ['10,000 WhatsApp messages', '10,000 Instagram contacts', 'Advanced automation rules'],
      },
    ],
  },
  {
    id: 'complete',
    name: 'Complete Bundle',
    subtitle: 'WhatsApp + Instagram + Voice',
    description:
      'Every channel automated — messaging and phone calls — in one dashboard, at the lowest combined price.',
    icon: 'sparkle',
    featured: true,
    tiers: [
      {
        name: 'Complete Starter',
        includes: 'WA Starter + IG Starter + Voice Starter',
        separate: 79.0,
        price: 65.0,
        features: ['2,500 WhatsApp messages', '2,500 Instagram contacts', '150 voice minutes'],
      },
      {
        name: 'Complete Growth',
        includes: 'WA Growth + IG Growth + Voice Standard',
        separate: 176.0,
        price: 145.0,
        popular: true,
        features: ['5,000 WhatsApp messages', '5,000 Instagram contacts', '900 voice minutes'],
      },
      {
        name: 'Complete Pro',
        includes: 'WA Pro + IG Business + Voice Premium',
        separate: 418.9,
        price: 349.0,
        features: [
          '10,000 WhatsApp messages',
          '10,000 Instagram contacts',
          '900 premium voice minutes',
        ],
      },
    ],
  },
]

/* ---------------- Helpers ---------------- */

/** Format a number as a KWD price, e.g. 34.9 → "34.90". */
export function formatPrice(value) {
  return value.toFixed(2)
}

/** Absolute monthly saving of a bundle versus buying separately. */
export function savings(tier) {
  return tier.separate - tier.price
}

/** Percentage saving, rounded to a whole number. */
export function savingsPercent(tier) {
  return Math.round((savings(tier) / tier.separate) * 100)
}
