import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { TaskProvider } from './context/TaskContext'
import { NotifProvider } from './context/NotifContext'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <TaskProvider>
              <NotifProvider>
                <App />
              </NotifProvider>
            </TaskProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
