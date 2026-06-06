import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase, supabasePublishableKey, supabaseUrl } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Topbar from '../components/Layout/Topbar'
import Modal from '../components/common/Modal'
import Button from '../components/common/Button'
import { Plus, Edit2, UserX, Trash2 } from 'lucide-react'
import { useTasks } from '../context/TaskContext'

// Separate Supabase client used ONLY for signUp() during admin user creation.
// Has persistSession: false so it never writes to localStorage — that way the
// signed-in admin's session on the main client stays intact when we create a
// new auth user.
const signupClient = createClient(
  supabaseUrl,
  supabasePublishableKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const ROLE_BADGE = {
  super_admin: { label: 'Super Admin', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  admin:       { label: 'Admin',       color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  user:        { label: 'User',        color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
}

const adminRoles = ['super_admin', 'admin']
const userCreateRateLimitCooldownMs = 10 * 60 * 1000
const userCreateCooldownStoragePrefix = 'user-create-cooldown-until:'

function initialsOf(name) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function UserManagement() {
  const { role: myRole, user: me } = useAuth()
  const { departments, createDepartment } = useTasks()
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode: 'create'|'edit', user?: {} }
  const [deptModal, setDeptModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, department:departments(name)')
      .order('full_name')
    if (error) showToast(error.message, 'error')
    else setUsers(data)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleDeactivate(u) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', u.id)
    if (error) showToast(error.message, 'error')
    else { showToast(`User ${newStatus}`); loadUsers() }
  }

  async function handleDelete(u) {
    const { error } = await supabase.from('profiles').delete().eq('id', u.id)
    if (error) showToast(error.message, 'error')
    else { showToast('User deleted'); setConfirmDelete(null); loadUsers() }
  }

  const canEdit = (u) => {
    if (myRole === 'super_admin') return true
    if (myRole === 'admin' && u.role !== 'super_admin') return true
    return false
  }

  const totalActive = users.filter(u => u.status === 'active').length
  const totalSuper = users.filter(u => u.role === 'super_admin').length
  const totalAdmins = users.filter(u => u.role === 'admin').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="User Management" />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Active Users',  value: totalActive,  color: '#10b981' },
            { label: 'Super Admins',  value: totalSuper,   color: '#7c3aed' },
            { label: 'Admins',        value: totalAdmins,  color: '#2563eb' },
            { label: 'Total Users',   value: users.length, color: '#475569' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              padding: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-headline)', color: s.color, marginTop: 6 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>Team Members</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {adminRoles.includes(myRole) && (
              <Button variant="secondary" size="sm" onClick={() => setDeptModal(true)}>
                <Plus size={14} /> Add Department
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setModal({ mode: 'create' })}>
              <Plus size={14} /> Add User
            </Button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <div style={{
            overflowX: 'auto',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--outline-variant)',
            boxShadow: 'var(--shadow-card)',
            background: '#fff',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['User', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rb = ROLE_BADGE[u.role] ?? ROLE_BADGE.user
                  const inactive = u.status !== 'active'
                  return (
                    <tr key={u.id}
                      className="fade-in-up"
                      style={{
                        opacity: inactive ? 0.6 : 1,
                        borderTop: i === 0 ? 'none' : '1px solid var(--outline-variant)',
                        transition: 'background 0.15s',
                        animationDelay: `${Math.min(i * 30, 600)}ms`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: '#fff', fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-headline)',
                          }}>{initialsOf(u.full_name)}</div>
                          <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{u.full_name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px',
                          borderRadius: 'var(--radius-badge)',
                          fontSize: 11, fontWeight: 700,
                          color: rb.color, background: rb.bg,
                          border: `1px solid ${rb.border}`,
                        }}>
                          {rb.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {u.department?.name
                          ? <span style={{ padding: '3px 8px', background: 'var(--surface-container)', color: 'var(--text-secondary)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{u.department.name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-badge)',
                          fontSize: 11, fontWeight: 700,
                          color: inactive ? 'var(--text-muted)' : '#047857',
                          background: inactive ? '#f1f5f9' : '#ecfdf5',
                          border: `1px solid ${inactive ? '#cbd5e1' : '#a7f3d0'}`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: inactive ? '#94a3b8' : '#10b981' }} />
                          {u.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {canEdit(u) && (
                            <button
                              onClick={() => setModal({ mode: 'edit', user: u })}
                              style={{
                                color: 'var(--primary)', display: 'flex',
                                padding: 8, borderRadius: 'var(--radius-button)',
                                transition: 'all 0.15s',
                              }}
                              title="Edit"
                              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {myRole === 'super_admin' && (
                            <>
                              <button
                                onClick={() => handleDeactivate(u)}
                                style={{
                                  color: 'var(--warning)', display: 'flex',
                                  padding: 8, borderRadius: 'var(--radius-button)',
                                  transition: 'all 0.15s',
                                }}
                                title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                                onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <UserX size={15} />
                              </button>
                              {u.id !== me?.id && (
                                <button
                                  onClick={() => setConfirmDelete(u)}
                                  style={{
                                    color: 'var(--danger)', display: 'flex',
                                    padding: 8, borderRadius: 'var(--radius-button)',
                                    transition: 'all 0.15s',
                                  }}
                                  title="Delete"
                                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          departments={departments}
          myRole={myRole}
          onClose={() => { setModal(null); loadUsers() }}
        />
      )}

      {confirmDelete && (
        <Modal isOpen title={`Delete ${confirmDelete.full_name}?`} onClose={() => setConfirmDelete(null)} maxWidth={400}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>This will permanently remove their profile. Their auth account must be deleted separately in Supabase dashboard.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>Delete Profile</Button>
          </div>
        </Modal>
      )}

      {deptModal && (
        <DepartmentModal
          isOpen={deptModal}
          onClose={() => setDeptModal(false)}
        />
      )}
    </div>
  )
}

function UserModal({ mode, user, departments, myRole, onClose }) {
  const isSuper = myRole === 'super_admin'
  // Admin attempting to edit a super_admin row should not happen (canEdit
  // already gates the edit button), but harden the modal anyway.
  const editingSuper = mode === 'edit' && user?.role === 'super_admin'
  const { showToast } = useToast()
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    role: user?.role ?? 'user',
    department_id: user?.department_id ?? '',
    status: user?.status ?? 'active',
    email: '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [createCooldownUntil, setCreateCooldownUntilState] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (mode !== 'create') return
    const email = form.email.trim()
    setCreateCooldownUntilState(email ? getUserCreateCooldownUntil(email) : 0)
  }, [form.email, mode])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const createWaitMs = createCooldownUntil - Date.now()
    if (mode === 'create' && createWaitMs > 0) {
      setFormError(`Supabase email limit is active. Please wait ${formatWaitTime(createWaitMs)} before creating another auth user.`)
      return
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        // Use a separate client so the admin's session is preserved.
        const { data: authData, error: authErr } = await signupClient.auth.signUp({
          email: form.email,
          password: form.password,
        })
        if (authErr) throw authErr
        const uid = authData.user?.id
        if (!uid) throw new Error('User created but no ID returned — check Supabase Auth settings.')
        // Profile INSERT runs on the MAIN client, so it executes as the
        // signed-in admin (RLS allows admins to insert profiles).
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: uid,
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          department_id: form.department_id ? Number(form.department_id) : null,
          status: form.status,
        })
        if (profileErr) throw profileErr
        showToast('User created successfully')
      } else {
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name,
          role: form.role,
          department_id: form.department_id ? Number(form.department_id) : null,
          status: form.status,
        }).eq('id', user.id)
        if (error) throw error
        showToast('User updated')
      }
      onClose()
    } catch (err) {
      const message = getUserCreateErrorMessage(err)
      if (mode === 'create' && isRateLimitError(err)) {
        const nextCooldownUntil = Date.now() + userCreateRateLimitCooldownMs
        setUserCreateCooldownUntil(form.email, nextCooldownUntil)
        setCreateCooldownUntilState(nextCooldownUntil)
      }
      setFormError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const createWaitMs = mode === 'create' ? createCooldownUntil - now : 0
  const isCreateCoolingDown = createWaitMs > 0

  return (
    <Modal isOpen title={mode === 'create' ? 'Add User' : 'Edit User'} onClose={onClose} maxWidth={440}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name" required>
          <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)} style={inputStyle} />
        </Field>

        {mode === 'create' && (
          <>
            <Field label="Email" required>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Password" required>
              <input type="password" required minLength={8} value={form.password} onChange={e => set('password', e.target.value)} style={inputStyle} placeholder="Min 8 characters" />
            </Field>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Role">
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              disabled={editingSuper && !isSuper}
              style={inputStyle}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              {/* Only super_admin can grant the super_admin role */}
              {isSuper && <option value="super_admin">Super Admin</option>}
            </select>
          </Field>
          <Field label="Department">
            <select value={form.department_id} onChange={e => set('department_id', e.target.value)} style={inputStyle}>
              <option value="">— None —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>

        {(formError || isCreateCoolingDown) && (
          <div style={{
            fontSize: 13,
            color: 'var(--danger)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-button)',
          }}>
            {isCreateCoolingDown
              ? `Supabase email limit is active. Try again in ${formatWaitTime(createWaitMs)}.`
              : formError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving || isCreateCoolingDown}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DepartmentModal({ isOpen, onClose }) {
  const { departments, createDepartment } = useTasks()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      showToast('Department name cannot be empty', 'error')
      return
    }
    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      showToast('Department name already exists', 'error')
      return
    }
    setSaving(true)
    try {
      await createDepartment({ name })
      showToast('Department created successfully')
      setForm({ name: '' })
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} title="Add Department" onClose={onClose} maxWidth={400}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Department Name" required>
          <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Department'}
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

function isRateLimitError(err) {
  return err?.message?.toLowerCase().includes('rate limit') || err?.status === 429
}

function getUserCreateErrorMessage(err) {
  if (isRateLimitError(err)) {
    return 'Supabase email rate limit exceeded. Wait a few minutes, or disable signup confirmation emails / configure custom SMTP in Supabase Auth.'
  }
  return err?.message ?? 'Unable to create user.'
}

function getUserCreateCooldownUntil(email) {
  try {
    return Number(window.localStorage.getItem(`${userCreateCooldownStoragePrefix}${email.toLowerCase()}`)) || 0
  } catch (_) {
    return 0
  }
}

function setUserCreateCooldownUntil(email, timestamp) {
  try {
    window.localStorage.setItem(`${userCreateCooldownStoragePrefix}${email.toLowerCase()}`, String(timestamp))
  } catch (_) {
    // Supabase still enforces the real email limit if storage is unavailable.
  }
}

function formatWaitTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

const thStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--text-muted)', background: 'var(--surface-container-low)',
  padding: '12px 14px', textAlign: 'left',
  borderBottom: '1px solid var(--outline-variant)',
}
const tdStyle = { padding: '12px 14px', fontSize: 13 }
const inputStyle = {
  padding: '10px 12px', border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-button)', fontSize: 14,
  color: 'var(--text-primary)', background: '#fff', width: '100%',
  transition: 'all 0.15s',
}
