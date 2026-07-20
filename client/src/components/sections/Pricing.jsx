import { useState } from 'react'
import {
  bundles,
  currency,
  formatPrice,
  savings,
  savingsPercent,
  standalonePlans,
} from '../../data/pricing'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { Button, ExternalButton } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'
import { CheckIcon, Icon, SparkleIcon, WhatsAppIcon } from '../icons'

const accents = {
  whatsapp: { chip: 'bg-whatsapp/10 text-whatsapp-dark', dot: 'text-whatsapp' },
  instagram: { chip: 'bg-instagram/10 text-instagram', dot: 'text-instagram' },
  voice: { chip: 'bg-voice/10 text-voice', dot: 'text-voice' },
  brand: { chip: 'bg-brand-soft text-brand', dot: 'text-brand' },
}

/** Price block. `dark` inverts it for the highlighted card. */
function Price({ value, dark }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={cn(
          'font-display text-[38px] leading-none font-extrabold tracking-tight',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {formatPrice(value)}
      </span>
      <span
        className={cn(
          'text-[15px] font-bold',
          dark ? 'text-blue-200' : 'text-brand',
        )}
      >
        {currency}
      </span>
      <span className={cn('text-[13px]', dark ? 'text-blue-200/70' : 'text-muted-2')}>
        / month
      </span>
    </div>
  )
}

/** Feature row with a circular tick. */
function Feature({ children, dark }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full',
          dark ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand',
        )}
      >
        <CheckIcon className="size-3" />
      </span>
      <span
        className={cn(
          'text-[13.5px] leading-snug',
          dark ? 'text-blue-100/85' : 'text-muted',
        )}
      >
        {children}
      </span>
    </li>
  )
}

/**
 * Shared card shell.
 *
 * The highlighted tier renders on navy with a glow so it reads as the
 * recommended option at a glance, rather than relying on a badge alone.
 */
function PlanCard({ highlighted, badge, children }) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl p-6 transition-all duration-500 ease-signal',
        highlighted
          ? 'bg-gradient-to-b from-navy-2 to-navy text-white shadow-[0_24px_60px_-18px_rgb(29_78_216/0.55)] hover:-translate-y-1.5 hover:shadow-[0_32px_70px_-18px_rgb(29_78_216/0.7)]'
          : 'border border-line bg-white hover:-translate-y-1.5 hover:border-brand/30 hover:card-shadow-lg',
      )}
    >
      {badge && (
        <span
          className={cn(
            'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1',
            'text-[10.5px] font-bold tracking-[0.1em] whitespace-nowrap uppercase',
            highlighted
              ? 'bg-gradient-to-r from-brand-light to-accent text-navy'
              : 'bg-brand text-white',
          )}
        >
          {badge}
        </span>
      )}
      {children}
    </div>
  )
}

/* ---------------- Standalone tier ---------------- */

function TierCard({ tier, unit, accent }) {
  const dark = Boolean(tier.popular)

  return (
    <PlanCard highlighted={dark} badge={tier.popular && 'Most popular'}>
      <h4
        className={cn(
          'font-display text-[18px] font-bold',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {tier.name}
      </h4>

      <p className={cn('mt-1 text-[13px]', dark ? 'text-blue-200/80' : 'text-muted')}>
        <span className={dark ? 'font-bold text-white' : 'font-bold text-ink'}>
          {tier.volume}
        </span>{' '}
        {unit}
      </p>

      {tier.note && (
        <span
          className={cn(
            'mt-3 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold',
            dark ? 'bg-white/12 text-blue-100' : accent.chip,
          )}
        >
          {tier.note}
        </span>
      )}

      <div className={cn('mt-5 border-t pt-5', dark ? 'border-white/15' : 'border-line')}>
        <Price value={tier.price} dark={dark} />
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <Feature key={feature} dark={dark}>
            {feature}
          </Feature>
        ))}
      </ul>

      <Button
        href="#request"
        variant={dark ? 'light' : 'outline'}
        size="md"
        fullWidth
        className="mt-6"
      >
        Request this plan
      </Button>
    </PlanCard>
  )
}

/* ---------------- Bundle tier ---------------- */

function BundleCard({ tier }) {
  const dark = Boolean(tier.popular)
  const saved = savings(tier)
  const percent = savingsPercent(tier)

  return (
    <PlanCard highlighted={dark} badge={tier.popular && 'Best value'}>
      <h4
        className={cn(
          'font-display text-[18px] font-bold',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {tier.name}
      </h4>
      <p
        className={cn(
          'mt-1 text-[12.5px] leading-snug',
          dark ? 'text-blue-200/75' : 'text-muted-2',
        )}
      >
        {tier.includes}
      </p>

      <div className={cn('mt-5 border-t pt-5', dark ? 'border-white/15' : 'border-line')}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-[13.5px] line-through',
              dark ? 'text-blue-200/60' : 'text-muted-2',
            )}
          >
            {formatPrice(tier.separate)} {currency}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              dark
                ? 'bg-gradient-to-r from-brand-light to-accent text-navy'
                : 'bg-green-100 text-green-700',
            )}
          >
            Save {percent}%
          </span>
        </div>

        <div className="mt-2">
          <Price value={tier.price} dark={dark} />
        </div>

        <p
          className={cn(
            'mt-2 text-[12.5px] font-semibold',
            dark ? 'text-blue-200' : 'text-green-700',
          )}
        >
          You save {formatPrice(saved)} {currency} every month
        </p>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <Feature key={feature} dark={dark}>
            {feature}
          </Feature>
        ))}
      </ul>

      <Button
        href="#request"
        variant={dark ? 'light' : 'outline'}
        size="md"
        fullWidth
        className="mt-6"
      >
        Request this bundle
      </Button>
    </PlanCard>
  )
}

/* ---------------- Section ---------------- */

const views = [
  { id: 'bundles', label: 'Bundles & savings' },
  { id: 'standalone', label: 'Single services' },
]

export function Pricing() {
  const [view, setView] = useState('bundles')

  return (
    <Section id="pricing" className="bg-ice">
      <SectionHeading
        eyebrow="Pricing"
        title="Straightforward monthly pricing."
        description={`Billed monthly in ${currency}. Every plan includes your dashboard and full setup. Bundles cost less than the same services bought separately.`}
      />

      {/* View switch */}
      <Reveal className="mt-8 flex justify-center">
        <div
          role="tablist"
          aria-label="Pricing view"
          className="inline-flex rounded-full border border-line bg-white p-1 card-shadow"
        >
          {views.map((item) => {
            const selected = view === item.id
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setView(item.id)}
                className={cn(
                  'rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-300',
                  selected
                    ? 'bg-brand text-white shadow-[0_8px_20px_-8px] shadow-brand/60'
                    : 'text-muted hover:text-ink',
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </Reveal>

      {/* ---------------- Bundles ---------------- */}
      {view === 'bundles' && (
        <div key="bundles" className="mt-12 flex animate-rise flex-col gap-14">
          {bundles.map((bundle) => (
            <div key={bundle.id}>
              <Reveal className="flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-light to-brand text-white shadow-[0_10px_26px_-10px] shadow-brand/60">
                  <Icon name={bundle.icon} className="size-6" />
                </span>
                <h3 className="mt-4 text-[clamp(1.3rem,2.2vw,1.65rem)]">
                  {bundle.name}
                  <span className="ml-2 font-body text-[14.5px] font-medium text-muted">
                    {bundle.subtitle}
                  </span>
                </h3>
                <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-muted">
                  {bundle.description}
                </p>
              </Reveal>

              <div className="mt-9 grid gap-5 md:grid-cols-3 md:items-stretch">
                {bundle.tiers.map((tier, index) => (
                  <Reveal key={tier.name} delay={index * 80} className="h-full">
                    <BundleCard tier={tier} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Standalone ---------------- */}
      {view === 'standalone' && (
        <div key="standalone" className="mt-12 flex animate-rise flex-col gap-14">
          {standalonePlans.map((plan) => {
            const accent = accents[plan.accent] ?? accents.brand

            return (
              <div key={plan.id}>
                <Reveal className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      'grid size-12 place-items-center rounded-2xl',
                      accent.chip,
                    )}
                  >
                    <Icon name={plan.icon} className="size-6" />
                  </span>
                  <h3 className="mt-4 text-[clamp(1.3rem,2.2vw,1.65rem)]">
                    {plan.name}
                  </h3>
                  <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-muted">
                    {plan.blurb}
                  </p>
                </Reveal>

                <div className="mt-9 grid gap-5 md:grid-cols-3 md:items-stretch">
                  {plan.tiers.map((tier, index) => (
                    <Reveal key={tier.name} delay={index * 80} className="h-full">
                      <TierCard tier={tier} unit={plan.unit} accent={accent} />
                    </Reveal>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footnote + help CTA */}
      <Reveal className="mt-14" delay={100}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-2 to-navy px-6 py-9 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(59_130_246/0.35),transparent_70%)] blur-2xl"
          />
          <div className="relative flex flex-col items-center gap-4">
            <SparkleIcon className="size-7 text-cyan-300" />
            <h3 className="text-[21px] text-white">Not sure which plan fits?</h3>
            <p className="max-w-xl text-[14.5px] leading-relaxed text-blue-100/85">
              Tell us roughly how many messages or calls you handle each month
              and we&apos;ll recommend the right tier, including whether a
              bundle saves you money.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              <ExternalButton href={whatsappLink()} variant="whatsapp" size="md">
                <WhatsAppIcon className="size-4" />
                Ask on WhatsApp
              </ExternalButton>
              <Button href="#request" variant="light" size="md">
                Request access
              </Button>
            </div>
            <p className="mt-1 text-[12.5px] text-blue-200/70">
              All prices in {currency}, billed monthly. No long-term contract.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
