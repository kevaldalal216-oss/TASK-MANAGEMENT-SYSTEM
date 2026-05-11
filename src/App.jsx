import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import AppLayout from './components/Layout/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import SetupScreen from './pages/SetupScreen'

import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import GanttChart from './pages/GanttChart'
import AuditLog from './pages/AuditLog'
import Notifications from './pages/Notifications'
import UserManagement from './pages/UserManagement'

const adminRoles = ['super_admin', 'admin']

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { role, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!adminRoles.includes(role)) return <Navigate to="/tasks" replace />
  return children
}

function FullPageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: 'var(--text-muted)',
    }}>
      Loading…
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupScreen />

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/tasks"         element={<TaskList />} />
          <Route path="/gantt"         element={<GanttChart />} />
          <Route path="/notifications" element={<Notifications />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/audit" element={
            <RequireAdmin><AuditLog /></RequireAdmin>
          } />
          <Route path="/users" element={
            <RequireAdmin><UserManagement /></RequireAdmin>
          } />

          {/* Default redirect */}
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
