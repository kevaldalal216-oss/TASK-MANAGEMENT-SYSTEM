create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.current_user_department_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select department_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'super_admin')
$$;

alter table public.tasks enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "department scoped task select" on public.tasks;
create policy "department scoped task select"
on public.tasks
for select
to authenticated
using (
  public.current_user_is_admin()
  or department_id = public.current_user_department_id()
);

drop policy if exists "department scoped task insert" on public.tasks;
create policy "department scoped task insert"
on public.tasks
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or department_id = public.current_user_department_id()
);

drop policy if exists "department scoped task update" on public.tasks;
create policy "department scoped task update"
on public.tasks
for update
to authenticated
using (
  public.current_user_is_admin()
  or department_id = public.current_user_department_id()
)
with check (
  public.current_user_is_admin()
  or department_id = public.current_user_department_id()
);

drop policy if exists "department scoped task delete" on public.tasks;
create policy "department scoped task delete"
on public.tasks
for delete
to authenticated
using (
  public.current_user_is_admin()
  or department_id = public.current_user_department_id()
);

drop policy if exists "department scoped department select" on public.departments;
create policy "department scoped department select"
on public.departments
for select
to authenticated
using (
  public.current_user_is_admin()
  or id = public.current_user_department_id()
);

drop policy if exists "admin department write" on public.departments;
create policy "admin department write"
on public.departments
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "department scoped profile select" on public.profiles;
create policy "department scoped profile select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_is_admin()
  or department_id = public.current_user_department_id()
);

drop policy if exists "admin profile write" on public.profiles;
create policy "admin profile write"
on public.profiles
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
