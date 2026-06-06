import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotifContext = createContext(null)

function normalizeNotification(notification) {
  return {
    ...notification,
    user_id: notification.user_id ?? notification.userId,
    is_read: Boolean(notification.is_read ?? notification.isRead ?? notification.read),
    created_at: notification.created_at ?? notification.createdAt,
  }
}

export function NotifProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) { setNotifications([]); setUnreadCount(0); return }

    async function loadNotifs() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) {
        const normalized = data.map(normalizeNotification)
        setNotifications(normalized)
        setUnreadCount(normalized.filter(n => !n.is_read).length)
      }
    }

    loadNotifs()

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [normalizeNotification(payload.new), ...prev])
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function markAllRead() {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  async function markOneRead(id) {
    const notification = notifications.find(n => n.id === id)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      if (!notification?.is_read) setUnreadCount(c => Math.max(0, c - 1))
    }
  }

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead, markOneRead }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotif() {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotif must be inside NotifProvider')
  return ctx
}
