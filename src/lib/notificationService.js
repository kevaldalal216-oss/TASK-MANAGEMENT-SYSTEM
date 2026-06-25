/**
 * notificationService.js
 *
 * Role-Based & Dependency-Aware Notification System
 *
 * Recipient resolution rules per event type:
 *   ALL events    → ALL Admins (admin + super_admin, every department) — ALWAYS
 *   creation      → + All Dept Members
 *   assignment    → + Assigned User
 *   update        → + All Dept Members + Dependent-team Members (→ 'dependency' notif)
 *   subtask_update→ same as update
 *   completion    → same as update
 *   deletion      → + All Dept Members
 */

import { supabase } from './supabase'

// ── Utilities ─────────────────────────────────────────────────────────────────

function taskName(task) {
  return task?.activity || task?.project_name || `Task #${task?.task_number ?? task?.id ?? ''}`
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function profileName(profile, fallback = 'Someone') {
  return profile?.full_name || profile?.email || fallback
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]
  ))
}

function taskLink(task) {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_APP_URL || '')
  return `${origin}/tasks?task_id=${encodeURIComponent(task.id)}`
}

function plainTaskLink(task) {
  return `/tasks?task_id=${encodeURIComponent(task.id)}`
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, text, html }) {
  if (!to) return
  try {
    await supabase.functions.invoke('send-task-email', {
      body: { to, subject, text, html },
    })
  } catch (err) {
    console.warn('[notif] email send failed:', err?.message)
  }
}

function buildEmailHtml(heading, rows) {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#6b7280;
                 text-transform:uppercase;white-space:nowrap;vertical-align:top">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 12px;font-size:14px;color:#111827">${value}</td>
    </tr>
  `).join('')

  return `
    <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;
                background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px 28px;color:#fff">
        <h2 style="margin:0;font-size:18px;font-weight:700">${escapeHtml(heading)}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:8px 0">
        ${rowsHtml}
      </table>
    </div>
  `
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function insertNotificationsBatch(rows) {
  if (!rows.length) return

  // Primary path: security-definer RPC (works for any authenticated user)
  const { error } = await supabase.rpc('insert_notifications_batch', { rows })
  if (!error) return

  console.warn('[notif] RPC failed, falling back to direct insert:', error.message)

  // Fallback: direct insert (works when caller is an admin)
  const { error: fallbackErr } = await supabase.from('notifications').insert(
    rows.map(({ user_id, type, title, message, task_id, link, metadata }) => ({
      user_id, type, title, message, task_id, link, metadata, is_read: false,
    }))
  )
  if (fallbackErr) console.warn('[notif] fallback insert failed:', fallbackErr.message)
}

// ── Recipient fetchers ────────────────────────────────────────────────────────

// All admin-role users (admin + super_admin) — always receive every notification
async function fetchAllAdmins() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department_id')
    .in('role', ['admin', 'super_admin'])
  if (error) { console.warn('[notif] fetchAllAdmins:', error.message); return [] }
  return data ?? []
}

async function fetchProfilesForDepts(deptIds) {
  if (!deptIds.length) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department_id')
    .in('department_id', deptIds)
  if (error) { console.warn('[notif] fetchProfilesForDepts:', error.message); return [] }
  return data ?? []
}

async function fetchSingleProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department_id')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

// Returns tasks that depend on the given taskId (via task_dependencies table)
async function fetchDependentTasks(taskId) {
  const { data: depRows, error } = await supabase
    .from('task_dependencies')
    .select('task_id')
    .eq('depends_on_task_id', String(taskId))

  if (error) {
    // table may not exist in older environments; silently ignore
    return []
  }
  if (!depRows?.length) return []

  const taskIds = depRows.map(r => r.task_id)
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, department_id, activity, project_name, task_number')
    .in('id', taskIds)
  if (taskErr) { console.warn('[notif] fetchDependentTasks:', taskErr.message); return [] }
  return tasks ?? []
}

// Resolve a department by name (first checks localDepts cache, then queries DB)
async function findDeptByName(name, localDepts = []) {
  if (!name) return null
  const lname = String(name).trim().toLowerCase()
  const local = localDepts.find(d => String(d.name).trim().toLowerCase() === lname)
  if (local) return local

  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .ilike('name', String(name).trim())
    .single()
  return data ?? null
}

// ── Core recipient resolution ─────────────────────────────────────────────────

/**
 * Resolves all notification recipients for a task event.
 *
 * Returns:
 *   recipientMap    Map<userId, profile>  — all deduped recipients
 *   depTeamUserIds  Set<userId>           — subset from dependent teams
 *
 * Event types:
 *   ALL events       → ALL admins (admin + super_admin, every dept)
 *   'creation'       → + all dept members
 *   'assignment'     → + assignee
 *   'update'         → + all dept members + dependent-team members (depTeamUserIds)
 *   'subtask_update' → same as update
 *   'completion'     → same as update
 *   'deletion'       → + all dept members
 */
async function resolveRecipients(task, eventType, options = {}) {
  const {
    includeAssignee = false,
    localProfiles = [],
    localDepts = [],
  } = options

  const recipientMap = new Map()   // userId → profile
  const depTeamUserIds = new Set() // userId → is from a dependent team

  function addUsers(users, fromDepTeam = false) {
    for (const u of (users ?? [])) {
      if (!u?.id) continue
      const alreadyPrimary = recipientMap.has(u.id) && !depTeamUserIds.has(u.id)
      recipientMap.set(u.id, u)
      // Only tag as dep-team if not already present as a primary (non-dep) recipient.
      // This prevents admins fetched globally in step 1 from being reclassified as
      // dependency recipients when they also happen to be in a dependent dept.
      if (fromDepTeam && !alreadyPrimary) {
        depTeamUserIds.add(u.id)
      }
    }
  }

  // 1. ALL admins (admin + super_admin, every department) — always included
  addUsers(await fetchAllAdmins())

  // 2. Determine department IDs to fetch
  const taskDeptId = task.department_id != null ? Number(task.department_id) : null
  const depDeptIds = []

  if (['update', 'subtask_update', 'completion'].includes(eventType)) {
    // Dependency via task_dependencies table
    const dependentTasks = await fetchDependentTasks(task.id)
    for (const dt of dependentTasks) {
      const id = dt.department_id != null ? Number(dt.department_id) : null
      if (id && id !== taskDeptId && !depDeptIds.includes(id)) depDeptIds.push(id)
    }

    // Dependency via task.dependency text field (existing architecture)
    if (task.dependency) {
      const dept = await findDeptByName(task.dependency, localDepts)
      if (dept?.id) {
        const id = Number(dept.id)
        if (id !== taskDeptId && !depDeptIds.includes(id)) depDeptIds.push(id)
      }
    }
  }

  // 3. Fetch all relevant profiles in one batch query
  const allDeptIds = taskDeptId ? [taskDeptId, ...depDeptIds] : [...depDeptIds]
  const deptProfiles = await fetchProfilesForDepts(allDeptIds)

  for (const u of deptProfiles) {
    const uDeptId = u.department_id != null ? Number(u.department_id) : null
    const isAdmin = ['admin', 'super_admin'].includes(u.role)
    const isTaskDept = uDeptId === taskDeptId

    if (isTaskDept) {
      // Own dept: always include admin; include members for non-assignment events
      if (isAdmin || eventType !== 'assignment') {
        addUsers([u], false)
      }
    } else {
      // Dependent dept: include admin + members for update-type events
      // (already filtered to depDeptIds above)
      if (['update', 'subtask_update', 'completion'].includes(eventType)) {
        addUsers([u], true)
      }
    }
  }

  // 4. Assignee — for assignment events only
  if (includeAssignee && task.owner_id) {
    const local = localProfiles.find(p => p.id === task.owner_id)
    if (local) {
      addUsers([local], false)
    } else {
      const p = await fetchSingleProfile(task.owner_id)
      if (p) addUsers([p], false)
    }
  }

  return { recipientMap, depTeamUserIds }
}

// ── Notification type resolver ────────────────────────────────────────────────

function resolveType(actionType, isDepTeam) {
  if (isDepTeam) return 'dependency'
  const map = {
    task_created:      'creation',
    task_assigned:     'assignment',
    task_deleted:      'task_deleted',
    completion:        'completion',
    subtask_created:   'subtask_update',
    subtask_deleted:   'subtask_update',
    subtask_completed: 'subtask_update',
    subtask_updated:   'subtask_update',
    due_date_changed:  'update',
    status_changed:    'update',
    priority_changed:  'update',
  }
  return map[actionType] ?? 'update'
}

// ── Row builder ───────────────────────────────────────────────────────────────

function buildRows({ recipientMap, depTeamUserIds }, { actionType, taskId, link, title, message, depTitle, depMessage, metadata }) {
  const taskIdStr = taskId ? String(taskId) : null
  const rows = []

  for (const [userId] of recipientMap) {
    const isDepTeam = depTeamUserIds.has(userId)
    rows.push({
      user_id:  userId,
      type:     resolveType(actionType, isDepTeam),
      title:    isDepTeam ? (depTitle ?? title) : title,
      message:  isDepTeam ? (depMessage ?? message) : message,
      task_id:  taskIdStr,
      link:     link ?? null,
      metadata: {
        ...metadata,
        ...(isDepTeam && { isDependencyNotification: true }),
      },
    })
  }
  return rows
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * TASK CREATED
 * Recipients: Dept Admin, All Dept Members, Super Admins
 */
export async function notifyTaskCreated({ task, profiles = [], departments = [], actor }) {
  const actorName  = profileName(actor, 'A user')
  const deptName   = task.department?.name
    || departments.find(d => Number(d.id) === Number(task.department_id))?.name
    || 'Not assigned'
  const assignee     = profiles.find(p => p.id === task.owner_id)
  const assigneeName = profileName(assignee, 'Not assigned')
  const name         = taskName(task)
  const link         = plainTaskLink(task)
  const message      = `${actorName} created "${name}" in ${deptName}${assignee ? ` — assigned to ${assigneeName}` : ''}.`

  const resolved = await resolveRecipients(task, 'creation', {
    localProfiles: profiles,
    localDepts: departments,
  })
  if (!resolved.recipientMap.size) return

  const rows = buildRows(resolved, {
    actionType: 'task_created',
    taskId: task.id,
    link,
    title:   'New task created',
    message,
    metadata: { taskId: task.id, teamId: task.department_id, actionType: 'task_created' },
  })

  await insertNotificationsBatch(rows)

  const emailHtml = buildEmailHtml('New Task Created', [
    ['Task Name',   escapeHtml(name)],
    ['Created By',  escapeHtml(actorName)],
    ['Department',  escapeHtml(deptName)],
    ['Assigned To', escapeHtml(assigneeName)],
    ['View Task',   `<a href="${escapeHtml(taskLink(task))}" style="color:#2563eb">Open task →</a>`],
  ])
  const emailText = `Task: ${name}\nCreated By: ${actorName}\nDepartment: ${deptName}\nAssigned To: ${assigneeName}\nLink: ${taskLink(task)}`

  await Promise.allSettled(
    [...resolved.recipientMap.values()]
      .filter(u => u.email)
      .map(u => sendEmail({
        to: u.email,
        subject: `New Task Created: ${name}`,
        text: emailText,
        html: emailHtml,
      }))
  )
}

/**
 * TASK ASSIGNED
 * Recipients: Assigned User (personal msg), Dept Admin, Super Admins
 */
export async function notifyTaskAssigned({ task, profiles = [], actor }) {
  const assignee = profiles.find(p => p.id === task.owner_id)
  if (!assignee || assignee.id === actor?.id) return

  const actorName    = profileName(actor, 'A user')
  const assigneeName = profileName(assignee, 'Someone')
  const name         = taskName(task)
  const dueDate      = formatDate(task.end_date)
  const link         = plainTaskLink(task)

  const resolved = await resolveRecipients(task, 'assignment', {
    includeAssignee: true,
    localProfiles: profiles,
  })
  if (!resolved.recipientMap.size) return

  // Build rows — assignee gets personalised message, others get admin view
  const rows = []
  for (const [userId] of resolved.recipientMap) {
    const isAssignee = userId === assignee.id
    rows.push({
      user_id:  userId,
      type:     'assignment',
      title:    isAssignee ? 'Task assigned to you' : 'Task assigned',
      message:  isAssignee
        ? `${actorName} assigned "${name}" to you. Due: ${dueDate}.`
        : `${actorName} assigned "${name}" to ${assigneeName}. Due: ${dueDate}.`,
      task_id:  String(task.id),
      link,
      metadata: { taskId: task.id, teamId: task.department_id, actionType: 'task_assigned' },
    })
  }

  await insertNotificationsBatch(rows)

  // Email the assignee only
  if (assignee.email) {
    const emailHtml = buildEmailHtml('Task Assigned to You', [
      ['Task Name',    escapeHtml(name)],
      ['Assigned By',  escapeHtml(actorName)],
      ['Due Date',     escapeHtml(dueDate)],
      ['View Task',    `<a href="${escapeHtml(taskLink(task))}" style="color:#2563eb">Open task →</a>`],
    ])
    await sendEmail({
      to: assignee.email,
      subject: `Task Assigned: ${name}`,
      text: `Task: ${name}\nAssigned By: ${actorName}\nDue Date: ${dueDate}\nLink: ${taskLink(task)}`,
      html: emailHtml,
    })
  }
}

/**
 * TASK UPDATED (status / due-date / subtask / general)
 * Recipients: Dept Admin, All Dept Members, Super Admins,
 *             + Dependent-team Admins & Members (get 'dependency' type)
 *
 * updateType values:
 *   'status_changed'  | 'due_date_changed' | 'priority_changed'
 *   'subtask_created' | 'subtask_deleted'  | 'subtask_completed' | 'subtask_updated'
 *   'completion'
 */
export async function notifyTaskUpdated({ task, oldTask, updateType, actor, profiles = [], departments = [] }) {
  const actorName = profileName(actor, 'A user')
  const name      = taskName(task)
  const link      = plainTaskLink(task)

  let actionLabel = 'Task updated'
  let oldValue, newValue

  if (updateType === 'completion') {
    actionLabel = 'Task marked as completed'
  } else if (updateType === 'due_date_changed') {
    actionLabel = 'Due date changed'
    oldValue    = formatDate(oldTask?.end_date)
    newValue    = formatDate(task.end_date)
  } else if (updateType === 'status_changed') {
    actionLabel = 'Status changed'
    oldValue    = (oldTask?.status ?? '').replace(/_/g, ' ')
    newValue    = (task.status  ?? '').replace(/_/g, ' ')
  } else if (updateType === 'priority_changed') {
    actionLabel = 'Priority changed'
    oldValue    = oldTask?.priority
    newValue    = task.priority
  } else if (updateType === 'subtask_created') {
    actionLabel = 'Subtask created'
  } else if (updateType === 'subtask_deleted') {
    actionLabel = 'Subtask deleted'
  } else if (updateType === 'subtask_completed') {
    actionLabel = 'Subtask completed'
  } else if (updateType === 'subtask_updated') {
    actionLabel = 'Subtask updated'
  }

  const changeStr = (oldValue !== undefined && newValue !== undefined)
    ? ` (${oldValue} → ${newValue})`
    : ''
  const message    = `${actorName} updated "${name}": ${actionLabel}${changeStr}.`
  const depMessage = `${message} Your team has a dependency on this task.`

  const isSubtask  = String(updateType).startsWith('subtask')
  const eventType  = updateType === 'completion' ? 'completion'
    : isSubtask ? 'subtask_update'
    : 'update'

  const resolved = await resolveRecipients(task, eventType, {
    localProfiles: profiles,
    localDepts: departments,
  })
  if (!resolved.recipientMap.size) return

  const title    = updateType === 'completion' ? `Task completed: ${name}` : `Task updated: ${name}`
  const depTitle = `Dependency Alert: ${name}`

  const rows = buildRows(resolved, {
    actionType: updateType || 'task_updated',
    taskId: task.id,
    link,
    title,
    message,
    depTitle,
    depMessage,
    metadata: {
      taskId: task.id,
      teamId: task.department_id,
      actionType: updateType || 'task_updated',
      ...(oldValue !== undefined && { oldValue }),
      ...(newValue !== undefined && { newValue }),
    },
  })

  await insertNotificationsBatch(rows)

  // Email — dependency recipients get the alert subject
  const hasDependencyRecipients = resolved.depTeamUserIds.size > 0
  const emailSubject = updateType === 'completion'
    ? `Task Completed: ${name}`
    : hasDependencyRecipients
      ? `Dependency Alert: ${name}`
      : `Task Updated: ${name}`

  const emailRows = [
    ['Task Name',  escapeHtml(name)],
    ['Action',     escapeHtml(actionLabel)],
    ['Updated By', escapeHtml(actorName)],
    ...(changeStr ? [['Change', escapeHtml(`${oldValue} → ${newValue}`)]] : []),
    ['View Task',  `<a href="${escapeHtml(taskLink(task))}" style="color:#2563eb">Open task →</a>`],
  ]

  const emailText = [
    `Task: ${name}`,
    `Action: ${actionLabel}`,
    `Updated By: ${actorName}`,
    ...(changeStr ? [`Change: ${oldValue} → ${newValue}`] : []),
    `Link: ${taskLink(task)}`,
  ].join('\n')

  await Promise.allSettled(
    [...resolved.recipientMap.values()]
      .filter(u => u.email)
      .map(u => {
        const isDepTeam = resolved.depTeamUserIds.has(u.id)
        return sendEmail({
          to: u.email,
          subject: isDepTeam && hasDependencyRecipients
            ? `Dependency Alert: ${name}`
            : emailSubject,
          text: isDepTeam
            ? `${emailText}\n\nNote: Your team has a dependency on this task.`
            : emailText,
          html: buildEmailHtml(
            isDepTeam ? `Dependency Alert: ${name}` : emailSubject,
            isDepTeam
              ? [...emailRows, ['Note', 'Your team has a dependency on this task.']]
              : emailRows
          ),
        })
      })
  )
}

/**
 * TASK DELETED
 * Recipients: Dept Admin, All Dept Members, Super Admins
 * (No email — task link is dead; in-app only)
 */
export async function notifyTaskDeleted({ task, actor, profiles = [], departments = [] }) {
  const actorName = profileName(actor, 'A user')
  const name      = taskName(task)
  const message   = `${actorName} deleted "${name}".`

  const resolved = await resolveRecipients(task, 'deletion', {
    localProfiles: profiles,
    localDepts: departments,
  })
  if (!resolved.recipientMap.size) return

  const rows = [...resolved.recipientMap.keys()].map(userId => ({
    user_id:  userId,
    type:     'task_deleted',
    title:    `Task deleted: ${name}`,
    message,
    task_id:  String(task.id),
    link:     null,
    metadata: { taskId: task.id, teamId: task.department_id, actionType: 'task_deleted' },
  }))

  await insertNotificationsBatch(rows)
}

/**
 * TASK DEPENDENCY: link two tasks so updates to the source task
 * trigger cross-team notifications on the dependent task's team.
 *
 * taskId         = the task that depends on another (e.g. Task A in Team A)
 * dependsOnId    = the source task  (e.g. Task B in Team B)
 */
export async function addTaskDependency(taskId, dependsOnId) {
  const { error } = await supabase.from('task_dependencies').insert({
    task_id:            String(taskId),
    depends_on_task_id: String(dependsOnId),
  })
  if (error && error.code !== '23505') { // ignore duplicate key
    console.warn('[notif] addTaskDependency:', error.message)
  }
}

export async function removeTaskDependency(taskId, dependsOnId) {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', String(taskId))
    .eq('depends_on_task_id', String(dependsOnId))
  if (error) console.warn('[notif] removeTaskDependency:', error.message)
}

export async function getTaskDependencies(taskId) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('depends_on_task_id')
    .eq('task_id', String(taskId))
  if (error) return []
  return (data ?? []).map(r => r.depends_on_task_id)
}
