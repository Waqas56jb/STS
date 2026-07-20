import { heroStats } from '../../data/benefits'
import { photos } from '../../data/images'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { Button, ExternalButton } from '../ui/Button'
import {
  ArrowRightIcon,
  ChevronDownIcon,
  InstagramIcon,
  PhoneIcon,
  SparkleIcon,
  WhatsAppIcon,
} from '../icons'

const channels = [
  { label: 'WhatsApp', icon: WhatsAppIcon },
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'Phone calls', icon: PhoneIcon },
]

/**
 * Renders text word by word so each one can fade, lift, and unblur in
 * sequence.
 *
 * The gradient class is applied to every word span rather than a shared
 * parent: `background-clip: text` only paints the element that owns the
 * background, so a parent gradient would leave these child spans
 * transparent and the text invisible.
 */
function AnimatedWords({ text, startDelay = 0, step = 60, className }) {
  const words = text.split(' ')

  return words.map((word, index) => (
    <span
      key={`${word}-${index}`}
      className={cn('inline-block animate-word-in', className)}
      style={{ animationDelay: `${startDelay + index * step}ms` }}
    >
      {word}
      {index < words.length - 1 && ' '}
    </span>
  ))
}

export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-navy px-5 pt-24 pb-10 sm:px-8 sm:pt-28">
      {/* ---------- Background photograph ---------- */}
      <img
        src={photos.hero}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 -z-30 size-full object-cover object-center"
      />

      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-navy/70" />

      {/* Centre spotlight so the headline sits in the brightest area */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgb(29_78_216/0.32),transparent_70%)]"
      />

      {/* Drifting colour bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -z-20 h-[36rem] w-[min(36rem,100vw)] -translate-x-1/2 animate-shine rounded-full bg-[radial-gradient(circle,rgb(103_232_249/0.16),transparent_65%)] blur-3xl"
      />

      {/* Vignette + fade into the white section below */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(6_22_52/0.5)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-white"
      />

      {/* ---------- Centred content ---------- */}
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <span
          className="inline-flex animate-rise items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.16em] text-blue-100 uppercase backdrop-blur-md sm:text-[11px]"
          style={{ animationDelay: '60ms' }}
        >
          <SparkleIcon className="size-3.5 text-cyan-300" />
          AI automation for customer conversations
        </span>

        {/* Headline */}
        <h1 className="mt-4 text-[clamp(1.7rem,5.4vw,3.75rem)] leading-[1.1] text-white sm:mt-5">
          <AnimatedWords text="Every customer conversation," startDelay={140} />
          <br />
          <AnimatedWords
            text="answered by AI"
            startDelay={420}
            className="text-gradient-animated"
          />
          <br />
          <AnimatedWords text="in one dashboard." startDelay={660} />
        </h1>

        {/* Subtitle */}
        <p
          className="mt-4 max-w-xl animate-rise text-[clamp(0.9rem,1.5vw,1.08rem)] leading-relaxed text-blue-100/85 text-pretty sm:mt-5"
          style={{ animationDelay: '880ms' }}
        >
          An AI agent that answers your WhatsApp, Instagram, and phone calls in
          seconds, day or night. Every conversation lands in one dashboard, and
          we set the whole thing up for you.
        </p>

        {/* Channel chips, dropped on the smallest screens so the hero
            still fits a single viewport without scrolling. */}
        <ul
          className="mt-5 hidden animate-rise flex-wrap items-center justify-center gap-2 sm:flex"
          style={{ animationDelay: '980ms' }}
        >
          {channels.map((channel) => {
            const ChannelIcon = channel.icon
            return (
              <li
                key={channel.label}
                className="flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-3.5 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur-md transition-colors duration-300 hover:border-white/40 hover:bg-white/15 sm:text-[13px]"
              >
                <ChannelIcon className="size-3.5 shrink-0" />
                {channel.label}
              </li>
            )
          })}
        </ul>

        {/* CTAs */}
        <div
          className="mt-6 flex w-full animate-rise flex-col items-stretch justify-center gap-2.5 sm:mt-7 sm:w-auto sm:flex-row sm:items-center sm:gap-3"
          style={{ animationDelay: '1060ms' }}
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

        {/* Proof figures */}
        <dl
          className="mt-6 grid w-full max-w-3xl animate-rise grid-cols-2 gap-x-4 gap-y-4 border-t border-white/15 pt-5 sm:mt-9 sm:gap-x-8 sm:gap-y-5 sm:pt-7 lg:grid-cols-4"
          style={{ animationDelay: '1160ms' }}
        >
          {heroStats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-[clamp(1.3rem,2.8vw,1.95rem)] leading-none font-extrabold text-white">
                {stat.value}
              </dt>
              <dd className="mt-1.5 text-[11.5px] leading-snug text-blue-200/70 sm:text-[12.5px]">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Scroll cue */}
      <a
        href="#services"
        aria-label="Scroll to services"
        className="relative mt-8 hidden animate-scroll-cue text-white/55 transition-colors hover:text-white lg:block"
      >
        <ChevronDownIcon className="size-6" />
      </a>
    </section>
  )
}
