/**
 * Frequently asked questions.
 * Grouped so the section can render categorised accordions.
 */
export const faqGroups = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'How do I sign up for STS?',
        a: "There's no open self-service signup. You request access using the form on this page, and we review every request personally. Once approved, we set up your channels, build your chatbot, and create your dashboard account — then send you your login.",
      },
      {
        q: 'How long does setup take?',
        a: 'Most businesses are live within a few days of approval. WhatsApp Business API verification with Meta is usually the longest step, and we handle that submission for you. Instagram and voice setup are typically same-day.',
      },
      {
        q: 'What do you need from me to get started?',
        a: 'Your business name and contact details, the phone number you want to use for WhatsApp, access to your Instagram business account, and any material that helps train the AI — a price list, FAQ document, delivery policy, or product catalogue.',
      },
      {
        q: 'Do I need any technical knowledge?',
        a: 'No. We handle every API connection, the chatbot build, and the training data. You only need to use the dashboard, which is designed for business owners rather than developers.',
      },
    ],
  },
  {
    title: 'Pricing & billing',
    items: [
      {
        q: 'What currency are the prices in?',
        a: 'All prices are shown in Kuwaiti Dinar (KWD) and billed monthly.',
      },
      {
        q: 'What happens if I exceed my monthly limit?',
        a: "We'll let you know as you approach your limit and help you move to the tier that fits your actual volume. We don't cut your service off without warning.",
      },
      {
        q: 'Is a bundle cheaper than buying services separately?',
        a: 'Yes. Every bundle costs less than the same services bought individually — the saving is shown on each bundle card. The Complete bundle, which includes voice, gives the largest discount.',
      },
      {
        q: 'Am I locked into a long contract?',
        a: 'No. Plans are billed monthly and you can change or cancel your tier between billing cycles. We ask only that you give us notice so we can hand back your data cleanly.',
      },
      {
        q: 'Can I switch between plans later?',
        a: 'Yes — upgrade or downgrade at any time. If your enquiry volume grows, moving from Starter to Growth is a single change on our side with no new setup work for you.',
      },
    ],
  },
  {
    title: 'How the AI works',
    items: [
      {
        q: 'Will customers know they are talking to a bot?',
        a: "That's your choice. Many businesses have the AI introduce itself as an assistant, which customers respond well to when replies are fast and accurate. You control the greeting and tone.",
      },
      {
        q: 'What happens when the AI cannot answer something?',
        a: "It hands the conversation to your team rather than guessing. You define the triggers — specific keywords, complaints, refund requests, or simply the customer asking for a person — and the AI escalates cleanly with the full history attached.",
      },
      {
        q: 'Can the AI reply in Arabic?',
        a: 'Yes. The AI detects the language your customer writes in and replies in the same language, in Arabic or English, using the tone you set for your brand.',
      },
      {
        q: 'How is the chatbot trained on my business?',
        a: 'We load your documents — price lists, FAQs, delivery zones, product catalogues — and write rules specific to how your business operates. You can update this material at any time from the dashboard.',
      },
    ],
  },
  {
    title: 'Channels & data',
    items: [
      {
        q: 'Is this the official WhatsApp API?',
        a: 'Yes. STS runs on the official WhatsApp Business API issued by Meta to verified businesses. We do not use unofficial workarounds, which is what puts numbers at risk of being banned.',
      },
      {
        q: 'Can I keep using my existing WhatsApp number?',
        a: "In most cases yes, but a number can't be on both the consumer WhatsApp app and the Business API at the same time. We'll walk you through the options before anything changes.",
      },
      {
        q: 'Who can see my conversations?',
        a: 'Your dashboard is scoped to your business alone. Your team sees your conversations; other STS clients never do. We access your account only when you ask us to for support.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. Conversations, call transcripts, and your lead list can all be exported from the dashboard whenever you need them.',
      },
    ],
  },
]
