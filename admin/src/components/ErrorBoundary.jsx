import { Component } from 'react'

/**
 * Catches any render/runtime error in the admin tree and shows a recoverable
 * screen instead of a blank white page. Inline styles only, so it still
 * renders if the stylesheet failed to load.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Admin error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={badge}>!</div>
          <h1 style={h1}>Something went wrong</h1>
          <p style={p}>The admin panel hit an unexpected error. Reloading usually fixes it.</p>
          <div style={row}>
            <button style={btnPrimary} onClick={() => window.location.reload()}>Reload page</button>
            <button style={btnGhost} onClick={() => { window.location.href = '/' }}>Back to sign in</button>
          </div>
        </div>
      </div>
    )
  }
}

const wrap = { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F4F7FA', fontFamily: "'Inter', system-ui, sans-serif" }
const card = { maxWidth: 420, width: '100%', background: '#fff', borderRadius: 16, padding: '34px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(7,26,43,.12)' }
const badge = { width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', color: '#B91C1C', fontSize: 28, fontWeight: 800, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }
const h1 = { fontSize: 20, fontWeight: 800, color: '#071A2B', margin: '0 0 8px' }
const p = { fontSize: 14, color: '#5C6B7C', margin: '0 0 22px', lineHeight: 1.5 }
const row = { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }
const btnPrimary = { border: 0, borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#0FBE8F', color: '#03271B' }
const btnGhost = { borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#fff', color: '#071A2B', border: '1px solid #E2E8F0' }
