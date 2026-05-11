import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Button from '../components/common/Button'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkRecoverySession() {
      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const linkError = params.get('error_description') || hashParams.get('error_description')

      if (linkError) {
        setError(linkError.replace(/\+/g, ' '))
        setCheckingSession(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      setHasSession(Boolean(data.session))
      if (!data.session) {
        setError('This reset link is invalid or has expired. Please request a new password reset email.')
      }
      setCheckingSession(false)
    }

    checkRecoverySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(Boolean(session))
        setError('')
        setCheckingSession(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
    await supabase.auth.signOut()
    window.setTimeout(() => navigate('/login', { replace: true }), 1500)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: 32,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--primary-container)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <LockKeyhole size={22} />
        </div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'var(--font-headline)',
          marginBottom: 8,
        }}>
          Reset password
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 26 }}>
          Create a new password for your TaskFlow TMS account.
        </p>

        {checkingSession ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Checking reset link...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PasswordField
              label="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              showPw={showPw}
              toggleShowPw={() => setShowPw(p => !p)}
              autoFocus={hasSession}
            />

            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              showPw={showPw}
              toggleShowPw={() => setShowPw(p => !p)}
            />

            {error && (
              <div style={messageStyle('var(--danger)', 'var(--danger-bg)', 'var(--danger-border)')}>
                {error}
              </div>
            )}

            {success && (
              <div style={messageStyle('var(--success)', 'var(--success-bg)', 'var(--success-border)')}>
                Password updated. Redirecting to login...
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              disabled={!hasSession || loading || success}
              style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          style={{
            display: 'block',
            marginTop: 24,
            textAlign: 'center',
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, showPw, toggleShowPw, autoFocus = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPw ? 'text' : 'password'}
          required
          minLength={8}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          placeholder="Minimum 8 characters"
          style={{ ...inputStyle, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={toggleShowPw}
          aria-label={showPw ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex',
            padding: 4,
          }}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
}

const inputStyle = {
  padding: '12px 14px',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-button)',
  fontSize: 14,
  color: 'var(--text-primary)',
  background: '#fff',
  width: '100%',
  transition: 'all 0.2s',
}

function messageStyle(color, background, borderColor) {
  return {
    fontSize: 13,
    color,
    background,
    border: `1px solid ${borderColor}`,
    padding: '10px 12px',
    borderRadius: 'var(--radius-button)',
  }
}
