import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = ++nextId
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          padding: '12px 16px',
          background: 'var(--bg-primary)',
          borderLeft: `4px solid ${t.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          fontSize: 14,
          color: 'var(--text-primary)',
          minWidth: 240,
          maxWidth: 360,
        }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
