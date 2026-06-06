alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('assignment', 'creation', 'task_assigned', 'task_created', 'task_updated', 'task_deleted')),
  title text,
  message text not null,
  task_id text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists title text,
  add column if not exists task_id text,
  add column if not exists link text,
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'read'
  ) then
    execute 'update public.notifications set is_read = read where is_read = false';
  end if;
end $$;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notification recipients can read own notifications" on public.notifications;
create policy "notification recipients can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notification recipients can update own notifications" on public.notifications;
create policy "notification recipients can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "authenticated users can create task notifications" on public.notifications;
create policy "authenticated users can create task notifications"
on public.notifications
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.tasks t
    where t.id::text = task_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "authenticated users can see admin notification recipients" on public.profiles;
create policy "authenticated users can see admin notification recipients"
on public.profiles
for select
to authenticated
using (role in ('admin', 'super_admin'));
