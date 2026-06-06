import { supabase } from './supabase'

const adminRoles = ['super_admin', 'admin']

function taskName(task) {
  return task?.activity || task?.project_name || `Task #${task?.task_number ?? task?.id ?? ''}`
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function profileName(profile, fallback = 'Someone') {
  return profile?.full_name || profile?.email || fallback
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]))
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

async function sendEmail({ to, subject, text, html }) {
  if (!to) return
  try {
    await supabase.functions.invoke('send-task-email', {
      body: { to, subject, text, html },
    })
  } catch (error) {
    console.warn('Task notification email failed:', error)
  }
}

async function insertNotifications(rows) {
  if (!rows.length) return
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.warn('Task notification insert failed:', error)
}

export async function notifyTaskCreated({ task, profiles, departments, actor }) {
  const { data: adminProfiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', adminRoles)
  if (error) {
    console.warn('Admin notification recipient lookup failed:', error)
  }
  const admins = adminProfiles ?? profiles.filter(profile => adminRoles.includes(profile.role))
  if (!admins.length) return

  const actorName = profileName(actor, 'A user')
  const departmentName = task.department?.name
    || departments.find(department => Number(department.id) === Number(task.department_id))?.name
    || 'Not assigned'
  const assignee = profiles.find(profile => profile.id === task.owner_id)
  const assigneeName = profileName(assignee, 'Not assigned')
  const name = taskName(task)
  const safeName = escapeHtml(name)
  const safeActorName = escapeHtml(actorName)
  const safeDepartmentName = escapeHtml(departmentName)
  const safeAssigneeName = escapeHtml(assigneeName)
  const safeTaskLink = escapeHtml(taskLink(task))
  const message = `${actorName} created "${name}" for ${departmentName}${assignee ? ` and assigned it to ${assigneeName}` : ''}.`
  const link = plainTaskLink(task)

  await insertNotifications(admins.map(admin => ({
    user_id: admin.id,
    type: 'creation',
    title: 'New task created',
    message,
    task_id: String(task.id),
    link,
    is_read: false,
  })))

  await Promise.allSettled(admins.map(admin => sendEmail({
    to: admin.email,
    subject: `New task created: ${name}`,
    text: [
      `Task Name: ${name}`,
      `Created By: ${actorName}`,
      `Department: ${departmentName}`,
      `Assigned To: ${assigneeName}`,
      `View Task: ${taskLink(task)}`,
    ].join('\n'),
    html: `
      <h2>New task created</h2>
      <p><strong>Task Name:</strong> ${safeName}</p>
      <p><strong>Created By:</strong> ${safeActorName}</p>
      <p><strong>Department:</strong> ${safeDepartmentName}</p>
      <p><strong>Assigned To:</strong> ${safeAssigneeName}</p>
      <p><a href="${safeTaskLink}">View task</a></p>
    `,
  })))
}

export async function notifyTaskAssigned({ task, profiles, actor }) {
  const assignee = profiles.find(profile => profile.id === task.owner_id)
  if (!assignee || assignee.id === actor?.id) return

  const actorName = profileName(actor, 'A user')
  const name = taskName(task)
  const dueDate = formatDate(task.end_date)
  const safeName = escapeHtml(name)
  const safeActorName = escapeHtml(actorName)
  const safeDueDate = escapeHtml(dueDate)
  const safeTaskLink = escapeHtml(taskLink(task))
  const message = `${actorName} assigned "${name}" to you. Due date: ${dueDate}.`
  const link = plainTaskLink(task)

  await insertNotifications([{
    user_id: assignee.id,
    type: 'assignment',
    title: 'Task assigned to you',
    message,
    task_id: String(task.id),
    link,
    is_read: false,
  }])

  await sendEmail({
    to: assignee.email,
    subject: `Task assigned: ${name}`,
    text: [
      `Task Name: ${name}`,
      `Assigned By: ${actorName}`,
      `Due Date: ${dueDate}`,
      `View Task: ${taskLink(task)}`,
    ].join('\n'),
    html: `
      <h2>Task assigned to you</h2>
      <p><strong>Task Name:</strong> ${safeName}</p>
      <p><strong>Assigned By:</strong> ${safeActorName}</p>
      <p><strong>Due Date:</strong> ${safeDueDate}</p>
      <p><a href="${safeTaskLink}">View task</a></p>
    `,
  })
}
