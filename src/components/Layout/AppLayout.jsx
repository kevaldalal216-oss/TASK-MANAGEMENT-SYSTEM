import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--surface)',
      backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(37,99,235,0.04) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(124,58,237,0.04) 0%, transparent 40%)',
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  )
}
