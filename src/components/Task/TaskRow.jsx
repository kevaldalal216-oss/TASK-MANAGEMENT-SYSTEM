import StatusBadge from '../common/StatusBadge'

function initialsOf(name) {
  if (!name) return ''
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function projectName(task) {
  if (task.project?.name) return task.project.name
  if (task.project_name) return task.project_name
  if (typeof task.project === 'string') return task.project
  return ''
}

export default function TaskRow({ task, profiles = [], onClick, index }) {
  const project = projectName(task)
  const subtasks = splitLines(task.subtask)
  const subtaskDependencies = splitLines(task.subtask_dependency)
  const assignedBy = profiles.find(profile => profile.id === task.created_by)

  return (
    <tr
      onClick={() => onClick(task)}
      className="fade-in-up"
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid var(--outline-variant)',
        background: '#fff',
        animationDelay: `${Math.min(index * 30, 600)}ms`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
    >
      <td style={{ ...tdStyle, fontFamily: 'var(--font-headline)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>
        #{task.task_number}
      </td>
      <td style={{ ...tdStyle, maxWidth: 280, fontWeight: 500, color: 'var(--on-surface)' }}>
        {task.activity}
      </td>
      <td style={tdStyle}>
        {project || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={tdStyle}>
        {task.department?.name
          ? <span style={{
              padding: '3px 8px',
              background: 'var(--surface-container)',
              color: 'var(--text-secondary)',
              borderRadius: 4,
              fontSize: 11, fontWeight: 600,
            }}>{task.department.name}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
      </td>
      <td style={tdStyle}>
        {task.owner?.full_name
          ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-headline)',
              }}>{initialsOf(task.owner.full_name)}</span>
              <span style={{ fontSize: 13 }}>{task.owner.full_name}</span>
            </span>
          )
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
      </td>
      <td style={tdStyle}>
        {assignedBy?.full_name
          ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--surface-container-high)',
                color: 'var(--text-secondary)', fontSize: 9, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-headline)',
              }}>{initialsOf(assignedBy.full_name)}</span>
              <span style={{ fontSize: 13 }}>{assignedBy.full_name}</span>
            </span>
          )
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
      </td>
      <td style={tdStyle}>{task.responsibility ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
      <td style={tdStyle}><StatusBadge status={task.status} /></td>
      <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
        {task.start_date ?? '—'}
      </td>
      <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
        {task.end_date ?? '—'}
      </td>
      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>
        {task.dependency ?? '—'}
      </td>
      <td style={tdStyle}>
        {subtasks.length ? <StackedValues values={subtasks} /> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
      </td>
      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>
        {subtaskDependencies.length ? <StackedValues values={subtaskDependencies} /> : '-'}
      </td>
    </tr>
  )
}

function splitLines(value) {
  return String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean)
}

function StackedValues({ values }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
      {values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
    </span>
  )
}

const tdStyle = {
  padding: '12px 14px',
  fontSize: 13,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
