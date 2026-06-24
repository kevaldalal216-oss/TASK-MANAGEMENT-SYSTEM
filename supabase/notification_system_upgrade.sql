-- ============================================================
-- Notification System Upgrade
-- Role-Based & Dependency-Aware Notification System
-- Run this migration once against your Supabase project.
-- ============================================================

-- 1. Extend allowed notification types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'assignment', 'creation', 'task_assigned', 'task_created',
    'task_updated', 'task_deleted', 'update', 'subtask_update',
    'completion', 'dependency'
  ));

-- 2. Add metadata JSONB column for structured context
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 3. task_dependencies table
--    task_id            = the task that has a dependency (dependent task)
--    depends_on_task_id = the task being depended on (source task)
--
--    When the source task is updated, all dependent tasks' teams are notified.
--
--    NOTE: task_id / depends_on_task_id are stored as TEXT to match whatever
--    primary-key type your tasks table uses (bigint or uuid). Change to the
--    matching type + ADD FOREIGN KEY if desired.
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            text        NOT NULL,
  depends_on_task_id text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_dep_select" ON public.task_dependencies;
CREATE POLICY "task_dep_select"
  ON public.task_dependencies FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_dep_insert" ON public.task_dependencies;
CREATE POLICY "task_dep_insert"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = task_id
        AND t.department_id = public.current_user_department_id()
    )
  );

DROP POLICY IF EXISTS "task_dep_delete" ON public.task_dependencies;
CREATE POLICY "task_dep_delete"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = task_id
        AND t.department_id = public.current_user_department_id()
    )
  );

-- 4. Security-definer batch insert function
--    Bypasses RLS so any authenticated user can create notifications for others.
--    The frontend calls this via supabase.rpc('insert_notifications_batch', { rows: [...] }).
CREATE OR REPLACE FUNCTION public.insert_notifications_batch(rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications
    (user_id, type, title, message, task_id, link, metadata, is_read)
  SELECT
    (r->>'user_id')::uuid,
    r->>'type',
    r->>'title',
    r->>'message',
    r->>'task_id',
    r->>'link',
    r->'metadata',
    false
  FROM jsonb_array_elements(rows) AS r
  WHERE (r->>'user_id') IS NOT NULL
    AND (r->>'type')    IS NOT NULL
    AND (r->>'message') IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_notifications_batch(jsonb) TO authenticated;

-- 5. Allow any authenticated user to insert notifications they trigger.
--    The security-definer function above is the preferred path; this policy
--    acts as a fallback for direct-insert scenarios (e.g. admin users).
DROP POLICY IF EXISTS "authenticated users can create task notifications" ON public.notifications;
CREATE POLICY "authenticated users can create task notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
