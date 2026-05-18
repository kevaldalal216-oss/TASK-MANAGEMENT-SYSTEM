import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const appUrl =
  import.meta.env.REACT_APP_SITE_URL ||
  import.meta.env.REACT_APP_APP_URL ||
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  ''
const resetCooldownMs = 10 * 60 * 1000
const resetRateLimitCooldownMs = 10 * 60 * 1000
const resetCooldownStoragePrefix = 'password-reset-cooldown-until:'

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
    const recoveryEmail = email.trim()
    if (!recoveryEmail) {
      setError('Enter your email above first')
      return
    }

    const redirectBaseUrl = getPasswordResetBaseUrl()
    if (!redirectBaseUrl) {
      setError('Password reset is not configured. Add VITE_APP_URL with your live website URL, then request a new reset email.')
      return
    }

    const cooldownUntil = getResetCooldownUntil(recoveryEmail)
    const localCooldownUntil = lastResetSentAt + resetCooldownMs
    const remainingCooldown = Math.max(cooldownUntil, localCooldownUntil) - Date.now()
    if (remainingCooldown > 0) {
      setError(`Please wait ${formatWaitTime(remainingCooldown)} before requesting another reset email.`)
      return
    }

    setError('')
    setResetSent(false)
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${redirectBaseUrl}/reset-password`,
    })
    setResetLoading(false)

    if (!error) {
      setLastResetSentAt(Date.now())
      const nextCooldownUntil = Date.now() + resetCooldownMs
      setResetCooldownUntil(recoveryEmail, nextCooldownUntil)
      setResetCooldownUntilState(nextCooldownUntil)
      setResetSent(true)
    } else {
      const isRateLimit = error.message?.toLowerCase().includes('rate limit')
      if (isRateLimit) {
        const nextCooldownUntil = Date.now() + resetRateLimitCooldownMs
        setResetCooldownUntil(recoveryEmail, nextCooldownUntil)
        setResetCooldownUntilState(nextCooldownUntil)
      }
      const message = isRateLimit
        ? `Too many reset emails were requested. Please wait ${formatWaitTime(resetRateLimitCooldownMs)}, then try again.`
        : error.message
      setError(message)
    }
  }

  const resetWaitMs = Math.max(resetCooldownUntil, lastResetSentAt + resetCooldownMs) - now
  const isResetCoolingDown = resetWaitMs > 0

  return (
    <div className="tms-login-page">
      <div className="tms-brand">
        <h1>TMS BY 72 Street</h1>
      </div>

      <main className="login-card-shell">
        <section className="login-card" aria-label="Login">
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Login to your account</p>

          <form onSubmit={handleSubmit} className="tms-login-form">
            <label className="input-shell" aria-label="Username or Email">
              <User size={17} strokeWidth={2} />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Username or Email"
              />
            </label>

            <label className="input-shell" aria-label="Password">
              <Lock size={16} strokeWidth={2} />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>

            {error && (
              <div className="login-message error-message">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="login-message success-message">
                Password reset email sent - check your inbox.
              </div>
            )}

            <button className="signin-button" type="submit" disabled={loading}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <button
            type="button"
            className="forgot-link"
            onClick={handleForgotPassword}
            disabled={resetLoading || isResetCoolingDown}
          >
            {resetLoading
              ? 'Sending...'
              : isResetCoolingDown
                ? `Wait ${formatWaitTime(resetWaitMs)}`
                : 'Forgot Password?'}
          </button>
        </section>
      </main>

      <style>{loginStyles}</style>
    </div>
  )
}

function getPasswordResetBaseUrl() {
  const configuredUrl = appUrl.trim().replace(/\/$/, '')
  if (configuredUrl) return configuredUrl

  const currentOrigin = window.location.origin.replace(/\/$/, '')
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return isLocalhost ? '' : currentOrigin
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

function formatWaitTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

const loginStyles = `
  .tms-login-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
    padding: 34px;
    color: #f8fafc;
    background: #071114 url('/login-background.svg') center / cover no-repeat;
    isolation: isolate;
  }

  .tms-brand {
    position: absolute;
    top: clamp(34px, 7vh, 58px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 7;
    width: min(92vw, 900px);
    white-space: nowrap;
  }

  .tms-brand h1 {
    margin: 0;
    color: #ffd718;
    font-family: 'Merriweather', serif;
    font-size: 42px;
    line-height: 1;
    letter-spacing: 0;
    font-weight: 800;
    text-align: center;
  }

  .login-card-shell {
    position: relative;
    z-index: 8;
    width: min(100%, 276px);
    margin-top: 10px;
  }

  .login-card {
    width: 100%;
    min-height: 298px;
    padding: 22px 24px 20px;
    text-align: center;
    color: #071016;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 12px;
    background:
      radial-gradient(circle at 78% 30%, rgba(255, 245, 149, 0.38), transparent 16%),
      radial-gradient(circle at 26% 86%, rgba(156, 232, 230, 0.26), transparent 26%),
      rgba(248, 250, 252, 0.9);
    box-shadow:
      0 22px 62px rgba(0, 0, 0, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .login-card h2 {
    color: #070d12;
    font-size: 24px;
    line-height: 1.1;
    letter-spacing: 0;
    font-weight: 800;
    margin: 0 0 4px;
  }

  .login-subtitle {
    color: #161d23;
    font-size: 14px;
    margin-bottom: 17px;
  }

  .tms-login-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-shell {
    height: 36px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 11px;
    border: 1px solid rgba(23, 32, 39, 0.86);
    border-radius: 6px;
    background: rgba(250, 252, 255, 0.82);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
    color: #10171d;
  }

  .input-shell input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #10171d;
    font-size: 13px;
    box-shadow: none !important;
  }

  .input-shell input::placeholder {
    color: #313b45;
    opacity: 1;
  }

  .password-toggle {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: #10171d;
    padding: 0;
  }

  .signin-button {
    width: 100%;
    height: 37px;
    border-radius: 999px;
    margin-top: 1px;
    color: #0a1015;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    background: linear-gradient(180deg, #ffe129 0%, #ffd000 100%);
    box-shadow: 0 8px 17px rgba(255, 208, 0, 0.37);
  }

  .signin-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 11px 22px rgba(255, 208, 0, 0.43);
  }

  .signin-button:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  .forgot-link {
    display: inline-flex;
    justify-content: center;
    max-width: 100%;
    margin-top: 11px;
    color: #15222a;
    font-size: 12px;
    line-height: 1.25;
    padding: 0;
  }

  .forgot-link:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  .login-message {
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.25;
    text-align: left;
  }

  .error-message {
    color: #8a1111;
    background: rgba(254, 226, 226, 0.82);
    border: 1px solid rgba(185, 28, 28, 0.32);
  }

  .success-message {
    color: #055c3b;
    background: rgba(220, 252, 231, 0.84);
    border: 1px solid rgba(22, 163, 74, 0.32);
  }

  @media (max-width: 860px) {
    .tms-login-page {
      align-items: end;
      padding: 30px 20px 52px;
    }

    .tms-brand {
      top: 34px;
      transform: translateX(-50%) scale(0.74);
      transform-origin: center top;
    }

    .login-card-shell {
      width: min(100%, 292px);
      margin-top: 210px;
    }

  }

  @media (max-width: 520px) {
    .tms-brand {
      transform: translateX(-50%) scale(0.54);
    }

    .login-card-shell {
      margin-top: 175px;
    }

  }
`
