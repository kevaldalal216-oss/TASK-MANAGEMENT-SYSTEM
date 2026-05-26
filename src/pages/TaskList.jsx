import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import { useTasks } from '../context/TaskContext'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Layout/Topbar'
import TaskRow from '../components/Task/TaskRow'
import TaskDetail from '../components/Task/TaskDetail'
import TaskModal from '../components/Task/TaskModal'
import Button from '../components/common/Button'

const STATUSES = ['completed', 'in_progress', 'continuous', 'hold', 'not_started']
const PRIORITIES = ['High', 'medium', 'Low']

function projectName(task) {
  if (task.project?.name) return task.project.name
  if (task.project_name) return task.project_name
  if (typeof task.project === 'string') return task.project
  return ''
}

function assignedByName(task, profiles) {
  return profiles.find(profile => profile.id === task.created_by)?.full_name ?? ''
}

function ownerName(task) {
  return task.owner?.full_name ?? ''
}

function departmentName(task) {
  return task.department?.name ?? ''
}

const COLUMNS = [
  { key: 'task_no', label: 'Task No.', sortable: false },
  { key: 'project', label: 'Project', sortValue: projectName },
  { key: 'owner_id', label: 'Owner', sortValue: ownerName },
  { key: 'activity', label: 'Activity' },
  { key: 'subtask', label: 'Sub Task', width: 320 },
  { key: 'priority', label: 'Priority' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'status', label: 'Status' },
  { key: 'responsibility', label: 'Responsibility' },
  { key: 'created_by', label: 'Assign By' },
  { key: 'department_id', label: 'Department', sortValue: departmentName },
]

function defaultTab(role) {
  if (role === 'super_admin' || role === 'admin') return 'all'
  return 'mine'
}

function queryTab(role, requestedTab) {
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (requestedTab === 'all' && isAdmin) return 'all'
  if (requestedTab === 'dept' || requestedTab === 'mine') return requestedTab
  return null
}

export default function TaskList() {
  const { tasks, departments, profiles, loading } = useTasks()
  const { user, role, profile } = useAuth()
  const [searchParams] = useSearchParams()

  const [tabOverride, setTabOverride] = useState(() => queryTab(role, searchParams.get('tab')))
  const tab = tabOverride ?? defaultTab(role)
  const setTab = setTabOverride

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState(searchParams.get('department_id') ?? '')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '')
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') ?? '')
  const [filterOwner, setFilterOwner] = useState(searchParams.get('owner_id') ?? '')
  const [sort, setSort] = useState({ col: 'project', dir: 'asc' })
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createMode, setCreateMode] = useState('add')

  const filtered = useMemo(() => {
    let base = tasks

    if (tab === 'mine') base = base.filter(t => t.owner_id === user?.id)
    else if (tab === 'dept') base = base.filter(t => t.department_id === profile?.department_id)

    if (search) base = base.filter(t => t.activity?.toLowerCase().includes(search.toLowerCase()))
    if (filterDept) base = base.filter(t => String(t.department_id) === filterDept)
    if (filterStatus) base = base.filter(t => t.status === filterStatus)
    if (filterPriority) base = base.filter(t => t.priority === filterPriority)
    if (filterOwner) base = base.filter(t => t.owner_id === filterOwner)

    const today = new Date().toISOString().slice(0, 10)
    if (searchParams.get('overdue') === '1')
      base = base.filter(t => t.end_date && t.end_date < today && t.status !== 'completed')

    return [...base].sort((a, b) => {
      const column = COLUMNS.find(col => col.key === sort.col)
      const va = sort.col === 'created_by' ? assignedByName(a, profiles) : column?.sortValue ? column.sortValue(a) : a[sort.col] ?? ''
      const vb = sort.col === 'created_by' ? assignedByName(b, profiles) : column?.sortValue ? column.sortValue(b) : b[sort.col] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [tasks, tab, search, filterDept, filterStatus, filterPriority, filterOwner, sort, user, profile, profiles, searchParams])

  function toggleSort(col) {
    if (COLUMNS.find(column => column.key === col)?.sortable === false) return
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  function clearFilters() {
    setSearch(''); setFilterDept(''); setFilterStatus(''); setFilterPriority(''); setFilterOwner('')
  }

  const isAdmin = role === 'admin' || role === 'super_admin'
  function openCreate(mode) {
    setCreateMode(mode)
    setShowCreate(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar
        title="Task List"
        onAddTask={() => openCreate('add')}
        onAssignTask={isAdmin ? () => openCreate('assign') : undefined}
      />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'var(--surface-container-low)',
          padding: 4,
          borderRadius: 'var(--radius-button)',
          border: '1px solid var(--outline-variant)',
          width: 'fit-content',
        }}>
          {[
            { key: 'mine', label: 'My Tasks', show: true },
            { key: 'dept', label: 'Dept Tasks', show: true },
            { key: 'all', label: 'All Tasks', show: isAdmin },
          ].filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 18px', fontSize: 13,
                fontWeight: 600,
                color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                background: tab === t.key ? '#fff' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
          background: '#fff',
          padding: 14,
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" placeholder="Search activity…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34, width: '100%' }}
            />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 140 }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...inputStyle, width: 140 }}>
            <option value="">All Priority</option>
            {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">All Owners</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={13} /> Clear
          </Button>
          <span style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 600,
            color: 'var(--text-muted)',
            padding: '4px 10px',
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-badge)',
          }}>
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
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
            <table style={{ width: '100%', minWidth: 1340, borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{
                        padding: '12px 14px', fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: 'var(--text-muted)',
                        background: 'var(--surface-container-low)',
                        textAlign: col.key === 'task_no' ? 'center' : 'left',
                        cursor: col.sortable === false ? 'default' : 'pointer',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--outline-variant)',
                        userSelect: 'none',
                        transition: 'color 0.15s',
                        ...(col.key === 'task_no' ? { width: 72, minWidth: 72, maxWidth: 72 } : {}),
                        ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: col.key === 'task_no' ? 'center' : 'flex-start', gap: 4, width: col.key === 'task_no' ? '100%' : 'auto' }}>
                        {col.label}
                        {col.sortable !== false && sort.col === col.key
                          ? sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Search size={32} opacity={0.3} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>No tasks found</span>
                        <span style={{ fontSize: 12 }}>Try adjusting filters or clearing them</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((task, i) => (
                    <TaskRow key={task.id} task={task} profiles={profiles} index={i} taskNumber={i + 1} onClick={setSelectedTask} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      <TaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} mode={createMode} />
    </div>
  )
}

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-button)',
  fontSize: 13,
  color: 'var(--text-primary)',
  background: '#fff',
  transition: 'all 0.15s',
}
