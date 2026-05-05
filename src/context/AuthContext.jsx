import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    let cancelled = false

    // Hard cap: never let the spinner hang past 6 seconds, no matter what.
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 6000)

    async function syncFromSession(session) {
      if (cancelled) return
      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      setUser(session.user)
      // Fetch profile but don't block UI on errors / slowness
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (!cancelled && data) setProfile(data)
      } catch (_) {
        // Profile fetch failed — leave profile null, UI handles it.
      } finally {
        if (!cancelled) {
          setLoading(false)
          clearTimeout(timeout)
        }
      }
    }

    // Restore cached session immediately (avoids waiting for onAuthStateChange).
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncFromSession(session)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => { syncFromSession(session) }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
