# STS — Landing Page

One-page marketing site for STS, built with **React 19 + Vite 6 + Tailwind CSS v4** (plain JavaScript).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

## Before you launch — required changes

**1. Set the real WhatsApp number** in [`src/data/site.js`](src/data/site.js):

```js
whatsappNumber: '923001234567',  // country code + number, digits only
```

This is currently a placeholder. Every "WhatsApp Us" button, the chatbot's
WhatsApp option, and the Request Access form build their links from it.

**2. Confirm the contact address.** `sts@shgardiauto.com` is set as both the
primary and support address in the same file.

**3. Point the login somewhere.** When the client dashboard exists, set
`dashboardUrl` in `site.js` — the login form then redirects instead of showing
a "coming soon" toast.

## ⚠️ Pricing — what is deliberately NOT on this page

[`src/data/pricing.js`](src/data/pricing.js) contains **customer-facing figures
only**: package name, included volume, and monthly price.

The internal columns from the pricing spreadsheet — **OpenAI cost, fixed cost,
total cost, profit, and margin** — are intentionally excluded. Publishing them
would expose your cost base and negotiating position to customers and
competitors. Do not add them to that file: anything in it renders publicly.

Bundle *savings* (separate price vs bundle price) **are** shown, since a
discount is a selling point rather than sensitive data.

## Project structure

```
src/
├── App.jsx                  Page composition + login modal state
├── index.css                Design tokens, keyframes, custom utilities
│
├── data/                    All copy and content — edit here, not in components
│   ├── site.js              Brand, WhatsApp number, contact, nav, socials
│   ├── pricing.js           Plans, tiers, bundles (public figures only)
│   ├── services.js          The four services
│   ├── steps.js             Three onboarding steps
│   ├── benefits.js          "Why STS" cards, hero stats, trust badges
│   ├── faq.js               FAQ groups and answers
│   ├── chatbot.js           Assistant conversation script
│   └── images.js            Image library (Unsplash CDN URLs)
│
├── lib/
│   ├── whatsapp.js          wa.me link + request-message builders
│   └── cn.js                Class-name joiner
│
├── hooks/
│   ├── useReveal.js         IntersectionObserver scroll reveal
│   ├── useScrolled.js       Header transparent → white on scroll
│   ├── useLockBodyScroll.js Scroll lock for modal / mobile menu
│   └── useRotatingIndex.js  Cycling index helper
│
└── components/
    ├── icons/               SVG icon set + name→component map
    ├── ui/                  Button, Field, Modal, Toast, Section, Reveal
    ├── layout/              Header, MobileMenu, Footer, Logo
    ├── chatbot/             ChatWidget — the on-page assistant
    ├── auth/                LoginModal
    └── sections/            Hero, TrustStrip, Services, HowItWorks,
                             Benefits, Pricing, FAQ, RequestAccess, FinalCTA
```

### Where to change things

| I want to…                     | Edit                                    |
| ------------------------------ | --------------------------------------- |
| Change the WhatsApp number     | `src/data/site.js`                      |
| Change a price or plan         | `src/data/pricing.js`                   |
| Reword a service / step / FAQ  | the matching file in `src/data/`         |
| Change what the chatbot says   | `src/data/chatbot.js`                   |
| Swap a photo                   | `src/data/images.js`                    |
| Adjust colours, fonts, motion  | `@theme` block in `src/index.css`       |
| Reorder page sections          | `src/App.jsx`                           |

## The on-page assistant

The bottom-right widget is a **scripted guide, not a live AI**. It walks a
decision tree defined in `src/data/chatbot.js`, so every answer is authored —
it can never invent a price or make a promise you didn't write. Each node has
the messages the bot sends and the replies the visitor can pick; an option can
move to another node, scroll to a section, or open WhatsApp.

To connect a real AI later, replace `playNode()` in
`src/components/chatbot/ChatWidget.jsx` with an API call — the message list and
typing indicator stay as they are.

## How the forms work

Neither form sends data to a server — there is no backend yet.

- **Request Access** validates the fields, then opens WhatsApp with the details
  pre-filled. Nothing is transmitted until the user presses send in WhatsApp.
- **Login** shows a toast until `site.dashboardUrl` is set.

## Design system

Blue-and-white theme defined entirely in the `@theme` block of `index.css`:
royal blue (`--color-brand`) on white, with deep navy (`--color-navy`)
anchoring the hero, the featured benefit card, the CTA panel, and the footer.
Type is Plus Jakarta Sans for headings, Inter for body, JetBrains Mono for
small labels.

The logo is a **custom SVG vector**, not a bitmap taken from the web — it stays
sharp at any size, recolours for dark and light backgrounds, costs no network
request, and carries no third-party trademark risk.

## Accessibility & motion

- Every animation is disabled under `prefers-reduced-motion: reduce`.
- FAQ uses native `<details>`, so answers are searchable and work without JS.
- The login modal traps focus, closes on Escape, and restores focus on close.
- Skip-to-content link, labelled form fields, and inline validation messages.
- Verified: no horizontal overflow at 390px, no console errors.
