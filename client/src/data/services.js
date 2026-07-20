import { photos } from './images'

/**
 * The four services featured on the page.
 * `accent` maps to a colour treatment in the ServiceCard component.
 */
export const services = [
  {
    id: 'whatsapp',
    icon: 'whatsapp',
    accent: 'whatsapp',
    title: 'WhatsApp AI Chatbot',
    summary:
      'Built on the official WhatsApp Business API. Your AI agent answers every customer in seconds — around the clock — and hands the conversation to your team the moment a human is needed.',
    points: [
      'Official Meta WhatsApp Business API',
      'Replies 24/7, including weekends',
      'Automatic human handoff on request',
      'Trained on your catalogue and policies',
    ],
    image: photos.automation,
    imageAlt: 'Automated systems running alongside an engineer at a workstation',
    stat: { value: '<10s', label: 'Typical first reply' },
  },
  {
    id: 'instagram',
    icon: 'instagram',
    accent: 'instagram',
    title: 'Instagram Chatbot',
    summary:
      "Instagram DMs answered the moment they arrive, in your brand's voice. A product question at midnight gets a real answer instead of waiting until the morning.",
    points: [
      'Instant DM auto-replies',
      'Comment-to-DM automation',
      'Answers in Arabic or English',
      'Captures every enquiry as a lead',
    ],
    image: photos.network,
    imageAlt: 'Abstract network of connected nodes representing automated messaging',
    stat: { value: '24/7', label: 'Always answering' },
  },
  {
    id: 'voice',
    icon: 'phone',
    accent: 'voice',
    title: 'AI Voice Calling Agent',
    summary:
      'A natural-sounding AI agent that answers your inbound calls and can place outbound ones — with every call transcribed, summarised, and logged automatically.',
    points: [
      'Answers inbound calls automatically',
      'Places outbound calls on request',
      'Full searchable transcripts',
      'Premium ElevenLabs voice available',
    ],
    image: photos.telephony,
    imageAlt: 'Desk phone and laptop set up for business calling',
    stat: { value: '100%', label: 'Calls transcribed' },
  },
  {
    id: 'dashboard',
    icon: 'layout',
    accent: 'brand',
    title: 'One Unified Dashboard',
    summary:
      'Every channel in a single view — messages, calls, chatbot settings, leads, and reports — scoped to your business alone. One login, one place to run everything.',
    points: [
      'All channels in one place',
      'Chatbot training and rules',
      'Lead pipeline and exports',
      'Reports on volume and response time',
    ],
    image: photos.infrastructure,
    imageAlt: 'Blue-lit data centre representing the platform infrastructure',
    stat: { value: '1', label: 'Login for everything' },
  },
]
