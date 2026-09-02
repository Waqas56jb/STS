/**
 * Transactional email — Resend API or SMTP (nodemailer).
 * No-op (returns { skipped: true }) when mail is not configured.
 */

const FROM = () => process.env.MAIL_FROM || process.env.RESEND_FROM || 'STS <noreply@stsq8.com>'
const APP_URL = () => process.env.CLIENT_APP_URL || process.env.APP_URL || 'https://www.stsq8.com'
const ADMIN_URL = () => process.env.ADMIN_APP_URL || 'https://sts-admin-roan.vercel.app'

export function mailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY
    || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  )
}

async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM(),
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Resend ${res.status}`)
  return { id: data.id, provider: 'resend' }
}

async function sendViaSmtp({ to, subject, html, text }) {
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  const info = await transporter.sendMail({
    from: FROM(),
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
  })
  return { id: info.messageId, provider: 'smtp' }
}

export async function sendMail({ to, subject, html, text }) {
  if (!to || !subject) return { skipped: true, reason: 'missing_fields' }
  if (!mailConfigured()) {
    console.warn('[mail] not configured — skip:', subject, '→', to)
    return { skipped: true, reason: 'not_configured' }
  }
  try {
    if (process.env.RESEND_API_KEY) return await sendViaResend({ to, subject, html, text })
    return await sendViaSmtp({ to, subject, html, text })
  } catch (e) {
    console.error('[mail] send failed:', e.message)
    return { ok: false, error: e.message }
  }
}

function wrapHtml(title, body) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e8eaed">
    <div style="font-weight:700;color:#0B1F3A;font-size:18px;margin-bottom:8px">STS</div>
    <h1 style="font-size:20px;margin:0 0 12px;color:#0B1F3A">${title}</h1>
    ${body}
    <p style="color:#6b7280;font-size:12px;margin-top:28px">STS · Kuwait</p>
  </div></body></html>`
}

/** Welcome + login credentials after admin creates / approves an account. */
export async function sendAccountReadyEmail({ to, name, password, businessName }) {
  const loginUrl = APP_URL().replace(/\/?$/, '/')
  const safeName = name || 'there'
  return sendMail({
    to,
    subject: `Your STS account is ready — ${businessName || 'Welcome'}`,
    html: wrapHtml('Your account is ready', `
      <p>Hi ${safeName},</p>
      <p>Your STS workspace <b>${businessName || ''}</b> is set up. Sign in with:</p>
      <p style="background:#f3f4f6;padding:14px 16px;border-radius:8px;font-family:monospace;font-size:14px">
        Email: <b>${to}</b><br/>
        Password: <b>${password}</b>
      </p>
      <p><a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open dashboard</a></p>
      <p style="color:#6b7280;font-size:13px">Please change your password after first login.</p>
    `),
  })
}

/** Email verification link (access request or signup). */
export async function sendVerificationEmail({ to, name, token }) {
  const base = APP_URL().replace(/\/?$/, '')
  const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(token)}`
  return sendMail({
    to,
    subject: 'Verify your email — STS',
    html: wrapHtml('Verify your email', `
      <p>Hi ${name || 'there'},</p>
      <p>Confirm this email address to finish setting up your STS account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#0B1F3A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Verify email</a></p>
      <p style="color:#6b7280;font-size:13px">Or paste this link:<br/>${verifyUrl}</p>
    `),
  })
}

/** Notify platform admin of a new access request. */
export async function sendAccessRequestNotify({ to, businessName, contactName, email, message }) {
  if (!to) return { skipped: true }
  const admin = ADMIN_URL().replace(/\/?$/, '')
  return sendMail({
    to,
    subject: `New access request — ${businessName}`,
    html: wrapHtml('New access request', `
      <p><b>${businessName}</b> (${contactName || '—'} · ${email})</p>
      <p style="color:#374151">${message || ''}</p>
      <p><a href="${admin}/?view=requests">Review in admin</a></p>
    `),
  })
}
