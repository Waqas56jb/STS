/**
 * Script for the on-page assistant (bottom-right widget).
 *
 * A simple node graph: each node has the messages the bot sends and the
 * replies the visitor can choose. `next` points at another node id.
 * An option may instead carry `href` (scroll to a section) or
 * `whatsapp: true` (open a WhatsApp chat).
 *
 * This is a scripted guide, not a live AI — it answers common questions
 * and routes people to the right section or to a human.
 */

export const botIntro = {
  name: 'STS Assistant',
  status: 'Usually replies instantly',
}

export const chatNodes = {
  welcome: {
    messages: [
      "Hi! 👋 I'm the STS assistant.",
      'I can explain our services, pricing, and how setup works. What would you like to know?',
    ],
    options: [
      { label: 'What does STS do?', next: 'about' },
      { label: 'Show me the services', next: 'services' },
      { label: 'How much does it cost?', next: 'pricing' },
      { label: 'How do I get started?', next: 'start' },
    ],
  },

  about: {
    messages: [
      'STS automates your customer conversations with AI.',
      'We connect WhatsApp, Instagram, and phone calls to one AI agent that answers customers 24/7, then bring every conversation into a single dashboard you control.',
      'We handle the entire setup for you. You never touch code.',
    ],
    options: [
      { label: 'Which channels exactly?', next: 'services' },
      { label: "What's the pricing?", next: 'pricing' },
      { label: 'Talk to a human', next: 'human' },
    ],
  },

  services: {
    messages: ['We run four things. Which one interests you?'],
    options: [
      { label: '💬 WhatsApp chatbot', next: 'svc_whatsapp' },
      { label: '📸 Instagram chatbot', next: 'svc_instagram' },
      { label: '📞 AI voice agent', next: 'svc_voice' },
      { label: '📊 The dashboard', next: 'svc_dashboard' },
    ],
  },

  svc_whatsapp: {
    messages: [
      'Our WhatsApp chatbot runs on the official Meta WhatsApp Business API, not an unofficial workaround, so your number stays safe.',
      'It answers customers in seconds, 24 hours a day, and hands the chat to your team the moment someone needs a real person.',
      'Plans start at 20.00 KWD per month for 2,500 messages.',
    ],
    options: [
      { label: 'See all WhatsApp plans', href: '#pricing' },
      { label: 'Tell me about other services', next: 'services' },
      { label: 'I want to get started', next: 'start' },
    ],
  },

  svc_instagram: {
    messages: [
      'The Instagram chatbot replies to your DMs the moment they arrive, in your brand voice, in Arabic or English.',
      'It can also turn comments into DM conversations and capture every enquiry as a lead.',
      'Plans start at 20.00 KWD per month for 2,500 contacts.',
    ],
    options: [
      { label: 'See all Instagram plans', href: '#pricing' },
      { label: 'Tell me about other services', next: 'services' },
      { label: 'I want to get started', next: 'start' },
    ],
  },

  svc_voice: {
    messages: [
      'The AI voice agent answers your inbound calls with a natural-sounding voice, and can place outbound calls too.',
      'Every call is transcribed, summarised, and logged so nothing is lost.',
      'Plans start at 39.00 KWD per month for 150 included minutes. A premium ElevenLabs voice option is available.',
    ],
    options: [
      { label: 'See all voice plans', href: '#pricing' },
      { label: 'Tell me about other services', next: 'services' },
      { label: 'I want to get started', next: 'start' },
    ],
  },

  svc_dashboard: {
    messages: [
      'Your dashboard brings every channel into one place, WhatsApp, Instagram, and call transcripts in a single inbox.',
      'You also get chatbot training, automation rules, your lead pipeline, and reports on response times and volume.',
      'It comes included with every plan, scoped to your business alone.',
    ],
    options: [
      { label: 'What does it cost?', next: 'pricing' },
      { label: 'Tell me about other services', next: 'services' },
      { label: 'I want to get started', next: 'start' },
    ],
  },

  pricing: {
    messages: [
      'All plans are monthly, in KWD, with no long-term contract.',
      'Standalone: WhatsApp from 20.00, Instagram from 20.00, Voice from 39.00.',
      'Bundles are cheaper than buying separately, the Social bundle starts at 34.00 and the Complete bundle (all three channels) at 65.00.',
    ],
    options: [
      { label: 'Show me the full pricing table', href: '#pricing' },
      { label: "What's included in a bundle?", next: 'bundles' },
      { label: 'I want to get started', next: 'start' },
    ],
  },

  bundles: {
    messages: [
      'There are two bundles.',
      'Social = WhatsApp + Instagram, from 34.00 KWD, around 15% less than buying both separately.',
      'Complete = WhatsApp + Instagram + Voice, from 65.00 KWD, the biggest saving, and everything runs from one dashboard.',
    ],
    options: [
      { label: 'Compare all bundles', href: '#pricing' },
      { label: 'How does setup work?', next: 'start' },
      { label: 'Talk to a human', next: 'human' },
    ],
  },

  start: {
    messages: [
      'Getting started takes three steps:',
      '1️⃣ You send the request access form, about a minute.\n2️⃣ We set up your channels and train the AI on your business.\n3️⃣ You log in and run everything from your dashboard.',
      "There's no self-service signup, because we do the setup for you.",
    ],
    options: [
      { label: 'Take me to the form', href: '#request' },
      { label: 'Message us on WhatsApp', whatsapp: true },
      { label: 'I have another question', next: 'welcome' },
    ],
  },

  human: {
    messages: [
      'Happy to connect you with the team.',
      'The fastest way is WhatsApp, we usually reply within a day. You can also email us at sts@shgardiauto.com.',
    ],
    options: [
      { label: 'Open WhatsApp', whatsapp: true },
      { label: 'Fill in the access form', href: '#request' },
      { label: 'Back to the start', next: 'welcome' },
    ],
  },
}
