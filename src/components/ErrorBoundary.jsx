import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', flexDirection: 'column', gap: 12,
          color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: 24 }}>⚠</span>
          <p style={{ fontWeight: 600 }}>Something went wrong</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-button)',
              background: 'var(--accent-primary)', color: '#fff', fontSize: 14,
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
