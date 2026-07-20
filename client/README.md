# STS — Landing Page

Marketing site for STS, built with **React 19 + Vite 6 + Tailwind CSS v4** (plain JavaScript).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

## Before you launch — required change

Set the real WhatsApp Business number in [`src/data/site.js`](src/data/site.js):

```js
whatsappNumber: '923001234567', // country code + number, digits only
```

Every "WhatsApp Us" button and the Request Access form build their links from
this one value. Also update `email`, `phoneDisplay`, and `location` there.

When the client dashboard exists, set `dashboardUrl` in the same file — the
login form will then redirect to it instead of showing a "coming soon" toast.

## Project structure

```
src/
├── App.jsx                  Page composition + login modal state
├── index.css                Design tokens, keyframes, custom utilities
│
├── data/                    All copy and content — edit here, not in components
│   ├── site.js              Brand, WhatsApp number, nav, contact, socials
│   ├── services.js          The four services
│   ├── steps.js             Three onboarding steps
│   ├── benefits.js          "Why STS" cards, hero stats, trust badges
│   ├── conversations.js     Sample inbox rows + hero chat script
│   └── images.js            Image library (Unsplash CDN URLs)
│
├── lib/
│   ├── whatsapp.js          wa.me link + request-message builders
│   └── cn.js                Class-name joiner
│
├── hooks/
│   ├── useReveal.js         IntersectionObserver scroll reveal
│   ├── useScrolled.js       Header condense-on-scroll
│   ├── useLockBodyScroll.js Scroll lock for modal / mobile menu
│   └── useRotatingIndex.js  Cycling index for the hero channel chips
│
└── components/
    ├── icons/               SVG icon set + name→component map
    ├── ui/                  Button, Field, Modal, Toast, Section, Reveal, Aurora
    ├── layout/              Header, MobileMenu, Footer, FloatingWhatsApp, Logo
    ├── showcase/            InboxPreview, ChatBubbles
    ├── auth/                LoginModal
    └── sections/            Hero, TrustStrip, Services, HowItWorks,
                             Benefits, DashboardPreview, RequestAccess, FinalCTA
```

### Where to change things

| I want to…                        | Edit                                        |
| --------------------------------- | ------------------------------------------- |
| Change the WhatsApp number        | `src/data/site.js`                          |
| Reword a service / step / benefit | the matching file in `src/data/`            |
| Swap a photo                      | `src/data/images.js`                        |
| Adjust colours, fonts, animation  | `@theme` block in `src/index.css`           |
| Reorder page sections             | `src/App.jsx`                               |

## How the forms work

Neither form sends data to a server — there is no backend yet.

- **Request Access** validates the fields, then opens WhatsApp with the details
  pre-filled. Nothing is transmitted until the user presses send in WhatsApp.
- **Login** currently shows a toast. Point `site.dashboardUrl` at the dashboard
  app to turn it into a real redirect.

## Images

Photography is loaded from the Unsplash CDN, centralised in
`src/data/images.js`. To self-host, replace the URLs in that one file — nothing
else references image paths.

## Accessibility & motion

- Every animation is disabled under `prefers-reduced-motion: reduce`.
- The dashboard tabs follow the ARIA tab pattern with arrow-key navigation.
- The login modal traps focus, closes on Escape, and restores focus on close.
- Skip-to-content link, labelled form fields, and inline validation messages.
