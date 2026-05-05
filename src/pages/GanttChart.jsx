import { useMemo, useState } from 'react'
import { useTasks } from '../context/TaskContext'
import Topbar from '../components/Layout/Topbar'
import TaskDetail from '../components/Task/TaskDetail'

const STATUS_COLORS = {
  completed:   '#10b981',
  in_progress: '#3b82f6',
  continuous:  '#06b6d4',
  hold:        '#f59e0b',
  not_started: '#6c757d',
}

function daysBetween(a, b) {
  return Math.max(0, (new Date(b) - new Date(a)) / 86400000)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatMonth(date) {
  return new Date(date).toLocaleString('default', { month: 'short', year: '2-digit' })
}

export default function GanttChart() {
  const { tasks, departments, loading } = useTasks()
  const [deptFilter, setDeptFilter] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)

  const filtered = useMemo(() =>
    deptFilter ? tasks.filter(t => String(t.department_id) === deptFilter) : tasks,
    [tasks, deptFilter]
  )

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const withDates = filtered.filter(t => t.start_date && t.end_date)
    if (!withDates.length) return { minDate: null, maxDate: null, totalDays: 0 }
    const min = withDates.reduce((m, t) => t.start_date < m ? t.start_date : m, withDates[0].start_date)
    const max = withDates.reduce((m, t) => t.end_date > m ? t.end_date : m, withDates[0].end_date)
    return { minDate: min, maxDate: max, totalDays: daysBetween(min, max) + 1 }
  }, [filtered])

  const months = useMemo(() => {
    if (!minDate || !maxDate) return []
    const result = []
    let current = minDate.slice(0, 7) + '-01'
    while (current <= maxDate) {
      const nextMonth = new Date(current)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const end = nextMonth.toISOString().slice(0, 10)
      const monthStart = current > minDate ? current : minDate
      const monthEnd = end.slice(0, 10) > maxDate ? maxDate : addDays(end, -1)
      const days = daysBetween(monthStart, monthEnd) + 1
      result.push({ label: formatMonth(current), days, width: (days / totalDays) * 100 })
      current = nextMonth.toISOString().slice(0, 10)
    }
    return result
  }, [minDate, maxDate, totalDays])

  const today = new Date().toISOString().slice(0, 10)
  const todayLeft = minDate && today >= minDate ? (daysBetween(minDate, today) / totalDays) * 100 : null

  const LABEL_WIDTH = 280

  if (loading) return (
    <div style={pageStyle}><Topbar title="Gantt Chart" /><div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div></div>
  )

  return (
    <div style={pageStyle}>
      <Topbar title="Gantt Chart" />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        {/* Filter & legend */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          padding: 14,
          marginBottom: 20,
          display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{ ...inputStyle, width: 200 }}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(STATUS_COLORS).map(([k, color]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, background: color, borderRadius: 3 }} />
                {k.replace('_', ' ')}
              </div>
            ))}
          </div>
        </div>

        {!minDate ? (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks with dates found.</p>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-low)',
              position: 'sticky', top: 0, zIndex: 3,
            }}>
              <div style={{
                width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0,
                padding: '12px 16px', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderRight: '1px solid var(--outline-variant)',
              }}>
                Task
              </div>
              <div style={{ flex: 1, display: 'flex', position: 'relative', overflowX: 'auto' }}>
                {months.map((m, i) => (
                  <div key={i} style={{
                    width: `${m.width}%`,
                    padding: '12px 6px',
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderLeft: i > 0 ? '1px solid var(--outline-variant)' : 'none',
                    textAlign: 'center',
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div style={{ overflowX: 'auto' }}>
              {filtered.map((task, i) => {
                const hasBar = task.start_date && task.end_date
                const left = hasBar ? (daysBetween(minDate, task.start_date) / totalDays) * 100 : 0
                const width = hasBar ? (daysBetween(task.start_date, task.end_date) / totalDays) * 100 : 0

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="fade-in-up"
                    style={{
                      display: 'flex',
                      borderTop: i === 0 ? 'none' : '1px solid var(--outline-variant)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      animationDelay: `${Math.min(i * 20, 600)}ms`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0,
                      padding: '10px 16px', fontSize: 13,
                      display: 'flex', gap: 8, alignItems: 'center',
                      borderRight: '1px solid var(--outline-variant)',
                    }}>
                      <span style={{
                        color: 'var(--text-muted)', fontSize: 11,
                        minWidth: 30, fontFamily: 'var(--font-headline)', fontWeight: 600,
                      }}>#{task.task_number}</span>
                      <span style={{
                        color: 'var(--on-surface)', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {task.activity}
                      </span>
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: 40 }}>
                      {todayLeft !== null && (
                        <div style={{
                          position: 'absolute',
                          left: `${todayLeft}%`,
                          top: 0, bottom: 0,
                          width: 2,
                          background: 'var(--danger)',
                          zIndex: 2,
                          opacity: 0.6,
                          boxShadow: '0 0 6px rgba(239,68,68,0.5)',
                        }} />
                      )}
                      {hasBar && width > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `${Math.max(width, 0.5)}%`,
                          top: 8, height: 24,
                          background: `linear-gradient(180deg, ${STATUS_COLORS[task.status] ?? '#6c757d'}, ${STATUS_COLORS[task.status] ?? '#6c757d'}dd)`,
                          borderRadius: 6,
                          zIndex: 1,
                          boxShadow: '0 2px 4px rgba(15,23,42,0.1)',
                        }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  )
}

const pageStyle = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
const inputStyle = {
  padding: '8px 10px', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-button)', fontSize: 13,
  color: 'var(--text-primary)', background: 'var(--bg-primary)',
}
