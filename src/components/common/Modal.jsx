import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 520 }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      <div
        ref={dialogRef}
        className="fade-in-up"
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)',
          border: '1px solid var(--outline-variant)',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--outline-variant)',
          background: 'linear-gradient(180deg, var(--surface-container-low), #fff)',
          flexShrink: 0,
        }}>
          <span style={{
            fontWeight: 700, fontSize: 16,
            fontFamily: 'var(--font-headline)',
            color: 'var(--on-surface)',
            letterSpacing: '-0.01em',
          }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              padding: 6, borderRadius: 'var(--radius-button)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-container)'
              e.currentTarget.style.color = 'var(--on-surface)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
