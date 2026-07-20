import { photos } from '../../data/images'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'

/**
 * Visual band showing the platform and the work behind it.
 *
 * A compact asymmetric mosaic: one tall feature image plus a stack of
 * smaller ones, so it adds visual weight without adding much page height.
 */
const tiles = [
  {
    src: photos.ai,
    alt: 'AI systems powering automated customer conversations',
    caption: 'AI trained on your business',
    detail: 'Your catalogue, pricing, and policies',
    span: 'lg:col-span-2 lg:row-span-2',
    height: 'h-64 lg:h-full',
  },
  {
    src: photos.infrastructure,
    alt: 'Data centre infrastructure running the platform',
    caption: 'Reliable infrastructure',
    detail: 'Official Meta API',
    height: 'h-52',
  },
  {
    src: photos.automation,
    alt: 'Automated systems running in a production environment',
    caption: 'Automation that works',
    detail: 'Answers in under 10 seconds',
    height: 'h-52',
  },
  {
    src: photos.network,
    alt: 'Connected network representing every channel in one place',
    caption: 'Every channel connected',
    detail: 'WhatsApp, Instagram, voice',
    height: 'h-52',
  },
  {
    src: photos.team,
    alt: 'Team configuring the automation platform',
    caption: 'Set up by our team',
    detail: 'You write no code',
    height: 'h-52',
  },
]

export function Showcase() {
  return (
    <Section id="platform" className="bg-white">
      <SectionHeading
        eyebrow="Inside the platform"
        title="Built properly, so it holds up in front of customers."
        description="Official infrastructure, AI trained on your business, and a team that configures the whole thing before you ever log in."
      />

      <div className="mt-12 grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <Reveal
            key={tile.caption}
            delay={index * 70}
            className={tile.span ?? ''}
          >
            <figure className="group relative h-full overflow-hidden rounded-2xl border border-line">
              <img
                src={tile.src}
                alt={tile.alt}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-700 ease-signal group-hover:scale-105 ${tile.height}`}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy via-navy/35 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-[15px] font-bold text-white">
                  {tile.caption}
                </p>
                <p className="mt-0.5 text-[12px] text-blue-100/80">{tile.detail}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
