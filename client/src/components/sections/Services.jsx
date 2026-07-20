import { services } from '../../data/services'
import { cn } from '../../lib/cn'
import { CheckIcon, Icon } from '../icons'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'

/** Accent treatments keyed by `service.accent`. */
const accents = {
  whatsapp: { chip: 'bg-whatsapp/10 text-whatsapp-dark', bar: 'bg-whatsapp' },
  instagram: { chip: 'bg-instagram/10 text-instagram', bar: 'bg-instagram' },
  voice: { chip: 'bg-voice/10 text-voice', bar: 'bg-voice' },
  brand: { chip: 'bg-brand-soft text-brand', bar: 'bg-brand' },
}

/**
 * Services alternate photo/copy sides down the page so each one reads as
 * its own story rather than a grid of equal-weight cards.
 */
function ServiceRow({ service, index }) {
  const accent = accents[service.accent]
  const flipped = index % 2 === 1

  return (
    <Reveal delay={60}>
      <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Photo */}
        <div className={cn('relative', flipped && 'lg:order-2')}>
          <div className="relative overflow-hidden rounded-3xl border border-line card-shadow-lg">
            <img
              src={service.image}
              alt={service.imageAlt}
              loading="lazy"
              className="h-64 w-full object-cover transition-transform duration-700 ease-signal hover:scale-105 sm:h-80"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent"
            />

            {/* Stat badge over the photo */}
            <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-2.5 backdrop-blur card-shadow">
              <p className="font-display text-[19px] leading-none font-extrabold text-brand">
                {service.stat.value}
              </p>
              <p className="mt-1 text-[11.5px] text-muted">{service.stat.label}</p>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className={cn(flipped && 'lg:order-1')}>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold',
              accent.chip,
            )}
          >
            <Icon name={service.icon} className="size-4" />
            Service {String(index + 1).padStart(2, '0')}
          </span>

          <h3 className="mt-4 text-[clamp(1.5rem,2.6vw,2rem)]">{service.title}</h3>

          <p className="mt-4 text-[16px] leading-relaxed text-muted text-pretty">
            {service.summary}
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {service.points.map((point) => (
              <li key={point} className="flex gap-2.5 text-[14.5px] text-ink">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                {point}
              </li>
            ))}
          </ul>

          <div className={cn('mt-7 h-1 w-16 rounded-full', accent.bar)} />
        </div>
      </article>
    </Reveal>
  )
}

export function Services() {
  return (
    <Section id="services">
      <SectionHeading
        eyebrow="What we automate"
        title="Four services. One connected system."
        description="Each one works on its own, or together as a single system that never drops a conversation — whichever suits how your business actually operates."
      />

      <div className="mt-12 flex flex-col gap-14 lg:gap-20">
        {services.map((service, index) => (
          <ServiceRow key={service.id} service={service} index={index} />
        ))}
      </div>
    </Section>
  )
}
