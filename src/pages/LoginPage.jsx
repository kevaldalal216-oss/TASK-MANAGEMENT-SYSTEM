import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Activity, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Button from '../components/common/Button'

const appUrl =
  import.meta.env.REACT_APP_SITE_URL ||
  import.meta.env.REACT_APP_APP_URL ||
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  ''
const resetCooldownMs = 10 * 60 * 1000
const resetRateLimitCooldownMs = 10 * 60 * 1000
const resetCooldownStoragePrefix = 'password-reset-cooldown-until:'
const forgotPasswordSuccessMessage = 'If this email exists, a reset link has been sent.'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [lastResetSentAt, setLastResetSentAt] = useState(0)
  const [resetCooldownUntil, setResetCooldownUntilState] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const recoveryEmail = email.trim()
    setResetCooldownUntilState(recoveryEmail ? getResetCooldownUntil(recoveryEmail) : 0)
  }, [email])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message ?? 'Invalid login credentials')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    const recoveryEmail = normalizeEmail(email)
    if (!recoveryEmail) { setError('Enter your email above first'); return }
    if (!isValidEmail(recoveryEmail)) { setError('Enter a valid email address.'); return }

    const redirectBaseUrl = getPasswordResetBaseUrl()
    if (!redirectBaseUrl) {
      setError('Password reset is not configured. Add VITE_APP_URL with your live website URL, then request a new reset email.')
      return
    }

    const cooldownUntil = getResetCooldownUntil(recoveryEmail)
    const localCooldownUntil = lastResetSentAt + resetCooldownMs
    const remainingCooldown = Math.max(cooldownUntil, localCooldownUntil) - Date.now()
    if (remainingCooldown > 0) {
      setError('')
      setResetSent(true)
      return
    }

    setError('')
    setResetSent(false)
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${redirectBaseUrl}/reset-password`,
    })
    setResetLoading(false)

    const isRateLimit = error?.message?.toLowerCase().includes('rate limit')
    const nextCooldownUntil = Date.now() + (isRateLimit ? resetRateLimitCooldownMs : resetCooldownMs)
    setLastResetSentAt(Date.now())
    setResetCooldownUntil(recoveryEmail, nextCooldownUntil)
    setResetCooldownUntilState(nextCooldownUntil)
    setResetSent(true)

    if (error && !isRateLimit) {
      console.warn('Password reset request failed:', error.message)
    }
  }

  const resetWaitMs = Math.max(resetCooldownUntil, lastResetSentAt + resetCooldownMs) - now
  const isResetCoolingDown = resetWaitMs > 0

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--surface)',
    }}>
      {/* Left panel — gradient hero (hidden on small screens) */}
      <div className="login-hero" style={{
        flex: '1.2',
        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 35%, #3755c3 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#fff',
      }}>
        {/* Decorative blurs */}
        <div style={{
          position: 'absolute', top: -120, right: -100, width: 380, height: 380,
          borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -80, width: 320, height: 320,
          borderRadius: '50%', background: 'rgba(180, 197, 255, 0.18)', filter: 'blur(80px)',
        }} />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16,
            fontFamily: 'var(--font-headline)',
          }}>TF</div>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>
            TaskFlow TMS
          </span>
        </div>

        {/* Floating glass cards */}
        <div style={{
          position: 'absolute', top: '32%', right: '8%',
          width: 240, padding: 18,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          transform: 'rotate(2deg)',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, opacity: 0.85 }}>
            <Activity size={14} /> LIVE
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Q3 Audit Review</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>4 dependencies · 8 tasks</div>
          <div style={{
            marginTop: 10, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{ height: '100%', width: '72%', background: '#fff' }} />
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: '28%', left: '14%',
          width: 200, padding: 14,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          transform: 'rotate(-3deg)',
          zIndex: 2,
        }}>
          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>Tasks completed</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>+34</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>this week</div>
        </div>

        {/* Headline + bullets */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <h1 style={{
            fontSize: 42, fontWeight: 800,
            fontFamily: 'var(--font-headline)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
            marginBottom: 16,
          }}>
            Plan. Track.<br />Complete with confidence.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6, marginBottom: 28 }}>
            The unified workspace for 72 Street's task management — built for clarity, speed, and accountability.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { Icon: ShieldCheck, label: 'Role-based access' },
              { Icon: Activity,   label: 'Real-time sync' },
              { Icon: Users,      label: 'Team workflows' },
            ].map(({ Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 9999,
                fontSize: 12, fontWeight: 500,
              }}>
                <Icon size={14} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: 12, opacity: 0.7 }}>
          © 2026 72 Street — All rights reserved
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: '1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
        }}>
          <h2 style={{
            fontSize: 30, fontWeight: 700,
            fontFamily: 'var(--font-headline)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>
            Sign in to continue to your workspace.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Email address</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@72street.ai"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || isResetCoolingDown}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'none', border: 'none',
                    cursor: resetLoading || isResetCoolingDown ? 'not-allowed' : 'pointer',
                    opacity: resetLoading || isResetCoolingDown ? 0.65 : 1,
                    padding: 0,
                  }}
                >
                  {resetLoading
                    ? 'Sending...'
                    : isResetCoolingDown
                      ? `Wait ${formatWaitTime(resetWaitMs)}`
                      : 'Forgot password?'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', display: 'flex', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: 13, color: 'var(--danger)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-button)',
              }}>
                {error}
              </div>
            )}

            {resetSent && (
              <div style={{
                fontSize: 13, color: 'var(--success)',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-button)',
              }}>
                {forgotPasswordSuccessMessage}
              </div>
            )}

            <Button variant="primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p style={{
            marginTop: 32, textAlign: 'center', fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            Need an account? Contact your administrator.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .login-hero { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function getPasswordResetBaseUrl() {
  const configuredUrl = appUrl.trim().replace(/\/$/, '')
  if (configuredUrl) return configuredUrl

  const currentOrigin = window.location.origin.replace(/\/$/, '')
  return currentOrigin
}

function getResetCooldownUntil(email) {
  try {
    return Number(window.localStorage.getItem(`${resetCooldownStoragePrefix}${email.toLowerCase()}`)) || 0
  } catch (_) {
    return 0
  }
}

function setResetCooldownUntil(email, timestamp) {
  try {
    window.localStorage.setItem(`${resetCooldownStoragePrefix}${email.toLowerCase()}`, String(timestamp))
  } catch (_) {
    // Ignore storage failures; Supabase still enforces the real rate limit.
  }
}

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatWaitTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

const labelStyle = {
  fontSize: 13, fontWeight: 600,
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
