import { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { useTasks } from '../../context/TaskContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'continuous', 'hold', 'completed']
const PRIORITY_OPTIONS = ['High', 'medium', 'Low']

export default function TaskDetail({ task, onClose }) {
  const { departments, profiles, updateTask, deleteTask, canDeleteTask } = useTasks()
  const { showToast } = useToast()
  const { user, role, profile } = useAuth()
  const [form, setForm] = useState({ ...task, subtasks: parseSubtasks(task.subtask, task.subtask_dependency) })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setSubtask(index, field, value) {
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) => (
        i === index ? { ...subtask, [field]: value } : subtask
      )),
    }))
  }

  function addSubtask() {
    setForm(prev => ({ ...prev, subtasks: [...prev.subtasks, { title: '', dependency: '' }] }))
  }

  function removeSubtask(index) {
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.length === 1
        ? [{ title: '', dependency: '' }]
        : prev.subtasks.filter((_, i) => i !== index),
    }))
  }

  function filledSubtasks() {
    return form.subtasks.filter(subtask => subtask.title.trim() || subtask.dependency)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const subtasks = filledSubtasks()
      const isAdmin = role === 'admin' || role === 'super_admin'
      const currentProfile = profiles.find(p => p.id === user?.id) ?? profile
      const departmentId = isAdmin
        ? (form.department_id ? Number(form.department_id) : null)
        : (currentProfile?.department_id ? Number(currentProfile.department_id) : null)
      const ownerId = isAdmin ? (form.owner_id || null) : user?.id
      const responsibility = isAdmin ? form.responsibility : (currentProfile?.full_name ?? user?.email ?? '')

      await updateTask(task.id, {
        activity: form.activity,
        project_name: form.project_name || null,
        responsibility: responsibility || null,
        department_id: departmentId,
        owner_id: ownerId || null,
        dependency: form.dependency || null,
        status: form.status,
        priority: form.priority || 'medium',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        subtask: subtasks.map(subtask => subtask.title.trim()).join('\n') || null,
        subtask_dependency: subtasks.map(subtask => subtask.dependency).join('\n') || null,
      })
      showToast('Task updated')
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteTask(task)
      showToast('Task deleted')
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = role === 'admin' || role === 'super_admin'
  const canDelete = canDeleteTask(task)
  const currentProfile = profiles.find(p => p.id === user?.id) ?? profile
  const currentDepartment = departments.find(d => d.id === currentProfile?.department_id)
  const currentUserName = currentProfile?.full_name ?? user?.email ?? ''

  return (
    <Modal isOpen={!!task} onClose={onClose} title={`Task #${task.task_number}`}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Task #">
            <input type="number" disabled value={form.task_number} style={{ ...inputStyle, opacity: 0.6 }} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Priority">
          <select value={form.priority ?? 'medium'} onChange={e => set('priority', e.target.value)} style={inputStyle}>
            {PRIORITY_OPTIONS.map(priority => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </Field>

        <Field label="Activity">
          <input type="text" value={form.activity} onChange={e => set('activity', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Project Name">
          <input type="text" value={form.project_name ?? ''} onChange={e => set('project_name', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Responsibility">
          {isAdmin ? (
            <select value={form.responsibility ?? ''} onChange={e => set('responsibility', e.target.value)} style={inputStyle}>
              <option value="">-- Select user --</option>
              {profiles.map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
            </select>
          ) : (
            <input type="text" disabled value={currentUserName} style={{ ...inputStyle, opacity: 0.65 }} />
          )}
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Department">
            {isAdmin ? (
              <select value={form.department_id ?? ''} onChange={e => set('department_id', e.target.value)} style={inputStyle}>
                <option value="">-- Select --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <input type="text" disabled value={currentDepartment?.name ?? ''} style={{ ...inputStyle, opacity: 0.65 }} />
            )}
          </Field>
          <Field label="Owner">
            {isAdmin ? (
              <select value={form.owner_id ?? ''} onChange={e => set('owner_id', e.target.value)} style={inputStyle}>
                <option value="">-- Select --</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            ) : (
              <input type="text" disabled value={currentUserName} style={{ ...inputStyle, opacity: 0.65 }} />
            )}
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Start Date">
            <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="End Date">
            <input type="date" value={form.end_date ?? ''} onChange={e => set('end_date', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Dependency">
          <select value={form.dependency ?? ''} onChange={e => set('dependency', e.target.value)} style={inputStyle}>
            <option value="">-- Select department --</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Subtasks</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 74px', gap: 8, alignItems: 'center' }}>
            <span style={subtaskHeaderStyle}>Subtask</span>
            <span style={subtaskHeaderStyle}>Dependency</span>
            <span />
            {form.subtasks.map((subtask, index) => (
              <SubtaskRow
                key={index}
                subtask={subtask}
                departments={departments}
                canRemove={form.subtasks.length > 1}
                onChange={(field, value) => setSubtask(index, field, value)}
                onRemove={() => removeSubtask(index)}
              />
            ))}
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={addSubtask}>Add Subtask</Button>
        </div>

        {confirmDelete ? (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 10 }}>
              Delete this task permanently?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="danger" type="button" size="sm" onClick={handleDelete} disabled={saving}>
                Yes, Delete
              </Button>
              <Button variant="secondary" type="button" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
            {canDelete ? (
              <Button variant="danger" type="button" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : <div />}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function parseSubtasks(subtaskValue, dependencyValue) {
  const subtasks = String(subtaskValue ?? '').split('\n')
  const dependencies = String(dependencyValue ?? '').split('\n')
  const length = Math.max(subtasks.length, dependencies.length, 1)

  return Array.from({ length }, (_, index) => ({
    title: subtasks[index] ?? '',
    dependency: dependencies[index] ?? '',
  }))
}

function SubtaskRow({ subtask, departments, canRemove, onChange, onRemove }) {
  return (
    <>
      <input type="text" value={subtask.title} onChange={e => onChange('title', e.target.value)} style={inputStyle} />
      <select value={subtask.dependency} onChange={e => onChange('dependency', e.target.value)} style={inputStyle}>
        <option value="">-- Select department --</option>
        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
      </select>
      <Button variant="ghost" size="sm" type="button" onClick={onRemove} disabled={!canRemove}>Remove</Button>
    </>
  )
}

const inputStyle = {
  padding: '8px 10px',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-button)',
  fontSize: 14,
  color: 'var(--text-primary)',
  background: 'var(--bg-primary)',
  width: '100%',
}

const subtaskHeaderStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
}
