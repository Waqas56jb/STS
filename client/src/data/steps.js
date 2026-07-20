import { photos } from './images'

/**
 * The three-step onboarding flow. There is no self-service signup —
 * that's exactly what these steps need to communicate.
 */
export const steps = [
  {
    number: '01',
    title: 'Request access',
    description:
      'Tell us your business name, contact details, and which channels you need — WhatsApp, Instagram, voice, or all three. It takes about a minute.',
    detail: 'You send one short form',
    image: photos.strategy,
    imageAlt: 'Two colleagues planning a project together',
  },
  {
    number: '02',
    title: 'We build and connect everything',
    description:
      'We set up your WhatsApp Business API, connect Instagram and your voice line, then train the AI on your catalogue, pricing, and policies. You write no code.',
    detail: 'We do the technical work',
    image: photos.team,
    imageAlt: 'Technical team configuring automation systems',
  },
  {
    number: '03',
    title: 'You run it from one dashboard',
    description:
      'Log in to watch conversations arrive across every channel, adjust the chatbot rules, track leads, and review reports — all from a single screen.',
    detail: 'You stay in control',
    image: photos.office,
    imageAlt: 'Business team reviewing results in an open-plan office',
  },
]
