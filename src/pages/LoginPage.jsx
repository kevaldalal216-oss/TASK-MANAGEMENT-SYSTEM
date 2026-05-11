import { useState } from 'react'
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
  window.location.origin
const resetCooldownMs = 60 * 1000

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
    const recoveryEmail = email.trim()
    if (!recoveryEmail) { setError('Enter your email above first'); return }

    const remainingCooldown = resetCooldownMs - (Date.now() - lastResetSentAt)
    if (remainingCooldown > 0) {
      setError(`Please wait ${Math.ceil(remainingCooldown / 1000)} seconds before requesting another reset email.`)
      return
    }

    setError('')
    setResetSent(false)
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${appUrl.replace(/\/$/, '')}/reset-password`,
    })
    setResetLoading(false)

    if (!error) {
      setLastResetSentAt(Date.now())
      setResetSent(true)
    } else {
      const message = error.message?.toLowerCase().includes('rate limit')
        ? 'Too many reset emails were requested. Please wait a few minutes, then try again.'
        : error.message
      setError(message)
    }
  }

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
                  disabled={resetLoading}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'none', border: 'none',
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                    opacity: resetLoading ? 0.65 : 1,
                    padding: 0,
                  }}
                >
                  {resetLoading ? 'Sending...' : 'Forgot password?'}
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
                Password reset email sent — check your inbox.
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
