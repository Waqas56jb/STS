import { Component } from 'react'

/** Catches render errors so a refresh or bad state never whitescreens the app. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#5c6b7c', marginBottom: 16 }}>Your session is safe — try refreshing this page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#0FBE8F', fontWeight: 700, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
