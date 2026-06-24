import {
  Bell, CheckCheck, Plus, Edit, Trash2, UserPlus,
  CheckCircle2, GitBranch, Link2, ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotif } from '../context/NotifContext'
import Topbar from '../components/Layout/Topbar'
import Button from '../components/common/Button'

// ── Type metadata ────────────────────────────────────────────

const TYPE_META = {
  creation:        { Icon: Plus,          color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'Created'     },
  assignment:      { Icon: UserPlus,      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Assigned'    },
  task_assigned:   { Icon: UserPlus,      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Assigned'    },
  task_created:    { Icon: Plus,          color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'Created'     },
  task_updated:    { Icon: Edit,          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Updated'     },
  task_deleted:    { Icon: Trash2,        color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Deleted'     },
  update:          { Icon: Edit,          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Updated'     },
  subtask_update:  { Icon: GitBranch,     color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Subtask'     },
  completion:      { Icon: CheckCircle2,  color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: 'Completed'   },
  dependency:      { Icon: Link2,         color: '#c026d3', bg: '#fdf4ff', border: '#e879f9', label: 'Dependency'  },
}

function metaFor(type) {
  return TYPE_META[type] ?? { Icon: Bell, color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', label: 'Notice' }
}

// ── Formatters ───────────────────────────────────────────────

function formatTs(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Change pill (old → new) ──────────────────────────────────

function ChangePill({ oldValue, newValue }) {
  if (!oldValue && !newValue) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 6, padding: '2px 7px',
      fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{oldValue}</span>
      <ArrowRight size={10} />
      <span style={{ color: '#10b981', fontWeight: 700 }}>{newValue}</span>
    </span>
  )
}

// ── Dependency badge ─────────────────────────────────────────

function DependencyBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#fdf4ff', border: '1px solid #e879f9',
      borderRadius: 6, padding: '2px 8px',
      fontSize: 11, fontWeight: 700, color: '#c026d3',
      whiteSpace: 'nowrap',
    }}>
      <Link2 size={10} /> Cross-team dependency
    </span>
  )
}

// ── Type label chip ──────────────────────────────────────────

function TypeChip({ type }) {
  const m = metaFor(type)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: m.bg, border: `1px solid ${m.border}`,
      borderRadius: 6, padding: '1px 7px',
      fontSize: 10, fontWeight: 700, color: m.color,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {m.label}
    </span>
  )
}

// ── Single notification row ──────────────────────────────────

function NotifRow({ n, index, onOpen }) {
  const m = metaFor(n.type)
  const meta = n.metadata ?? {}
  const hasChange = meta.oldValue !== undefined && meta.newValue !== undefined
  const isDepNotif = n.type === 'dependency' || meta.isDependencyNotification

  return (
    <div
      onClick={() => onOpen(n)}
      className="fade-in-up"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 24px',
        borderTop: index === 0 ? 'none' : '1px solid var(--outline-variant)',
        borderLeft: n.is_read ? '3px solid transparent' : `3px solid ${m.color}`,
        background: n.is_read ? '#fff' : `${m.bg}50`,
        cursor: n.link || n.task_id || !n.is_read ? 'pointer' : 'default',
        transition: 'background 0.15s',
        animationDelay: `${Math.min(index * 25, 500)}ms`,
      }}
      onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.background = `${m.bg}90` }}
      onMouseLeave={e => { if (!n.is_read) e.currentTarget.style.background = `${m.bg}50` }}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 'var(--radius-button)', flexShrink: 0,
        background: m.bg, border: `1px solid ${m.border}`, color: m.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <m.Icon size={16} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, fontWeight: n.is_read ? 500 : 700,
            color: 'var(--on-surface)',
          }}>
            {n.title}
          </span>
          {!n.is_read && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: m.color, flexShrink: 0,
            }} />
          )}
          <TypeChip type={n.type} />
          {isDepNotif && <DependencyBadge />}
        </div>

        {/* Message */}
        <p style={{
          fontSize: 13, color: 'var(--text-secondary)',
          marginTop: 4, lineHeight: 1.5,
        }}>
          {n.message}
        </p>

        {/* Change pill (old → new) */}
        {hasChange && (
          <div style={{ marginTop: 6 }}>
            <ChangePill oldValue={meta.oldValue} newValue={meta.newValue} />
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', marginTop: 6,
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{formatTs(n.created_at)}</span>
          <span>·</span>
          <span>{relativeTime(n.created_at)}</span>
          {n.link && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>View task →</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Summary card ─────────────────────────────────────────────

function SummaryCard({ unread, onMarkAll }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)',
      padding: '20px 24px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: unread > 0
          ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
          : 'linear-gradient(135deg, var(--surface-container-low), var(--surface-container))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: unread > 0 ? 'var(--danger)' : 'var(--text-secondary)',
        position: 'relative',
      }}>
        <Bell size={20} />
        {unread > 0 && (
          <span
            className="pulse-dot"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--danger)', border: '2px solid #fff',
            }}
          />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>
          {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {unread > 0 ? 'Click a notification to mark it read and navigate to the task' : 'No unread notifications'}
        </p>
      </div>

      {unread > 0 && (
        <Button variant="secondary" size="sm" onClick={onMarkAll}>
          <CheckCheck size={14} /> Mark all read
        </Button>
      )}
    </div>
  )
}

// ── Legend ───────────────────────────────────────────────────

function Legend() {
  const types = [
    'creation', 'assignment', 'update', 'subtask_update', 'completion', 'dependency', 'task_deleted',
  ]
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
    }}>
      {types.map(t => <TypeChip key={t} type={t} />)}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export default function Notifications() {
  const { notifications, markAllRead, markOneRead } = useNotif()
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.is_read).length

  async function openNotification(n) {
    if (!n.is_read) await markOneRead(n.id)
    // task_deleted notifications have no live link
    if (n.type === 'task_deleted') return
    const target = n.link || (n.task_id ? `/tasks?task_id=${n.task_id}` : null)
    if (target) navigate(target)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Notifications" />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        <SummaryCard unread={unread} onMarkAll={markAllRead} />
        <Legend />

        {notifications.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <Bell size={36} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{
            background: '#fff', border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {notifications.map((n, i) => (
              <NotifRow key={n.id} n={n} index={i} onOpen={openNotification} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
