import { useState } from 'react'
import { site } from '../../data/site'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { LockIcon } from '../icons'

/**
 * Client login.
 *
 * There is no auth backend yet, so this collects credentials only to
 * hand off to the dashboard app once `site.dashboardUrl` is set. Until
 * then it confirms with a toast rather than pretending to sign anyone in.
 */
export function LoginModal({ open, onClose }) {
  const showToast = useToast()
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)

    if (site.dashboardUrl) {
      window.location.href = site.dashboardUrl
      return
    }

    setSubmitting(false)
    onClose()
    showToast('Dashboard login is coming soon, onboarded clients get access by WhatsApp.')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Client login"
      description="Sign in to your STS dashboard."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@business.com"
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
          <LockIcon className="size-4" />
          {submitting ? 'Signing in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted-2">
        Don&apos;t have an account?{' '}
        <a
          href="#request"
          onClick={onClose}
          className="font-semibold text-brand hover:underline"
        >
          Request access
        </a>
      </p>
    </Modal>
  )
}
