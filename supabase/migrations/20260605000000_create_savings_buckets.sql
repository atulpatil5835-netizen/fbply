create table if not exists public.savings_buckets (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Savings goal',
  target_amount numeric(14, 2) not null default 0 check (target_amount >= 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  color text,
  icon text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.savings_buckets enable row level security;

create index if not exists savings_buckets_user_id_idx on public.savings_buckets (user_id);
create index if not exists savings_buckets_deleted_at_idx on public.savings_buckets (deleted_at);
create index if not exists savings_buckets_position_idx on public.savings_buckets (position);
create index if not exists savings_buckets_target_date_idx on public.savings_buckets (target_date);

create or replace function public.set_savings_buckets_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_savings_buckets_updated_at on public.savings_buckets;

create trigger set_savings_buckets_updated_at
before update on public.savings_buckets
for each row
execute function public.set_savings_buckets_updated_at();

drop policy if exists "Users can read own savings buckets" on public.savings_buckets;
drop policy if exists "Users can insert own savings buckets" on public.savings_buckets;
drop policy if exists "Users can update own savings buckets" on public.savings_buckets;

create policy "Users can read own savings buckets"
on public.savings_buckets
for select
using (auth.uid() = user_id);

create policy "Users can insert own savings buckets"
on public.savings_buckets
for insert
with check (auth.uid() = user_id);

create policy "Users can update own savings buckets"
on public.savings_buckets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
