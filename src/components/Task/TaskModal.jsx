import { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { useTasks } from '../../context/TaskContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'continuous', 'hold', 'completed']
const PRIORITY_OPTIONS = ['High', 'medium', 'Low']

export default function TaskModal({ isOpen, onClose, mode = 'add' }) {
  const { tasks, departments, profiles, createTask } = useTasks()
  const { showToast } = useToast()
  const { user, role, profile } = useAuth()
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const nextTaskNumber = Math.max(0, ...tasks.map(task => Number(task.task_number) || 0)) + 1
  const isAdmin = role === 'admin' || role === 'super_admin'
  const currentProfile = profiles.find(p => p.id === user?.id) ?? profile
  const currentDepartment = departments.find(d => d.id === currentProfile?.department_id)
  const currentDepartmentId = currentProfile?.department_id ?? ''
  const currentUserName = currentProfile?.full_name ?? user?.email ?? ''

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  function emptyForm() {
    return {
      activity: '', project_name: '', responsibility: '',
      department_id: '', owner_id: '', dependency: '',
      status: 'not_started', priority: 'medium', start_date: today(), end_date: '',
      subtasks: [{ title: '', dependency: '' }],
    }
  }

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const subtasks = filledSubtasks()
      const ownerId = isAdmin ? (form.owner_id || user?.id || null) : user?.id
      const departmentId = isAdmin
        ? (form.department_id ? Number(form.department_id) : (currentDepartmentId ? Number(currentDepartmentId) : null))
        : (currentDepartmentId ? Number(currentDepartmentId) : null)
      const responsibility = isAdmin ? form.responsibility : currentUserName

      await createTask({
        activity: form.activity,
        status: form.status,
        priority: form.priority,
        department_id: departmentId,
        owner_id: ownerId || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        dependency: form.dependency || null,
        project_name: form.project_name || null,
        responsibility: responsibility || null,
        subtask: subtasks.map(subtask => subtask.title.trim()).join('\n') || null,
        subtask_dependency: subtasks.map(subtask => subtask.dependency).join('\n') || null,
      })
      showToast('Task created successfully')
      setForm(emptyForm())
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'assign' ? 'Assign Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Task #">
            <input type="text" disabled value={`Auto (#${nextTaskNumber})`} style={{ ...inputStyle, opacity: 0.65 }} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle}>
              {PRIORITY_OPTIONS.map(priority => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Activity" required>
          <input type="text" required value={form.activity} onChange={e => set('activity', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Project Name">
          <input type="text" value={form.project_name} onChange={e => set('project_name', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Responsibility">
          {isAdmin ? (
            <select value={form.responsibility} onChange={e => set('responsibility', e.target.value)} style={inputStyle}>
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
              <select value={form.department_id || currentDepartmentId} onChange={e => set('department_id', e.target.value)} style={inputStyle}>
                <option value="">-- Select --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <input type="text" disabled value={currentDepartment?.name ?? ''} style={{ ...inputStyle, opacity: 0.65 }} />
            )}
          </Field>
          <Field label="Owner">
            {isAdmin ? (
              <select value={form.owner_id || user?.id || ''} onChange={e => set('owner_id', e.target.value)} style={inputStyle}>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            ) : (
              <input type="text" disabled value={currentUserName} style={{ ...inputStyle, opacity: 0.65 }} />
            )}
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Start Date">
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="End Date">
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Dependency">
          <select value={form.dependency} onChange={e => set('dependency', e.target.value)} style={inputStyle}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : mode === 'assign' ? 'Assign Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
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
