import { Link } from 'react-router-dom'

/**
 * Public legal pages — Privacy Policy and Terms of Service.
 * Served at /privacy and /terms so they can be submitted to Meta (App Review)
 * and linked from WhatsApp/Instagram business settings.
 */
const COMPANY = 'STS Tech Solutions'
const SITE = 'https://www.stsq8.com'
const EMAIL = 'sts@shgardiauto.com'
const UPDATED = 'August 11, 2026'

const page = {
  maxWidth: 860, margin: '0 auto', padding: '48px 22px 80px',
  fontFamily: "'Inter','IBM Plex Sans Arabic',ui-sans-serif,system-ui,sans-serif",
  color: '#1B2A3A', lineHeight: 1.65, fontSize: 15.5,
}
const h1 = { fontSize: 30, fontWeight: 800, color: '#071A2B', margin: '0 0 6px' }
const meta = { color: '#5C6B7C', fontSize: 13.5, marginBottom: 30 }
const h2 = { fontSize: 19, fontWeight: 800, color: '#071A2B', margin: '30px 0 8px' }
const ul = { margin: '8px 0 8px 2px', paddingInlineStart: 20 }
const brandBar = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 22px', borderBottom: '1px solid #E6ECF2', background: '#fff',
  position: 'sticky', top: 0,
}

function Shell({ title, children }) {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={brandBar}>
        <Link to="/" style={{ fontWeight: 800, color: '#0FBE8F', textDecoration: 'none', fontSize: 18 }}>STS</Link>
        <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <Link to="/privacy" style={{ color: '#5C6B7C', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: '#5C6B7C', textDecoration: 'none' }}>Terms</Link>
          <Link to="/" style={{ color: '#5C6B7C', textDecoration: 'none' }}>Home</Link>
        </div>
      </div>
      <div style={page}>
        <h1 style={h1}>{title}</h1>
        <div style={meta}>{COMPANY} · Last updated: {UPDATED}</div>
        {children}
        <hr style={{ border: 0, borderTop: '1px solid #E6ECF2', margin: '40px 0 18px' }} />
        <div style={{ color: '#5C6B7C', fontSize: 13.5 }}>
          Questions? Contact us at <a href={`mailto:${EMAIL}`} style={{ color: '#0a9873' }}>{EMAIL}</a> · {SITE}
        </div>
      </div>
    </div>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p>
        This Privacy Policy explains how {COMPANY} (“STS”, “we”, “us”) collects, uses, and protects
        information when you use our AI customer-engagement platform and services, including our
        WhatsApp, Instagram, website chat, and AI voice-calling agents (the “Services”). By using the
        Services you agree to the practices described here.
      </p>

      <h2 style={h2}>Information We Collect</h2>
      <ul style={ul}>
        <li><b>Account information</b> — business name, contact name, email, phone number, and login credentials.</li>
        <li><b>Conversation data</b> — messages, call transcripts, and media exchanged between a business and its
          customers through WhatsApp, Instagram, website chat, or voice calls, so the AI assistant can respond.</li>
        <li><b>Business configuration</b> — knowledge-base content, bot settings, and channel connection details you
          provide to train and run your agents.</li>
        <li><b>Usage and technical data</b> — log data, device/browser information, timestamps, and diagnostic
          information used to operate and secure the Services.</li>
      </ul>

      <h2 style={h2}>How We Use Information</h2>
      <ul style={ul}>
        <li>To provide, operate, and improve the Services and generate AI responses.</li>
        <li>To route and deliver messages and calls between businesses and their customers.</li>
        <li>To authenticate users, prevent abuse, and maintain security.</li>
        <li>To provide support, billing, and account management.</li>
      </ul>

      <h2 style={h2}>Messaging Platforms (Meta / WhatsApp & Instagram)</h2>
      <p>
        When a business connects WhatsApp Business or Instagram, messages are transmitted through Meta
        Platforms, Inc. in accordance with Meta’s terms and policies. We process message content only to
        deliver automated responses on the connected business’s behalf. We do not sell message content,
        and we do not use it for advertising.
      </p>

      <h2 style={h2}>Third-Party Service Providers</h2>
      <p>
        We use trusted providers to deliver the Services, including AI model providers (e.g., OpenAI) for
        generating responses and transcripts, cloud hosting and database providers for storage, and
        communication providers (e.g., Meta for WhatsApp/Instagram, Twilio for voice). These providers
        process data only as needed to perform their functions and are bound by confidentiality and data-
        protection obligations.
      </p>

      <h2 style={h2}>Data Retention</h2>
      <p>
        We retain information for as long as an account is active or as needed to provide the Services,
        comply with legal obligations, resolve disputes, and enforce agreements. Businesses may request
        deletion of their data as described below.
      </p>

      <h2 style={h2}>Data Security</h2>
      <p>
        We apply industry-standard safeguards, including encryption of stored channel credentials and
        access controls, to protect information. No method of transmission or storage is completely
        secure, but we work to protect your data using reasonable technical and organizational measures.
      </p>

      <h2 style={h2}>Your Rights</h2>
      <ul style={ul}>
        <li>Access, correct, or delete your account and business data.</li>
        <li>Disconnect a messaging channel at any time from your dashboard.</li>
        <li>Request a copy of the information we hold about you.</li>
      </ul>

      <h2 style={h2}>Children’s Privacy</h2>
      <p>The Services are intended for businesses and are not directed to children under 16.</p>

      <h2 style={h2}>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by updating
        the “Last updated” date above.
      </p>

      <h2 style={h2}>Contact Us</h2>
      <p>
        For privacy questions or data requests, contact {COMPANY} at{' '}
        <a href={`mailto:${EMAIL}`} style={{ color: '#0a9873' }}>{EMAIL}</a>.
      </p>
    </Shell>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your access to and use of the {COMPANY} platform and
        services (the “Services”). By creating an account or using the Services you agree to these Terms.
      </p>

      <h2 style={h2}>The Services</h2>
      <p>
        STS provides AI customer-engagement agents for WhatsApp, Instagram, website chat, and AI voice
        calling. You are responsible for the content, knowledge base, and configuration you provide, and
        for ensuring your use complies with applicable laws and the policies of connected platforms
        (including Meta and Twilio).
      </p>

      <h2 style={h2}>Accounts</h2>
      <ul style={ul}>
        <li>You must provide accurate information and keep your credentials secure.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>Accounts are provisioned and may be managed by STS administrators.</li>
      </ul>

      <h2 style={h2}>Acceptable Use</h2>
      <ul style={ul}>
        <li>Do not use the Services for spam, unlawful, deceptive, harmful, or abusive messaging.</li>
        <li>Do not send messages without the required consent of recipients.</li>
        <li>Comply with WhatsApp Business Messaging Policy, Meta Platform Terms, and all applicable laws.</li>
        <li>Do not attempt to disrupt, reverse-engineer, or gain unauthorized access to the Services.</li>
      </ul>

      <h2 style={h2}>Customer Data</h2>
      <p>
        You retain ownership of your content and your customers’ conversation data. You grant STS a limited
        license to process this data solely to provide the Services, as described in our{' '}
        <Link to="/privacy" style={{ color: '#0a9873' }}>Privacy Policy</Link>.
      </p>

      <h2 style={h2}>Third-Party Platforms</h2>
      <p>
        The Services integrate with third-party platforms (e.g., Meta/WhatsApp/Instagram, Twilio, OpenAI).
        Your use of those platforms is also subject to their respective terms, and their availability is
        outside our control.
      </p>

      <h2 style={h2}>Fees</h2>
      <p>
        Paid plans are billed as described at sign-up or in your agreement. Messaging and calling charges
        levied by third-party platforms (e.g., WhatsApp conversation fees, telephony charges) may apply and
        are your responsibility.
      </p>

      <h2 style={h2}>Disclaimers &amp; Limitation of Liability</h2>
      <p>
        The Services are provided “as is” without warranties of any kind. AI-generated responses may
        contain errors and should be reviewed for critical use. To the maximum extent permitted by law,
        STS is not liable for indirect, incidental, or consequential damages arising from use of the
        Services.
      </p>

      <h2 style={h2}>Termination</h2>
      <p>
        You may stop using the Services at any time. We may suspend or terminate access for violations of
        these Terms or applicable platform policies.
      </p>

      <h2 style={h2}>Changes to These Terms</h2>
      <p>We may update these Terms; continued use after changes constitutes acceptance of the revised Terms.</p>

      <h2 style={h2}>Contact</h2>
      <p>
        Questions about these Terms? Contact {COMPANY} at{' '}
        <a href={`mailto:${EMAIL}`} style={{ color: '#0a9873' }}>{EMAIL}</a>.
      </p>
    </Shell>
  )
}
