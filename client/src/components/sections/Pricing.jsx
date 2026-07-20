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
import { CheckIcon, Icon, WhatsAppIcon } from '../icons'

const accents = {
  whatsapp: { chip: 'bg-whatsapp/10 text-whatsapp-dark', ring: 'ring-whatsapp/25' },
  instagram: { chip: 'bg-instagram/10 text-instagram', ring: 'ring-instagram/25' },
  voice: { chip: 'bg-voice/10 text-voice', ring: 'ring-voice/25' },
  brand: { chip: 'bg-brand-soft text-brand', ring: 'ring-brand/25' },
}

/** Big price with the currency and billing period. */
function Price({ value, className }) {
  return (
    <p className={cn('flex items-baseline gap-1.5', className)}>
      <span className="font-display text-[34px] leading-none font-extrabold text-ink">
        {formatPrice(value)}
      </span>
      <span className="text-[14px] font-semibold text-muted">{currency}</span>
      <span className="text-[13px] text-muted-2">/ month</span>
    </p>
  )
}

/* ---------------- Standalone tier card ---------------- */

function TierCard({ tier, unit, accent }) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-all duration-400 ease-signal',
        tier.popular
          ? cn('border-brand/40 ring-2 card-shadow-lg', accent.ring)
          : 'border-line hover:border-brand/30 hover:card-shadow',
      )}
    >
      {tier.popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
          Most popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-[17px] font-bold">{tier.name}</h4>
          <p className="mt-1 text-[13px] text-muted">
            <span className="font-semibold text-ink">{tier.volume}</span> {unit}
          </p>
        </div>
      </div>

      {tier.note && (
        <span className={cn('mt-3 self-start rounded-full px-2.5 py-1 text-[11.5px] font-semibold', accent.chip)}>
          {tier.note}
        </span>
      )}

      <Price value={tier.price} className="mt-5" />

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-[13.5px] text-muted">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        href="#request"
        variant={tier.popular ? 'primary' : 'outline'}
        size="md"
        fullWidth
        className="mt-6"
      >
        Request this plan
      </Button>
    </div>
  )
}

/* ---------------- Bundle tier card ---------------- */

function BundleCard({ tier, featured }) {
  const saved = savings(tier)
  const percent = savingsPercent(tier)

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-400 ease-signal',
        tier.popular
          ? 'border-brand/40 ring-2 ring-brand/25 card-shadow-lg'
          : 'border-line hover:border-brand/30 hover:card-shadow',
        featured ? 'bg-white' : 'bg-white',
      )}
    >
      {tier.popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
          Best value
        </span>
      )}

      <h4 className="font-display text-[17px] font-bold">{tier.name}</h4>
      <p className="mt-1 text-[12.5px] leading-snug text-muted-2">{tier.includes}</p>

      <div className="mt-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] text-muted-2 line-through">
            {formatPrice(tier.separate)} {currency}
          </span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11.5px] font-bold text-green-700">
            Save {percent}%
          </span>
        </div>
        <Price value={tier.price} className="mt-1.5" />
        <p className="mt-1.5 text-[12.5px] font-medium text-green-700">
          You save {formatPrice(saved)} {currency} every month
        </p>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-[13.5px] text-muted">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        href="#request"
        variant={tier.popular ? 'primary' : 'outline'}
        size="md"
        fullWidth
        className="mt-6"
      >
        Request this bundle
      </Button>
    </div>
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
        description={`Every plan is billed monthly in ${currency}, includes your dashboard, and comes with full setup done for you. Bundles cost less than buying the same services separately.`}
      />

      {/* View switch */}
      <Reveal className="mt-10 flex justify-center">
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
        <div key="bundles" className="mt-14 flex animate-rise flex-col gap-16">
          {bundles.map((bundle) => (
            <div key={bundle.id}>
              <Reveal className="flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white">
                  <Icon name={bundle.icon} className="size-6" />
                </span>
                <h3 className="mt-4 text-[clamp(1.4rem,2.4vw,1.8rem)]">
                  {bundle.name}
                  <span className="ml-2 font-body text-[15px] font-medium text-muted">
                    {bundle.subtitle}
                  </span>
                </h3>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                  {bundle.description}
                </p>
              </Reveal>

              <div className="mt-9 grid gap-5 md:grid-cols-3">
                {bundle.tiers.map((tier, index) => (
                  <Reveal key={tier.name} delay={index * 90} className="h-full">
                    <BundleCard tier={tier} featured={bundle.featured} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Standalone ---------------- */}
      {view === 'standalone' && (
        <div key="standalone" className="mt-14 flex animate-rise flex-col gap-16">
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
                  <h3 className="mt-4 text-[clamp(1.4rem,2.4vw,1.8rem)]">{plan.name}</h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    {plan.blurb}
                  </p>
                </Reveal>

                <div className="mt-9 grid gap-5 md:grid-cols-3">
                  {plan.tiers.map((tier, index) => (
                    <Reveal key={tier.name} delay={index * 90} className="h-full">
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
      <Reveal className="mt-16" delay={120}>
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-white px-6 py-8 text-center card-shadow">
          <h3 className="text-[20px]">Not sure which plan fits?</h3>
          <p className="max-w-xl text-[14.5px] leading-relaxed text-muted">
            Tell us roughly how many messages or calls you handle each month and
            we&apos;ll recommend the right tier — including whether a bundle
            saves you money.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ExternalButton href={whatsappLink()} variant="whatsapp" size="md">
              <WhatsAppIcon className="size-4" />
              Ask on WhatsApp
            </ExternalButton>
            <Button href="#request" variant="outline" size="md">
              Request access
            </Button>
          </div>
          <p className="text-[12.5px] text-muted-2">
            All prices in {currency}, billed monthly. No long-term contract —
            change or cancel between billing cycles.
          </p>
        </div>
      </Reveal>
    </Section>
  )
}
