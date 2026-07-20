import { steps } from '../../data/steps'
import { whatsappLink } from '../../lib/whatsapp'
import { Button, ExternalButton } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'
import { ArrowRightIcon, WhatsAppIcon } from '../icons'

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="bg-ice">
      <SectionHeading
        eyebrow="Getting started"
        title="Three steps, and it's running."
        description="There's no self-service signup, because the setup is the part we take off your hands entirely."
      />

      <ol className="mt-16 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.number} delay={index * 110} as="li" className="h-full">
            <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-500 ease-signal hover:-translate-y-1.5 hover:card-shadow-lg">
              <div className="relative h-44 shrink-0 overflow-hidden">
                <img
                  src={step.image}
                  alt={step.imageAlt}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-signal group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent"
                />
                <span className="absolute top-4 left-4 grid size-11 place-items-center rounded-xl bg-white font-display text-[14px] font-extrabold text-brand card-shadow">
                  {step.number}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-[19px]">{step.title}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                  {step.description}
                </p>
                <p className="mt-auto pt-5 font-mono text-[11px] tracking-[0.12em] text-brand uppercase">
                  {step.detail}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-12 flex flex-wrap justify-center gap-3.5" delay={180}>
        <Button href="#request" variant="primary" size="lg">
          Request Access
          <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
        <ExternalButton href={whatsappLink()} variant="outline" size="lg">
          <WhatsAppIcon className="size-4 text-whatsapp" />
          Ask us a question first
        </ExternalButton>
      </Reveal>
    </Section>
  )
}
