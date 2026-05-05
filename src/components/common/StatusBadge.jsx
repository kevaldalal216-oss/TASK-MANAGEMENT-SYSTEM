const STATUS_MAP = {
  completed:   { label: 'Completed',   color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  in_progress: { label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  continuous:  { label: 'Continuous',  color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc' },
  hold:        { label: 'Hold',        color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  not_started: { label: 'Not Started', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 'var(--radius-badge)',
      fontSize: 11,
      fontWeight: 700,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: s.color, opacity: 0.9,
      }} />
      {s.label}
    </span>
  )
}

export { STATUS_MAP }
