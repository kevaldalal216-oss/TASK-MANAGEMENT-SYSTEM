alter table public.tasks
  add column if not exists subtask_completed boolean[] not null default '{}';

comment on column public.tasks.subtask_completed is
  'Completion flags aligned by index with the newline-separated subtask field.';
