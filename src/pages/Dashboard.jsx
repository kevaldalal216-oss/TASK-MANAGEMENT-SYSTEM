import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  ListTodo, CheckCircle2, PlayCircle, PauseCircle, AlertCircle,
  ArrowRight, TrendingUp, Clock, CircleDashed,
} from 'lucide-react'
import { useTasks } from '../context/TaskContext'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Layout/Topbar'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const STATUS_COLORS = {
  completed:   '#10b981',
  in_progress: '#3b82f6',
  continuous:  '#06b6d4',
  hold:        '#f59e0b',
  not_started: '#94a3b8',
}

const STATUS_LABELS = {
  completed: 'Completed', in_progress: 'In Progress',
  continuous: 'Continuous', hold: 'Hold', not_started: 'Not Started',
}

const DOUGHNUT_STATUSES = ['completed', 'in_progress', 'continuous', 'hold', 'not_started']

const doughnutPercentLabels = {
  id: 'doughnutPercentLabels',
  afterDatasetsDraw(chart) {
    const dataset = chart.data.datasets[0]
    const values = dataset?.data ?? []
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0)
    if (!total) return

    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.font = '700 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    meta.data.forEach((arc, index) => {
      const value = Number(values[index] || 0)
      if (!value) return
      const percentage = Math.round((value / total) * 100)
      const { x, y } = arc.tooltipPosition()
      ctx.fillText(`${percentage}%`, x, y)
    })

    ctx.restore()
  },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { tasks, departments, profiles, loading } = useTasks()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [selectedTeam, setSelectedTeam] = useState('')
  const [heatmapDepartment, setHeatmapDepartment] = useState('')
  const [heatmapEmployee, setHeatmapEmployee] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const dateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const kpis = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const in_progress = tasks.filter(t => t.status === 'in_progress').length
    const continuous = tasks.filter(t => t.status === 'continuous').length
    const hold = tasks.filter(t => t.status === 'hold').length
    const overdue = tasks.filter(t => t.end_date && t.end_date < today && t.status !== 'completed').length
    const dueToday = tasks.filter(t => t.end_date === today && t.status !== 'completed').length
    const not_started = tasks.filter(t => t.status === 'not_started').length
    return { total, completed, in_progress, continuous, hold, overdue, dueToday, not_started }
  }, [tasks, today])

  const completionPct = kpis.total ? Math.round((kpis.completed / kpis.total) * 100) : 0

  const statusBreakdownTasks = useMemo(() =>
    selectedTeam ? tasks.filter(t => String(t.department_id) === selectedTeam) : tasks,
    [tasks, selectedTeam]
  )

  const doughnutData = useMemo(() => {
    return {
      labels: DOUGHNUT_STATUSES.map(s => STATUS_LABELS[s]),
      datasets: [{
        data: DOUGHNUT_STATUSES.map(s => statusBreakdownTasks.filter(t => t.status === s).length),
        backgroundColor: DOUGHNUT_STATUSES.map(s => STATUS_COLORS[s]),
        borderWidth: 3,
        borderColor: '#fff',
        hoverOffset: 8,
      }],
    }
  }, [statusBreakdownTasks])

  const barData = useMemo(() => {
    const statuses = ['completed', 'in_progress', 'continuous', 'hold', 'not_started']
    const deptNames = departments.map(d => d.name)
    return {
      labels: deptNames,
      datasets: statuses.map(s => ({
        label: STATUS_LABELS[s],
        data: departments.map(d => tasks.filter(t => t.department_id === d.id && t.status === s).length),
        backgroundColor: STATUS_COLORS[s],
        borderRadius: 4,
        borderSkipped: false,
      })),
    }
  }, [tasks, departments])

  const heatmapEmployees = useMemo(() =>
    profiles.filter(p => !heatmapDepartment || String(p.department_id) === heatmapDepartment),
    [profiles, heatmapDepartment]
  )

  const heatmapRows = useMemo(() =>
    departments
      .filter(d => !heatmapDepartment || String(d.id) === heatmapDepartment)
      .map(department => {
        const count = tasks.filter(t =>
          t.status === 'in_progress'
          && t.department_id === department.id
          && (!heatmapEmployee || t.owner_id === heatmapEmployee)
        ).length

        return {
          ...department,
          count,
          tone: count >= 12 ? 'high' : count >= 8 ? 'medium' : 'low',
        }
      }),
    [departments, tasks, heatmapDepartment, heatmapEmployee]
  )

  const overdueRows = useMemo(() =>
    tasks.filter(t => t.end_date && t.end_date < today && t.status !== 'completed')
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .slice(0, 6),
    [tasks, today]
  )

  const holdRows = useMemo(() =>
    tasks.filter(t => t.status === 'hold').slice(0, 6),
    [tasks]
  )

  const statCards = [
    { label: 'Total Tasks',  value: kpis.total,       Icon: ListTodo,     color: '#2563eb', bg: '#eff6ff', status: null,           accent: 'var(--primary)' },
    { label: 'Completed',    value: kpis.completed,   Icon: CheckCircle2, color: '#059669', bg: '#ecfdf5', status: 'completed',    accent: '#10b981' },
    { label: 'In Progress',  value: kpis.in_progress, Icon: PlayCircle,   color: '#1d4ed8', bg: '#eff6ff', status: 'in_progress',  accent: '#3b82f6' },
    { label: 'Continuous',   value: kpis.continuous,  Icon: Clock,        color: '#0e7490', bg: '#ecfeff', status: 'continuous',   accent: '#06b6d4' },
    { label: 'On Hold',      value: kpis.hold,        Icon: PauseCircle,  color: '#b45309', bg: '#fffbeb', status: 'hold',         accent: '#f59e0b' },
    { label: 'Overdue',      value: kpis.overdue,     Icon: AlertCircle,  color: '#b91c1c', bg: '#fef2f2', status: '_overdue',     accent: '#ef4444' },
    { label: 'Not Started',  value: kpis.not_started, Icon: CircleDashed, color: '#475569', bg: '#f1f5f9', status: 'not_started',  accent: '#94a3b8' },
  ]

  function openHeatmapTasks(departmentId) {
    const params = new URLSearchParams({
      tab: 'all',
      status: 'in_progress',
      department_id: String(departmentId),
    })
    if (heatmapEmployee) params.set('owner_id', heatmapEmployee)
    navigate(`/tasks?${params.toString()}`)
  }

  if (loading) return <PageShell title="Dashboard"><Loader /></PageShell>

  return (
    <PageShell title="Dashboard">
      {/* Hero strip */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, var(--surface-container-low) 100%)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24,
      }}>
        <div style={{
          position: 'absolute', top: -120, right: -120, width: 280, height: 280,
          borderRadius: '50%', background: 'rgba(37,99,235,0.08)', filter: 'blur(40px)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {dateString}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-headline)', letterSpacing: '-0.01em' }}>
            {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            You have <strong style={{ color: 'var(--on-surface)' }}>{kpis.dueToday} task{kpis.dueToday !== 1 ? 's' : ''} due today</strong>
            {kpis.overdue > 0 && <> and <strong style={{ color: 'var(--danger)' }}>{kpis.overdue} overdue</strong></>}.
          </p>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          style={{
            position: 'relative', zIndex: 1,
            padding: '10px 20px',
            background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-button)',
            fontSize: 14, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          View Tasks <ArrowRight size={14} />
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(card => (
          <div
            key={card.label}
            onClick={() => card.status && navigate(card.status === '_overdue' ? '/tasks?overdue=1' : `/tasks?status=${card.status}`)}
            style={{
              position: 'relative', overflow: 'hidden',
              background: '#fff',
              border: '1px solid var(--outline-variant)',
              borderTop: `3px solid ${card.accent}`,
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              padding: 20,
              cursor: card.status ? 'pointer' : 'default',
              transition: 'all 0.25s ease-out',
            }}
            onMouseEnter={e => {
              if (card.status) {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: card.bg, color: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.Icon size={16} />
              </div>
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-headline)',
              color: 'var(--on-surface)', letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {card.value}
            </div>
            {card.label === 'Completed' && kpis.total > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 4, background: 'var(--surface-container)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completionPct}%`, background: card.accent, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{completionPct}% complete</div>
              </div>
            )}
            {card.label === 'Overdue' && kpis.overdue > 0 && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Requires immediate action
              </div>
            )}
            {card.label === 'In Progress' && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                Across {departments.length} departments
              </div>
            )}
            {card.label === 'Continuous' && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                Ongoing recurring work
              </div>
            )}
            {card.label === 'On Hold' && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                Awaiting input or blocked
              </div>
            )}
            {card.label === 'Not Started' && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                Ready to begin
              </div>
            )}
            {card.label === 'Total Tasks' && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={11} /> Live count
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Status Breakdown</h3>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              style={teamSelectStyle}
            >
              <option value="">All Teams</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ height: 300, padding: '18px 12px 18px 18px' }}>
            <Doughnut
              data={doughnutData}
              plugins={[doughnutPercentLabels]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                  legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                      font: { size: 12, family: 'Inter' },
                      boxWidth: 11,
                      boxHeight: 11,
                      padding: 10,
                      usePointStyle: false,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: context => {
                        const total = context.dataset.data.reduce((sum, value) => sum + Number(value || 0), 0)
                        const value = Number(context.raw || 0)
                        const percentage = total ? Math.round((value / total) * 100) : 0
                        return `${context.label}: ${value} (${percentage}%)`
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Tasks by Department</h3>
          <div style={{ height: 240 }}>
            <Bar
              data={barData}
              options={{
                responsive: true, maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
                },
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 10 } } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Department Heatmap */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--outline-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>In-Progress Tasks by Department - Click to filter</h3>
            <div style={heatmapLegendStyle}>
              <span style={legendDotStyle('#22c55e')} /> &lt;=7 In Progress
              <span style={legendDotStyle('#f97316')} /> 7-12
              <span style={legendDotStyle('#e11d48')} /> 12+
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={heatmapDepartment}
              onChange={e => {
                setHeatmapDepartment(e.target.value)
                setHeatmapEmployee('')
              }}
              style={teamSelectStyle}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={heatmapEmployee}
              onChange={e => setHeatmapEmployee(e.target.value)}
              style={teamSelectStyle}
            >
              <option value="">All Employees</option>
              {heatmapEmployees.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </div>
        <div style={heatmapGridStyle}>
          {heatmapRows.map(row => (
            <button
              key={row.id}
              type="button"
              title={`${row.name} - ${row.count} In Progress task${row.count !== 1 ? 's' : ''}`}
              onClick={() => openHeatmapTasks(row.id)}
              style={{
                ...heatmapTileStyle,
                ...heatmapToneStyles[row.tone],
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={heatmapDeptNameStyle}>{row.name}</span>
              <strong style={heatmapCountStyle}>{row.count}</strong>
              <span style={heatmapLabelStyle}>In Progress</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <MiniTable
          title="Overdue Tasks"
          rows={overdueRows}
          emptyText="No overdue tasks 🎉"
          accent="var(--danger)"
          accentBg="rgba(239,68,68,0.06)"
          chip={{ bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)', label: 'Overdue' }}
        />
        <MiniTable
          title="On-Hold Tasks"
          rows={holdRows}
          emptyText="No on-hold tasks"
          accent="var(--warning)"
          accentBg="rgba(245,158,11,0.06)"
          chip={{ bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)', label: 'On Hold' }}
        />
      </div>
    </PageShell>
  )
}

function PageShell({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title={title} />
      <main style={{ flex: 1, padding: 'var(--content-padding)', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}

function MiniTable({ title, rows, emptyText, accent, accentBg, chip }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--outline-variant)',
        background: accentBg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>{title}</h3>
        </div>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((t, idx) => (
            <div
              key={t.id}
              className="fade-in-up"
              style={{
                padding: '14px 20px',
                borderTop: idx === 0 ? 'none' : '1px solid var(--outline-variant)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12,
                animationDelay: `${idx * 40}ms`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--on-surface)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  #{t.task_number} · {t.activity}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11 }}>
                  <span style={{
                    padding: '2px 7px',
                    background: 'var(--surface-container)',
                    color: 'var(--text-secondary)',
                    borderRadius: 4, fontWeight: 600,
                  }}>
                    {t.department?.name ?? '—'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {t.end_date ?? '—'}
                  </span>
                </div>
              </div>
              <span style={{
                padding: '3px 10px',
                background: chip.bg,
                color: chip.color,
                border: `1px solid ${chip.border}`,
                borderRadius: 'var(--radius-badge)',
                fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {chip.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
}

const cardStyle = {
  background: '#fff',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  padding: 24,
}
const sectionTitle = {
  fontSize: 14, fontWeight: 700,
  marginBottom: 16,
  color: 'var(--on-surface)',
  fontFamily: 'var(--font-headline)',
}
const teamSelectStyle = {
  minWidth: 176,
  height: 34,
  padding: '0 12px',
  border: '1px solid var(--outline-variant)',
  borderRadius: 8,
  background: '#fff',
  color: 'var(--on-surface)',
  fontSize: 12,
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
}
const heatmapLegendStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  color: 'var(--text-muted)',
  fontSize: 11,
  fontWeight: 500,
}
const legendDotStyle = color => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  display: 'inline-block',
  boxShadow: `0 0 0 2px ${color}22`,
})
const heatmapGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 7,
  padding: 16,
}
const heatmapTileStyle = {
  minHeight: 82,
  border: 'none',
  borderRadius: 6,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
}
const heatmapToneStyles = {
  low: {
    background: '#dcfce7',
    color: '#15803d',
  },
  medium: {
    background: '#fef3c7',
    color: '#b45309',
  },
  high: {
    background: '#fee2e2',
    color: '#be123c',
  },
}
const heatmapDeptNameStyle = {
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 11,
  fontWeight: 800,
}
const heatmapCountStyle = {
  fontSize: 20,
  lineHeight: 1,
  fontFamily: 'var(--font-headline)',
}
const heatmapLabelStyle = {
  fontSize: 11,
  fontWeight: 500,
}
