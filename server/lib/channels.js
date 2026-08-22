/**
 * Connection field specs for each channel. The admin UI fetches this from
 * GET /api/admin/connection-spec and renders the credential forms from it —
 * so adding a field here makes it appear in the UI with no frontend change.
 *
 * `secret: true` fields are masked in API responses and only stored encrypted.
 * `extRef` is the non-secret routing key saved to sts_channel_configs.ext_ref
 * so inbound webhooks can find the business. `required` decides `connected`.
 */
export const CONNECTION_SPEC = {
  whatsapp: {
    label: 'WhatsApp',
    icon: 'message-circle',
    extRef: 'phone_number_id',
    required: ['phone_number_id', 'access_token'],
    providers: [
      { id: 'cloud_api', label: 'Meta Cloud API' },
      { id: 'qr', label: 'QR / Linked Device' },
    ],
    fields: [
      { key: 'app_id', label: 'Meta App ID', secret: false },
      { key: 'app_secret', label: 'Meta App Secret', secret: true },
      { key: 'phone_number_id', label: 'Phone Number ID', secret: false },
      { key: 'waba_id', label: 'WhatsApp Business Account ID (WABA)', secret: false },
      { key: 'access_token', label: 'Permanent Access Token', secret: true },
      { key: 'verify_token', label: 'Webhook Verify Token', secret: true },
      { key: 'display_number', label: 'Business Display Number', secret: false },
    ],
  },
  instagram: {
    label: 'Instagram — Meta Messaging API',
    icon: 'instagram',
    extRef: 'ig_account_id',
    required: ['ig_account_id', 'page_access_token'],
    fields: [
      { key: 'app_id', label: 'Meta App ID', secret: false },
      { key: 'app_secret', label: 'Meta App Secret', secret: true },
      { key: 'page_id', label: 'Facebook Page ID', secret: false },
      { key: 'ig_account_id', label: 'Instagram Business Account ID', secret: false },
      { key: 'page_access_token', label: 'Page Access Token', secret: true },
      { key: 'verify_token', label: 'Webhook Verify Token', secret: true },
      { key: 'ig_username', label: 'Instagram Handle (@)', secret: false },
    ],
  },
  voice: {
    label: 'Voice Agent — Twilio',
    icon: 'phone-call',
    extRef: 'twilio_number',
    required: ['account_sid', 'auth_token', 'twilio_number'],
    fields: [
      { key: 'account_sid', label: 'Twilio Account SID', secret: true },
      { key: 'auth_token', label: 'Twilio Auth Token', secret: true },
      { key: 'twilio_number', label: 'Twilio Phone Number', secret: false },
      { key: 'voice_provider', label: 'Voice Provider', secret: false, type: 'select', options: ['standard', 'elevenlabs'] },
      { key: 'elevenlabs_api_key', label: 'ElevenLabs API Key (premium voice)', secret: true },
      { key: 'elevenlabs_voice_id', label: 'ElevenLabs Voice ID', secret: false },
    ],
  },
}

export const CHANNELS = Object.keys(CONNECTION_SPEC)

/** true if every required field for the channel has a value. */
export function isConnected(channel, creds) {
  if (!creds) return false
  if (channel === 'whatsapp' && creds.provider === 'qr') return creds.status === 'connected'
  const spec = CONNECTION_SPEC[channel]
  if (!spec) return false
  return spec.required.every((k) => String(creds[k] || '').trim() !== '')
}

/** WhatsApp transport: qr | cloud_api (default). */
export function resolveWhatsAppProvider(creds) {
  return creds?.provider === 'qr' ? 'qr' : 'cloud_api'
}
