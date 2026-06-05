create table if not exists public.user_commitments (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source text not null check (source in ('profile_commitment', 'recurring_schedule')),
  commitment_type text not null default 'Other Commitment',
  schedule_type text,
  direction text not null default 'outgoing' check (direction in ('incoming', 'outgoing')),
  name text not null default 'Recurring item',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'weekly', 'quarterly', 'yearly')),
  due_day smallint check (due_day between 1 and 31),
  start_date date,
  note text,
  paused boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.user_commitments enable row level security;

create index if not exists user_commitments_user_id_idx on public.user_commitments (user_id);
create index if not exists user_commitments_source_idx on public.user_commitments (source);
create index if not exists user_commitments_deleted_at_idx on public.user_commitments (deleted_at);
create index if not exists user_commitments_start_date_idx on public.user_commitments (start_date);

create or replace function public.set_user_commitments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_commitments_updated_at on public.user_commitments;

create trigger set_user_commitments_updated_at
before update on public.user_commitments
for each row
execute function public.set_user_commitments_updated_at();

drop policy if exists "Users can read own commitments" on public.user_commitments;
drop policy if exists "Users can insert own commitments" on public.user_commitments;
drop policy if exists "Users can update own commitments" on public.user_commitments;

create policy "Users can read own commitments"
on public.user_commitments
for select
using (auth.uid() = user_id);

create policy "Users can insert own commitments"
on public.user_commitments
for insert
with check (auth.uid() = user_id);

create policy "Users can update own commitments"
on public.user_commitments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
