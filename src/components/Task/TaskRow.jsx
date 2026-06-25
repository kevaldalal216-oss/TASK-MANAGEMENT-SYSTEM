import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'

export function parseSubtaskCompletion(value, count) {
  if (Array.isArray(value)) {
    return Array.from({ length: count }, (_, index) => Boolean(value[index]))
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized.startsWith('{') && normalized.endsWith('}')) {
      const items = normalized.slice(1, -1).split(',')
      return Array.from({ length: count }, (_, index) => ['true', 't', '1'].includes(String(items[index] ?? '').trim().toLowerCase()))
    }
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parseSubtaskCompletion(parsed, count)
    } catch {
      return Array.from({ length: count }, () => false)
    }
  }
  return Array.from({ length: count }, () => false)
}

export function taskProgress(task) {
  const subtasks = splitLines(task.subtask)
  if (!subtasks.length) return task.status === 'completed' ? 100 : 0
  const completed = parseSubtaskCompletion(task.subtask_completed, subtasks.length).filter(Boolean).length
  return Math.round((completed / subtasks.length) * 100)
}

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

export default function TaskRow({ task, profiles = [], onClick, index, taskNumber, onToggleSubtask }) {
  const project = projectName(task)
  const subtasks = splitLines(task.subtask)
  const subtaskDependencies = splitLines(task.subtask_dependency)
  const completedSubtasks = parseSubtaskCompletion(task.subtask_completed, subtasks.length)
  const progress = taskProgress(task)
  const assignedBy = profiles.find(profile => profile.id === task.created_by)
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        onClick={() => onClick(task)}
        className="fade-in-up"
        style={{
          cursor: 'pointer',
          borderBottom: (subtasks.length && expanded) ? 'none' : '1px solid var(--outline-variant)',
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
          {subtasks.length > 0 ? (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(prev => !prev) }}
              style={subtaskToggleStyle}
            >
              {expanded
                ? <ChevronDown size={13} style={{ flexShrink: 0 }} />
                : <ChevronRight size={13} style={{ flexShrink: 0 }} />
              }
              <span>{subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}</span>
              <span style={subtaskCountBadgeStyle}>
                {completedSubtasks.filter(Boolean).length}/{subtasks.length}
              </span>
            </button>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>-</span>
          )}
        </td>
        <td style={tdStyle}><PriorityBadge priority={task.priority} /></td>
        <td style={dateTdStyle}>
          {task.start_date ?? '-'}
        </td>
        <td style={dateTdStyle}>
          {task.end_date ?? '-'}
        </td>
        <td style={tdStyle}><StatusBadge status={task.status} /></td>
        <td style={progressTdStyle}>
          <ProgressBar value={progress} />
        </td>
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

      {expanded && subtasks.map((subtask, subtaskIndex) => (
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
            <label style={subtaskCheckLabelStyle} onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={completedSubtasks[subtaskIndex]}
                onChange={e => onToggleSubtask?.(task, subtaskIndex, e.target.checked)}
                style={checkboxStyle}
              />
              <span style={completedSubtasks[subtaskIndex] ? completedSubtaskTextStyle : undefined}>
                {subtask}
              </span>
            </label>
          </td>
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskProgressTdStyle}>
            {subtaskIndex === 0 ? <ProgressBar value={progress} compact /> : null}
          </td>
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle} />
          <td style={subtaskBlankTdStyle}>
            {subtaskDependencies[subtaskIndex]
              ? <span style={subtaskDependencyBadgeStyle}>{subtaskDependencies[subtaskIndex]}</span>
              : null}
          </td>
        </tr>
      ))}
    </>
  )
}

export function splitLines(value) {
  return String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean)
}

function ProgressBar({ value, compact = false }) {
  return (
    <div style={compact ? compactProgressWrapStyle : progressWrapStyle}>
      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${value}%` }} />
      </div>
      <span style={progressTextStyle}>{value}%</span>
    </div>
  )
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

const progressTdStyle = {
  ...tdStyle,
  minWidth: 150,
  width: 150,
}

const subtaskProgressTdStyle = {
  ...subtaskBlankTdStyle,
  minWidth: 150,
  width: 150,
}

const progressWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 122,
}

const compactProgressWrapStyle = {
  ...progressWrapStyle,
  opacity: 0.82,
}

const progressTrackStyle = {
  width: 78,
  height: 8,
  borderRadius: 999,
  background: 'var(--surface-container-high)',
  overflow: 'hidden',
  flexShrink: 0,
}

const progressFillStyle = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #14b8a6, #22c55e)',
  transition: 'width 0.2s ease',
}

const progressTextStyle = {
  width: 36,
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  fontVariantNumeric: 'tabular-nums',
}

const subtaskCheckLabelStyle = {
  display: 'inline-flex',
  alignItems: 'flex-start',
  gap: 8,
  cursor: 'pointer',
  maxWidth: '100%',
}

const checkboxStyle = {
  width: 16,
  height: 16,
  marginTop: 2,
  accentColor: '#0f766e',
  flexShrink: 0,
}

const completedSubtaskTextStyle = {
  color: 'var(--text-muted)',
  textDecoration: 'line-through',
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

const subtaskDependencyBadgeStyle = {
  display: 'inline-block',
  padding: '2px 7px',
  background: '#eff6ff',
  color: '#1d4ed8',
  border: '1px solid #bfdbfe',
  borderRadius: 'var(--radius-badge)',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const subtaskToggleStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--primary)',
  background: 'var(--surface-container-low)',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-badge)',
  cursor: 'pointer',
  transition: 'background 0.15s',
}

const subtaskCountBadgeStyle = {
  marginLeft: 2,
  padding: '1px 5px',
  background: 'var(--surface-container-high)',
  color: 'var(--text-muted)',
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
}
