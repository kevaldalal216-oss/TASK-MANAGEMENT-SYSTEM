import { LogOut, Plus, Bell, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../context/NotifContext'
import Button from '../common/Button'

function initialsOf(name) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function Topbar({ title, onAddTask, onAssignTask }) {
  const { profile, logout } = useAuth()
  const { unreadCount } = useNotif()

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--outline-variant)',
      boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04)',
      display: 'flex', alignItems: 'center',
      padding: '0 var(--content-padding)',
      gap: 16,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <h1 style={{
        fontWeight: 700, fontSize: 20, flex: 1,
        fontFamily: 'var(--font-headline)',
        letterSpacing: '-0.01em',
        color: 'var(--on-surface)',
      }}>
        {title}
      </h1>

      {onAddTask && (
        <Button variant="primary" size="sm" onClick={onAddTask}>
          <Plus size={14} /> Add Task
        </Button>
      )}

      {onAssignTask && (
        <Button variant="secondary" size="sm" onClick={onAssignTask}>
          <UserPlus size={14} /> Assign Task
        </Button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          to="/notifications"
          title="Notifications"
          style={{
            position: 'relative',
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-badge)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--surface-container)'
            e.currentTarget.style.color = 'var(--primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              className="pulse-dot"
              style={{
                position: 'absolute', top: 7, right: 7,
                width: 8, height: 8,
                background: 'var(--danger)',
                borderRadius: '50%',
                border: '2px solid #fff',
              }}
            />
          )}
        </Link>

        <div style={{ width: 1, height: 24, background: 'var(--outline-variant)', margin: '0 4px' }} />

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: '#fff',
            fontWeight: 700, fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-headline)',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
          }}>
            {initialsOf(profile?.full_name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>
              {profile?.full_name ?? '—'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {(profile?.role ?? '').replace('_', ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Logout"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
            padding: '8px 12px', borderRadius: 'var(--radius-button)',
            border: '1px solid var(--outline-variant)',
            background: 'rgba(255,255,255,0.6)',
            marginLeft: 4,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--danger-bg)'
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.borderColor = 'var(--danger-border)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.borderColor = 'var(--outline-variant)'
          }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  )
}
