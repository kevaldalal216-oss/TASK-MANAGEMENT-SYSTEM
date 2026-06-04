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

export default function TaskRow({ task, profiles = [], onClick, index, taskNumber }) {
  const project = projectName(task)
  const subtasks = splitLines(task.subtask)
  const assignedBy = profiles.find(profile => profile.id === task.created_by)

  return (
    <>
      <tr
        onClick={() => onClick(task)}
        className="fade-in-up"
        style={{
          cursor: 'pointer',
          borderBottom: subtasks.length ? 'none' : '1px solid var(--outline-variant)',
          background: '#fff',
          animationDelay: `${Math.min(index * 30, 600)}ms`,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
      >
        <td style={taskNoTdStyle}>
          {taskNumber}
        </td>
        <td style={tdStyle}>
          {project || <span style={{ color: 'var(--text-muted)' }}>-</span>}
        </td>
        <td style={tdStyle}>
          {task.owner?.full_name
            ? (
              <span style={personStyle}>
                <span style={ownerAvatarStyle}>{initialsOf(task.owner.full_name)}</span>
                <span style={{ fontSize: 13 }}>{task.owner.full_name}</span>
              </span>
            )
            : <span style={{ color: 'var(--text-muted)' }}>-</span>
          }
        </td>
        <td style={activityTdStyle}>
          {task.activity}
        </td>
        <td style={subtaskParentTdStyle}>
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        </td>
        <td style={tdStyle}><PriorityBadge priority={task.priority} /></td>
        <td style={dateTdStyle}>
          {task.start_date ?? '-'}
        </td>
        <td style={dateTdStyle}>
          {task.end_date ?? '-'}
        </td>
        <td style={tdStyle}><StatusBadge status={task.status} /></td>
        <td style={tdStyle}>{task.responsibility ?? <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
        <td style={tdStyle}>
          {assignedBy?.full_name
            ? (
              <span style={personStyle}>
                <span style={assignedByAvatarStyle}>{initialsOf(assignedBy.full_name)}</span>
                <span style={{ fontSize: 13 }}>{assignedBy.full_name}</span>
              </span>
            )
            : <span style={{ color: 'var(--text-muted)' }}>-</span>
          }
        </td>
        <td style={tdStyle}>
          {task.department?.name
            ? <span style={departmentBadgeStyle}>{task.department.name}</span>
            : <span style={{ color: 'var(--text-muted)' }}>-</span>
          }
        </td>
      </tr>

      {subtasks.map((subtask, subtaskIndex) => (
        <tr
          key={`${task.id}-subtask-${subtaskIndex}`}
          onClick={() => onClick(task)}
          className="fade-in-up"
          style={{
            cursor: 'pointer',
            borderBottom: subtaskIndex === subtasks.length - 1 ? '1px solid var(--outline-variant)' : 'none',
            background: 'var(--surface-container-lowest)',
            animationDelay: `${Math.min(index * 30, 600)}ms`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-lowest)'}
        >
          <td style={{ ...taskNoTdStyle, color: 'var(--text-secondary)' }}>
            {taskNumber}.{subtaskIndex + 1}
          </td>
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskTdStyle}>
            {subtask}
          </td>
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
        </tr>
      ))}
    </>
  )
}

function splitLines(value) {
  return String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean)
}

function PriorityBadge({ priority }) {
  const styles = {
    High: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    medium: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    Low: { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  }
  const currentPriority = priority || 'medium'
  const style = styles[currentPriority] ?? styles.medium

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 'var(--radius-badge)',
      border: `1px solid ${style.border}`,
      background: style.bg,
      color: style.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {currentPriority}
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

const taskNoTdStyle = {
  ...tdStyle,
  width: 72,
  minWidth: 72,
  maxWidth: 72,
  textAlign: 'center',
  fontFamily: 'var(--font-headline)',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-muted)',
}

const dateTdStyle = {
  ...tdStyle,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  color: 'var(--text-secondary)',
}

const activityTdStyle = {
  ...tdStyle,
  minWidth: 260,
  maxWidth: 420,
  fontWeight: 500,
  lineHeight: 1.45,
  color: 'var(--on-surface)',
  whiteSpace: 'normal',
  overflow: 'visible',
  textOverflow: 'clip',
  overflowWrap: 'anywhere',
  wordBreak: 'normal',
}

const subtaskTdStyle = {
  ...tdStyle,
  minWidth: 320,
  maxWidth: 460,
  paddingTop: 9,
  paddingBottom: 9,
  color: 'var(--text-secondary)',
  whiteSpace: 'normal',
  overflow: 'visible',
  textOverflow: 'clip',
  overflowWrap: 'anywhere',
  wordBreak: 'normal',
}

const subtaskParentTdStyle = {
  ...tdStyle,
  minWidth: 320,
  maxWidth: 460,
}

const subtaskBlankTdStyle = {
  ...tdStyle,
  paddingTop: 9,
  paddingBottom: 9,
  color: 'var(--text-muted)',
}

const personStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const ownerAvatarStyle = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-headline)',
}

const assignedByAvatarStyle = {
  ...ownerAvatarStyle,
  background: 'var(--surface-container-high)',
  color: 'var(--text-secondary)',
}

const departmentBadgeStyle = {
  padding: '3px 8px',
  background: 'var(--surface-container)',
  color: 'var(--text-secondary)',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
}
