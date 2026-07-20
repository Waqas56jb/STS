import { useState } from 'react'
import { photos } from '../../data/images'
import { site } from '../../data/site'
import { buildRequestMessage, openWhatsApp } from '../../lib/whatsapp'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Reveal } from '../ui/Reveal'
import { Eyebrow, Section } from '../ui/Section'
import { CheckCircleIcon, CheckIcon, MailIcon, WhatsAppIcon } from '../icons'

const needOptions = [
  'WhatsApp AI Chatbot',
  'Instagram Chatbot',
  'AI Voice Agent',
  'Social Bundle (WhatsApp + Instagram)',
  'Complete Bundle (all channels)',
  "Not sure yet, let's talk",
]

const sidePoints = [
  'We reply on WhatsApp, usually within one business day',
  "No commitment, we'll ask about your needs first",
  'We set up every channel for you, start to finish',
  'Already a client? Use the Login button in the menu',
]

const emptyForm = {
  businessName: '',
  contactName: '',
  email: '',
  whatsapp: '',
  need: needOptions[0],
  message: '',
}

/** Minimal client-side validation — enough to catch obvious mistakes. */
function validate(values) {
  const errors = {}

  if (!values.businessName.trim()) errors.businessName = 'Business name is required'
  if (!values.contactName.trim()) errors.contactName = 'Your name is required'

  if (!values.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  const digits = values.whatsapp.replace(/\D/g, '')
  if (!values.whatsapp.trim()) {
    errors.whatsapp = 'WhatsApp number is required'
  } else if (digits.length < 8) {
    errors.whatsapp = 'Include the country code, e.g. +965 5000 0000'
  }

  return errors
}

export function RequestAccess() {
  const [values, setValues] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function update(field) {
    return (event) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
      // Clear the error as soon as the user starts correcting it.
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    openWhatsApp(buildRequestMessage(values))
    setSubmitted(true)
  }

  return (
    <Section id="request" className="bg-ice">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-14">
        {/* ---------- Pitch side ---------- */}
        <Reveal className="min-w-0">
          <Eyebrow>Get started</Eyebrow>

          <h2 className="mt-5 text-[clamp(1.9rem,3.6vw,2.7rem)] text-balance">
            Request access to STS.
          </h2>

          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-muted">
            There&apos;s no open signup, we onboard every business ourselves, so
            your channels are configured correctly from day one.
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {sidePoints.map((point) => (
              <li key={point} className="flex gap-3 text-[14.5px]">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                {point}
              </li>
            ))}
          </ul>

          <figure className="mt-9 overflow-hidden rounded-2xl border border-line card-shadow">
            <img
              src={photos.working}
              alt="Team reviewing automated conversation results together"
              loading="lazy"
              className="h-52 w-full object-cover"
            />
          </figure>

          {/* flex-wrap + break-all so the address can wrap on narrow
              screens instead of forcing the grid column wider. */}
          <a
            href={`mailto:${site.email}`}
            className="mt-6 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-medium break-all text-muted transition-colors hover:text-brand"
          >
            <MailIcon className="size-4 shrink-0" />
            <span>Prefer email? {site.email}</span>
          </a>
        </Reveal>

        {/* ---------- Form side ---------- */}
        <Reveal delay={110} className="min-w-0">
          <div className="rounded-2xl border border-line bg-white p-6 card-shadow sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center py-12 text-center">
                <CheckCircleIcon className="size-14 text-brand" />
                <h3 className="mt-5 text-[22px]">Almost there</h3>
                <p className="mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-muted">
                  We opened WhatsApp with your request pre-filled. Press send
                  there and we&apos;ll take it from there, usually within one
                  business day.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6"
                  onClick={() => {
                    setValues(emptyForm)
                    setSubmitted(false)
                  }}
                >
                  Send another request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Business name"
                    value={values.businessName}
                    onChange={update('businessName')}
                    error={errors.businessName}
                    placeholder="e.g. Al Salam Trading"
                    autoComplete="organization"
                    required
                  />
                  <Field
                    label="Your name"
                    value={values.contactName}
                    onChange={update('contactName')}
                    error={errors.contactName}
                    placeholder="e.g. Layla Ahmed"
                    autoComplete="name"
                    required
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={values.email}
                    onChange={update('email')}
                    error={errors.email}
                    placeholder="you@business.com"
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="WhatsApp number"
                    type="tel"
                    value={values.whatsapp}
                    onChange={update('whatsapp')}
                    error={errors.whatsapp}
                    placeholder="+965 5000 0000"
                    autoComplete="tel"
                    required
                  />
                  <Field
                    label="What do you need?"
                    as="select"
                    options={needOptions}
                    value={values.need}
                    onChange={update('need')}
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Tell us a bit more"
                    as="textarea"
                    value={values.message}
                    onChange={update('message')}
                    placeholder="What does your business do, and what should the AI handle for you?"
                    className="sm:col-span-2"
                  />
                </div>

                <Button
                  type="submit"
                  variant="whatsapp"
                  size="lg"
                  fullWidth
                  className="mt-6"
                >
                  <WhatsAppIcon className="size-5" />
                  Send request via WhatsApp
                </Button>

                <p className="mt-4 text-center text-[12.5px] leading-relaxed text-muted-2">
                  This opens WhatsApp with your details pre-filled. Nothing is
                  sent until you press send there.
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
