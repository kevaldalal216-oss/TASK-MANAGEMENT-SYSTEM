import { Bell, CheckCheck, Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { useNotif } from '../context/NotifContext'
import Topbar from '../components/Layout/Topbar'
import Button from '../components/common/Button'

const TYPE_META = {
  task_created:  { Icon: Plus,     color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  task_updated:  { Icon: Edit,     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  task_assigned: { Icon: UserPlus, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  task_deleted:  { Icon: Trash2,   color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
}

function metaFor(type) {
  return TYPE_META[type] ?? { Icon: Bell, color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
}

function formatTs(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
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

export default function Notifications() {
  const { notifications, markAllRead, markOneRead } = useNotif()
  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Notifications" />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        {/* Summary card */}
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
                  width: 8, height: 8,
                  background: 'var(--danger)',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>
              {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {unread > 0 ? 'Click on any unread item to mark it read' : 'You have no unread notifications'}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <Bell size={36} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {notifications.map((n, i) => {
              const m = metaFor(n.type)
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOneRead(n.id)}
                  className="fade-in-up"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px 24px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--outline-variant)',
                    borderLeft: n.read ? '3px solid transparent' : `3px solid ${m.color}`,
                    background: n.read ? '#fff' : `${m.bg}40`,
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    animationDelay: `${Math.min(i * 30, 600)}ms`,
                  }}
                  onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = `${m.bg}80` }}
                  onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = `${m.bg}40` }}
                >
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{
                        fontSize: 14, fontWeight: n.read ? 500 : 700,
                        color: 'var(--on-surface)',
                      }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span style={{
                          width: 6, height: 6,
                          borderRadius: '50%',
                          background: m.color,
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatTs(n.created_at)} · {relativeTime(n.created_at)}
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
