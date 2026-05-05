import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, UserPlus, UserCog, LogIn, History, ScrollText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Topbar from '../components/Layout/Topbar'
import { useToast } from '../context/ToastContext'

const ACTION_META = {
  task_created: { label: 'created task', Icon: Plus,     color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  task_updated: { label: 'updated task', Icon: Edit,     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  task_deleted: { label: 'deleted task', Icon: Trash2,   color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  user_created: { label: 'created user', Icon: UserPlus, color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  user_updated: { label: 'updated user', Icon: UserCog,  color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  login:        { label: 'logged in',    Icon: LogIn,    color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
}

function metaFor(action) {
  return ACTION_META[action] ?? { label: action, Icon: History, color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
}

function formatTs(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function initialsOf(name) {
  if (!name) return '·'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) showToast(error.message, 'error')
      else setEntries(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Audit Log" />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        {/* Header summary card */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary-container), var(--surface-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)',
          }}>
            <ScrollText size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>
              Activity History
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Every change to tasks and users is logged here for audit and traceability.
            </p>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-badge)',
          }}>
            {entries.length} event{entries.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : entries.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <History size={36} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No audit events yet.</p>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {entries.map((entry, i) => {
              const m = metaFor(entry.action)
              return (
                <div
                  key={entry.id}
                  className="fade-in-up"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px 24px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--outline-variant)',
                    transition: 'background 0.15s',
                    animationDelay: `${Math.min(i * 30, 600)}ms`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-button)',
                    background: m.bg,
                    border: `1px solid ${m.border}`,
                    color: m.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <m.Icon size={16} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-headline)',
                      }}>{initialsOf(entry.actor?.full_name)}</span>
                      <strong style={{ fontSize: 13, color: 'var(--on-surface)' }}>
                        {entry.actor?.full_name ?? 'System'}
                      </strong>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</span>
                      {entry.entity_id && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: '2px 8px',
                          background: 'var(--surface-container)',
                          color: 'var(--text-secondary)',
                          borderRadius: 4,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {entry.entity_type}: {entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatTs(entry.created_at)} · {relativeTime(entry.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
