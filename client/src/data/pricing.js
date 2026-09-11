/**
 * Landing pricing — WhatsApp only while other channels are not live yet.
 * Restore Instagram / Voice / Bundle tabs here when those products launch.
 */
export const priceTabs = [
  { id: 'p-wa', label: 'tb_wa' },
]

export const priceData = {
  'p-wa': [
    {
      code: 'wa_starter',
      name: 'WhatsApp Starter',
      who: 'who_s',
      price: '14.990',
      hot: false,
      feats: ['pw1', 'pw_api', 'pw_ho', 'pw_kb', 'pw_extra'],
    },
    {
      code: 'wa_growth',
      name: 'WhatsApp Growth',
      who: 'who_g',
      price: '19.990',
      hot: true,
      feats: ['pw2', 'pw_api', 'pw_ho', 'pw_rep', 'pw_extra'],
    },
    {
      code: 'wa_pro',
      name: 'WhatsApp Pro',
      who: 'who_p',
      price: '27.990',
      hot: false,
      feats: ['pw3', 'pw_api', 'pw_ho', 'pw_pri', 'pw_extra'],
    },
    {
      code: 'wa_custom',
      name: 'Custom',
      who: 'who_custom',
      price: 'Quote',
      priceIsLabel: true,
      hot: false,
      custom: true,
      feats: ['pw_custom1', 'pw_custom2', 'pw_extra', 'pw_pri'],
    },
  ],
}
