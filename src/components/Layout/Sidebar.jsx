import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ListTodo, GanttChartSquare,
  Bell, ScrollText, Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../context/NotifContext'

const adminRoles = ['super_admin', 'admin']

export default function Sidebar() {
  const { role } = useAuth()
  const { unreadCount } = useNotif()

  const navItems = [
    { to: '/dashboard',      label: 'Dashboard',       Icon: LayoutDashboard, adminOnly: false },
    { to: '/tasks',          label: 'Task List',       Icon: ListTodo,         adminOnly: false },
    { to: '/gantt',          label: 'Gantt Chart',     Icon: GanttChartSquare, adminOnly: false },
    { to: '/notifications',  label: 'Notifications',   Icon: Bell,             adminOnly: false, badge: unreadCount },
    { to: '/audit',          label: 'Audit Log',       Icon: ScrollText,       adminOnly: true },
    { to: '/users',          label: 'User Management', Icon: Users,            adminOnly: true },
  ]

  const visible = navItems.filter(item =>
    !item.adminOnly || adminRoles.includes(role)
  )

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'rgba(248, 250, 254, 0.85)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderRight: '1px solid var(--outline-variant)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand block */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px',
        borderBottom: '1px solid var(--outline-variant)',
      }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 'var(--radius-button)',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 13,
          fontFamily: 'var(--font-headline)',
          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
        }}>
          TF
        </div>
        <span style={{
          fontWeight: 700, fontSize: 16,
          fontFamily: 'var(--font-headline)',
          color: 'var(--on-surface)',
          letterSpacing: '-0.01em',
        }}>
          TaskFlow TMS
        </span>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive
                ? 'linear-gradient(90deg, rgba(37,99,235,0.10), rgba(37,99,235,0))'
                : 'transparent',
              borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              borderRadius: 'var(--radius-button)',
              textDecoration: 'none',
              transition: 'all 0.2s ease-out',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.borderLeftColor.includes('rgb(37'))
                e.currentTarget.style.background = 'rgba(225, 226, 237, 0.4)'
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.style.borderLeftColor.includes('rgb(37'))
                e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon size={18} strokeWidth={2.2} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge > 0 && (
              <span style={{
                background: 'var(--danger)', color: '#fff',
                borderRadius: 'var(--radius-badge)',
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px',
                minWidth: 20, textAlign: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
              }}>
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer block */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--outline-variant)',
        fontSize: 11,
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        Plan · Track · Complete
      </div>
    </aside>
  )
}
