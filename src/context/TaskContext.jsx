import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TaskContext = createContext(null)
const adminRoles = ['super_admin', 'admin']

function normalizeDependency(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function TaskProvider({ children }) {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [departments, setDepartments] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) { setTasks([]); setLoading(false); return }
    if (!profile) { setTasks([]); setDepartments([]); setProfiles([]); setLoading(false); return }

    const isAdmin = adminRoles.includes(profile.role)
    const currentDepartmentId = profile.department_id
    let currentDepartmentName = null

    async function loadAll() {
      setLoading(true)
      let deptQuery = supabase.from('departments').select('*')
      let profilesQuery = supabase.from('profiles').select('*, department:departments(name)')

      if (isAdmin) {
        const [tasksRes, deptRes, profilesRes] = await Promise.all([
          supabase
            .from('tasks')
            .select(TASK_SELECT)
            .order('task_number', { ascending: true }),
          deptQuery,
          profilesQuery,
        ])
        if (!tasksRes.error) setTasks(tasksRes.data)
        if (!deptRes.error) setDepartments(deptRes.data)
        if (!profilesRes.error) setProfiles(profilesRes.data)
        setLoading(false)
        return
      }

      if (currentDepartmentId == null) {
        setTasks([])
        setDepartments([])
        setProfiles([])
        setLoading(false)
        return
      }

      deptQuery = deptQuery.eq('id', currentDepartmentId)
      profilesQuery = profilesQuery.eq('department_id', currentDepartmentId)

      const deptRes = await deptQuery
      if (!deptRes.error) setDepartments(deptRes.data)
      currentDepartmentName = deptRes.data?.[0]?.name ?? null

      const ownedTasksQuery = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('department_id', currentDepartmentId)
        .order('task_number', { ascending: true })
      const dependentTasksQuery = currentDepartmentName
        ? supabase
          .from('tasks')
          .select(TASK_SELECT)
          .eq('dependency', currentDepartmentName)
          .neq('department_id', currentDepartmentId)
          .order('task_number', { ascending: true })
        : Promise.resolve({ data: [], error: null })

      const [ownedTasksRes, dependentTasksRes, profilesRes] = await Promise.all([
        ownedTasksQuery,
        dependentTasksQuery,
        profilesQuery,
      ])
      const taskMap = new Map()
      if (!ownedTasksRes.error) ownedTasksRes.data.forEach(task => taskMap.set(task.id, task))
      if (!dependentTasksRes.error) dependentTasksRes.data.forEach(task => taskMap.set(task.id, task))
      setTasks(sortByTaskNumber([...taskMap.values()]))
      if (!profilesRes.error) setProfiles(profilesRes.data)
      setLoading(false)
    }

    loadAll()

    // Helper: re-fetch one task with its joins (department.name, owner.full_name)
    // so the realtime payload doesn't leave us with empty join columns.
    async function fetchTaskWithJoins(id) {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', id)
        .single()
      if (error) return null
      if (!isAdmin) {
        const sameDepartment = Number(data.department_id) === Number(currentDepartmentId)
        const dependentOnCurrentDepartment = currentDepartmentName
          && normalizeDependency(data.dependency) === normalizeDependency(currentDepartmentName)
        if (!sameDepartment && !dependentOnCurrentDepartment) return null
      }
      return data
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
          setTasks(prev => full
            ? prev.some(t => t.id === full.id)
              ? prev.map(t => t.id === full.id ? full : t)
              : sortByTaskNumber([...prev, full])
            : prev.filter(t => t.id !== payload.new.id)
          )
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    const deptChannel = supabase
      .channel('departments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (isAdmin || Number(payload.new.id) === Number(currentDepartmentId)) {
            setDepartments(prev => prev.some(d => d.id === payload.new.id) ? prev : [...prev, payload.new])
          }
        }
        if (payload.eventType === 'UPDATE') {
          setDepartments(prev => {
            if (!isAdmin && Number(payload.new.id) !== Number(currentDepartmentId)) {
              return prev.filter(d => d.id !== payload.new.id)
            }
            return prev.some(d => d.id === payload.new.id)
              ? prev.map(d => d.id === payload.new.id ? payload.new : d)
              : [...prev, payload.new]
          })
        }
        if (payload.eventType === 'DELETE') {
          setDepartments(prev => prev.filter(d => d.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(deptChannel)
    }
  }, [user, profile])

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
    let query = supabase
      .from('tasks')
      .select('task_number')
      .order('task_number', { ascending: false })
      .limit(1)
    if (!adminRoles.includes(profile?.role) && profile?.department_id != null) {
      query = query.eq('department_id', profile.department_id)
    }
    const { data, error } = await query
    if (error) throw error
    return Number(data?.[0]?.task_number ?? 0) + 1
  }

  async function renumberTasks() {
    let query = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('task_number', { ascending: true })
    if (!adminRoles.includes(profile?.role) && profile?.department_id != null) {
      query = query.eq('department_id', profile.department_id)
    }
    const { data, error } = await query
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

  function canDeleteTask(task) {
    if (!task || !user) return false

    const currentProfile = profiles.find(p => p.id === user.id) ?? profile
    const currentDepartmentId = currentProfile?.department_id
    const ownsTask = task.owner_id === user.id || task.created_by === user.id
    const sameDepartment = currentDepartmentId != null
      && task.department_id != null
      && Number(task.department_id) === Number(currentDepartmentId)

    return ownsTask || sameDepartment
  }

  async function deleteTask(taskOrId) {
    const task = typeof taskOrId === 'object'
      ? taskOrId
      : tasks.find(t => t.id === taskOrId)

    if (!canDeleteTask(task)) {
      throw new Error('You can only delete tasks assigned to you or your department.')
    }

    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) throw error
    setTasks(prev => sortByTaskNumber(prev.filter(t => t.id !== task.id)))
    await renumberTasks()
  }

  async function createDepartment(data) {
    const { data: inserted, error } = await supabase
      .from('departments')
      .insert(data)
      .select('*')
      .single()
    if (error) throw error
    setDepartments(prev => [...prev, inserted])
    return inserted
  }

  return (
    <TaskContext.Provider value={{ tasks, departments, profiles, loading, createTask, updateTask, deleteTask, canDeleteTask, createDepartment }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be inside TaskProvider')
  return ctx
}
