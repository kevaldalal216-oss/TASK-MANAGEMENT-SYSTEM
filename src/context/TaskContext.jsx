import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TaskContext = createContext(null)

export function TaskProvider({ children }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [departments, setDepartments] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) { setTasks([]); setLoading(false); return }

    async function loadAll() {
      setLoading(true)
      const [tasksRes, deptRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select('*, department:departments(name), owner:profiles!tasks_owner_id_fkey(full_name)').order('task_number', { ascending: true }),
        supabase.from('departments').select('*'),
        supabase.from('profiles').select('*, department:departments(name)'),
      ])
      if (!tasksRes.error) setTasks(tasksRes.data)
      if (!deptRes.error) setDepartments(deptRes.data)
      if (!profilesRes.error) setProfiles(profilesRes.data)
      setLoading(false)
    }

    loadAll()

    // Helper: re-fetch one task with its joins (department.name, owner.full_name)
    // so the realtime payload doesn't leave us with empty join columns.
    async function fetchTaskWithJoins(id) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, department:departments(name), owner:profiles!tasks_owner_id_fkey(full_name)')
        .eq('id', id)
        .single()
      return error ? null : data
    }

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const full = await fetchTaskWithJoins(payload.new.id)
          if (full) setTasks(prev => prev.some(t => t.id === full.id) ? prev : [...prev, full])
        }
        if (payload.eventType === 'UPDATE') {
          const full = await fetchTaskWithJoins(payload.new.id)
          if (full) setTasks(prev => prev.map(t => t.id === full.id ? full : t))
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // The .select(...).single() chain returns the inserted/updated row WITH
  // the joined department + owner names, so we can update local state
  // immediately. Realtime acts as a redundant cross-client sync — if it
  // fires for this same client, the idempotency guards in the channel
  // handler prevent duplicates.
  const TASK_SELECT = '*, department:departments(name), owner:profiles!tasks_owner_id_fkey(full_name)'

  function sortByTaskNumber(list) {
    return [...list].sort((a, b) => Number(a.task_number ?? 0) - Number(b.task_number ?? 0))
  }

  async function nextTaskNumber() {
    const { data, error } = await supabase
      .from('tasks')
      .select('task_number')
      .order('task_number', { ascending: false })
      .limit(1)
    if (error) throw error
    return Number(data?.[0]?.task_number ?? 0) + 1
  }

  async function renumberTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('task_number', { ascending: true })
    if (error) throw error

    const sorted = sortByTaskNumber(data ?? [])
    const updates = sorted
      .map((task, index) => ({ ...task, nextNumber: index + 1 }))
      .filter(task => task.task_number !== task.nextNumber)

    await Promise.all(updates.map(task =>
      supabase.from('tasks').update({ task_number: task.nextNumber }).eq('id', task.id)
    ))

    const renumbered = sorted.map((task, index) => ({ ...task, task_number: index + 1 }))
    setTasks(renumbered)
    return renumbered
  }

  async function createTask(data) {
    const taskNumber = await nextTaskNumber()
    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert({ ...data, task_number: taskNumber, created_by: user.id })
      .select(TASK_SELECT)
      .single()
    if (error) throw error
    setTasks(prev => sortByTaskNumber(prev.some(t => t.id === inserted.id) ? prev : [...prev, inserted]))
    return inserted
  }

  async function updateTask(id, data) {
    const { data: updated, error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id)
      .select(TASK_SELECT)
      .single()
    if (error) throw error
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setTasks(prev => sortByTaskNumber(prev.filter(t => t.id !== id)))
    await renumberTasks()
  }

  return (
    <TaskContext.Provider value={{ tasks, departments, profiles, loading, createTask, updateTask, deleteTask }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be inside TaskProvider')
  return ctx
}
