import WebSocket from 'ws'

const ws = new WebSocket('ws://localhost:4000/voice-stream')
ws.on('open', () => { console.log('WS /voice-stream handshake: OK ✅'); setTimeout(() => ws.close(), 200) })
ws.on('error', (e) => { console.log('WS error:', e.message); process.exit(1) })
ws.on('close', () => process.exit(0))
setTimeout(() => { console.log('WS timeout'); process.exit(1) }, 5000)
