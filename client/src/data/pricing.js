/**
 * Landing pricing tables — transcribed 1:1 from the original index.html
 * pricing panes. `feat` values are dictionary keys (rendered via t()),
 * plain strings are literal (bundle "includes" lines). `save` values are
 * HTML dictionary keys for the coloured "Save X KWD" badges.
 */
export const priceTabs = [
  { id: 'p-wa', label: 'tb_wa' },
  { id: 'p-ig', label: 'tb_ig' },
  { id: 'p-vc', label: 'tb_vc' },
  { id: 'p-b1', label: 'tb_b1' },
  { id: 'p-b2', label: 'tb_b2' },
]

export const priceData = {
  'p-wa': [
    { name: 'WhatsApp Starter', who: 'who_s', price: '20', hot: false, feats: ['pw1', 'pw_api', 'pw_ho', 'pw_kb'] },
    { name: 'WhatsApp Growth', who: 'who_g', price: '25', hot: true, feats: ['pw2', 'pw_api', 'pw_ho', 'pw_rep'] },
    { name: 'WhatsApp Pro', who: 'who_p', price: '34.90', hot: false, feats: ['pw3', 'pw_api', 'pw_ho', 'pw_pri'] },
  ],
  'p-ig': [
    { name: 'Instagram Starter', who: 'who_s', price: '20', hot: false, feats: ['pi1', 'pi_dm', 'pw_kb'] },
    { name: 'Instagram Growth', who: 'who_g', price: '32', hot: true, feats: ['pi2', 'pi_dm', 'pw_rep'] },
    { name: 'Instagram Business', who: 'who_p', price: '55', hot: false, feats: ['pi3', 'pi_dm', 'pw_pri'] },
  ],
  'p-vc': [
    { name: 'Voice Starter', who: 'vc_std', price: '39', hot: false, feats: ['pv1', 'pv_tr', 'pv_ar'] },
    { name: 'Voice Standard', who: 'vc_std', price: '119', hot: true, feats: ['pv2', 'pv_tr', 'pv_in'] },
    { name: 'Voice Premium', who: 'vc_el', price: '329', hot: false, feats: ['pv2', 'pv_el', 'pw_pri'] },
  ],
  'p-b1': [
    { name: 'Social Starter', who: 'WA Starter + IG Starter', whoLiteral: true, price: '34', was: '40', save: 'sv6', hot: false, feats: ['b_all2', 'b_inb'] },
    { name: 'Social Growth', who: 'WA Growth + IG Growth', whoLiteral: true, price: '48', was: '57', save: 'sv9', hot: true, tag: 'best_value', feats: ['b_all2g', 'b_inb'] },
    { name: 'Social Pro', who: 'WA Pro + IG Business', whoLiteral: true, price: '76', was: '89.90', save: 'sv13', hot: false, feats: ['b_all2p', 'pw_pri'] },
  ],
  'p-b2': [
    { name: 'Complete Starter', who: 'WA + IG + Voice Starter', whoLiteral: true, price: '65', was: '79', save: 'sv14', hot: false, feats: ['b_3ch', 'pw_kb'] },
    { name: 'Complete Growth', who: 'WA + IG Growth + Voice Standard', whoLiteral: true, price: '145', was: '176', save: 'sv31', hot: true, tag: 'best_value', feats: ['b_3ch', 'pw_rep'] },
    { name: 'Complete Pro', who: 'WA Pro + IG Business + Voice Premium', whoLiteral: true, price: '349', was: '418.90', save: 'sv69', hot: false, feats: ['b_3ch', 'pv_el'] },
  ],
}
