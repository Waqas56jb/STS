const tok = 'EAAV1XnR0vHoBSC9N9t621F5cXDcnjV31ZCGhjUkXT5sqckDlAMymkmF7FYyrIURPiTAW9VQZBCOTqzrtN0EUTLMnJpqXYZB64CUdQgYvM2Xd1pZCSFviDq74ZAzzy5G3jZBRRCmZC3uoSrcHmK5Fudt0wrj4ZApXIGbZBGlN6hVDt1cFlpiYKJmal58f42MglyBON6CmXlQ6mfi17aYR9'
const phone = '1162949133579524'
const r = await fetch(`https://graph.facebook.com/v21.0/${phone}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to: '96599999999', type: 'text', text: { body: 'probe' } }),
})
const d = await r.json().catch(() => ({}))
console.log('send → HTTP', r.status, JSON.stringify(d))
console.log(r.status === 400 && d?.error?.code === 131030
  ? '✅ Number CAN send — sirf recipient allow-list me add karna hai.'
  : (r.ok ? '✅ SENT' : '⚠️ ' + (d?.error?.message || 'unexpected')))
