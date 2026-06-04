const variantStyles = {
  primary: {
    background: 'var(--primary)',
    color: '#fff',
    border: '1px solid var(--primary)',
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
    hoverBg: 'var(--primary-hover)',
    hoverShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
  },
  secondary: {
    background: 'rgba(255, 255, 255, 0.7)',
    color: 'var(--text-primary)',
    border: '1px solid var(--outline-variant)',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    hoverBg: 'var(--surface-container)',
    hoverShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid var(--danger)',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
    hoverBg: '#dc2626',
    hoverShadow: '0 6px 16px rgba(239, 68, 68, 0.35)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    boxShadow: 'none',
    hoverBg: 'var(--surface-container)',
    hoverShadow: 'none',
  },
}

const sizeStyles = {
  sm: { padding: '7px 12px', fontSize: 12, fontWeight: 600 },
  md: { padding: '10px 18px', fontSize: 14, fontWeight: 600 },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  children,
  style,
}) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        background: v.background,
        color: v.color,
        border: v.border,
        boxShadow: v.boxShadow,
        ...s,
        borderRadius: 'var(--radius-button)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease-out',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = v.hoverBg
        e.currentTarget.style.boxShadow = v.hoverShadow
        e.currentTarget.style.transform = variant === 'ghost' ? 'none' : 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.background = v.background
        e.currentTarget.style.boxShadow = v.boxShadow
        e.currentTarget.style.transform = 'none'
      }}
    >
      {children}
    </button>
  )
}
