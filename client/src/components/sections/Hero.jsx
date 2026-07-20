import { heroStats } from '../../data/benefits'
import { photos } from '../../data/images'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { Button, ExternalButton } from '../ui/Button'
import { Eyebrow } from '../ui/Section'
import {
  ArrowRightIcon,
  CheckIcon,
  InstagramIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '../icons'

const channels = [
  { label: 'WhatsApp', icon: WhatsAppIcon },
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'Phone calls', icon: PhoneIcon },
]

const assurances = ['Official Meta API', 'Setup done for you', 'No long contract']

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      {/* ---------- Background photograph ---------- */}
      <img
        src={photos.hero}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-center opacity-45"
      />

      {/* Navy wash so white type stays readable over the photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy/90 to-navy-2/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_20%,rgb(59_130_246/0.28),transparent_60%)]"
      />
      {/* Fade into the white section below */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-white"
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-32 pb-28 sm:px-8 sm:pt-40 lg:pt-44 lg:pb-36">
        <div className="max-w-3xl">
          <div className="animate-rise">
            <Eyebrow tone="dark">AI automation for customer conversations</Eyebrow>
          </div>

          <h1
            className="mt-6 animate-rise text-[clamp(2.4rem,6vw,4.2rem)] text-white text-balance"
            style={{ animationDelay: '80ms' }}
          >
            Every customer conversation,{' '}
            <span className="text-gradient-light">answered by AI</span> — in one
            dashboard.
          </h1>

          <p
            className="mt-6 max-w-2xl animate-rise text-[clamp(1rem,1.4vw,1.18rem)] leading-relaxed text-blue-100/85 text-pretty"
            style={{ animationDelay: '160ms' }}
          >
            STS automates your WhatsApp, Instagram, and phone calls with an AI
            agent that replies in seconds, day or night — then brings every
            conversation into a single dashboard. We build and connect
            everything for you.
          </p>

          {/* Channel chips */}
          <ul
            className="mt-8 flex animate-rise flex-wrap items-center gap-2.5"
            style={{ animationDelay: '220ms' }}
          >
            {channels.map((channel) => {
              const ChannelIcon = channel.icon
              return (
                <li
                  key={channel.label}
                  className={cn(
                    'flex items-center gap-2 rounded-full border border-white/20 bg-white/10',
                    'px-4 py-2 text-[13.5px] font-medium text-white backdrop-blur-sm',
                  )}
                >
                  <ChannelIcon className="size-4 shrink-0" />
                  {channel.label}
                </li>
              )
            })}
          </ul>

          {/* CTAs */}
          <div
            className="mt-9 flex animate-rise flex-wrap gap-3.5"
            style={{ animationDelay: '280ms' }}
          >
            <ExternalButton href={whatsappLink()} variant="whatsapp" size="lg">
              <WhatsAppIcon className="size-5" />
              WhatsApp Us
            </ExternalButton>

            <Button href="#request" variant="light" size="lg">
              Request Access
              <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>

            <Button href="#pricing" variant="outlineLight" size="lg">
              See pricing
            </Button>
          </div>

          {/* Assurances */}
          <ul
            className="mt-7 flex animate-rise flex-wrap gap-x-6 gap-y-2"
            style={{ animationDelay: '340ms' }}
          >
            {assurances.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[13.5px] text-blue-200/90"
              >
                <CheckIcon className="size-4 shrink-0 text-blue-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Proof figures */}
        <dl
          className="mt-16 grid animate-rise grid-cols-2 gap-x-6 gap-y-8 border-t border-white/15 pt-10 lg:grid-cols-4"
          style={{ animationDelay: '400ms' }}
        >
          {heroStats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-white">
                {stat.value}
              </dt>
              <dd className="mt-1 text-[13px] leading-snug text-blue-200/75">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
