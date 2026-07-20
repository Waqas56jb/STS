/**
 * Central site configuration.
 * Change contact details, the WhatsApp number, and navigation here —
 * every link and button on the page reads from this file.
 */

export const site = {
  name: 'STS',
  fullName: 'STS, Smart Talk Systems',
  tagline: 'Every customer conversation, automated in one place.',
  description:
    'STS automates WhatsApp, Instagram, and phone calls with AI, answering customers 24/7 and bringing every conversation into one dashboard. Official Meta WhatsApp API, full setup done for you.',

  /**
   * WhatsApp Business number: country code + number, digits only.
   * TODO: replace with the real STS business number before launch.
   */
  whatsappNumber: '923001234567',

  defaultWhatsappMessage:
    "Hi STS, I'd like to know more about your AI automation packages.",

  /** Primary and support contact address. */
  email: 'sts@shgardiauto.com',
  supportEmail: 'sts@shgardiauto.com',

  /** Currency used throughout the pricing section. */
  currency: 'KWD',

  /**
   * Where the Login button sends existing clients.
   * Point this at the dashboard app once it exists.
   */
  dashboardUrl: null,
}

export const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

export const footerNav = [
  {
    title: 'Services',
    links: [
      { label: 'WhatsApp AI Chatbot', href: '#services' },
      { label: 'Instagram Chatbot', href: '#services' },
      { label: 'AI Voice Agent', href: '#services' },
      { label: 'Unified Dashboard', href: '#services' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Why STS', href: '#why' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
]

export const socialLinks = [
  { label: 'Instagram', href: '#', icon: 'instagram' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  { label: 'Facebook', href: '#', icon: 'facebook' },
]
