/**
 * Channel → [colorKey, iconName] lookup used by the Inbox to render the
 * per-conversation channel icon. This is a static UI map, not display data —
 * all conversation content comes from the API (GET /conversations).
 */
export const chIcon = {
  whatsapp: ['wa', 'message-circle'],
  instagram: ['ig', 'instagram'],
  voice: ['vc', 'phone-call'],
  web: ['web', 'globe'],
}
