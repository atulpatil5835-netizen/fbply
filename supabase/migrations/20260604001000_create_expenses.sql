create table if not exists public.expenses (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'daily',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  category text not null default 'Other',
  merchant text,
  note text,
  date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.expenses enable row level security;

create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_date_idx on public.expenses (date);
create index if not exists expenses_created_at_idx on public.expenses (created_at);

create or replace function public.set_expenses_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_expenses_updated_at on public.expenses;

create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_expenses_updated_at();

drop policy if exists "Users can read own expenses" on public.expenses;
drop policy if exists "Users can insert own expenses" on public.expenses;
drop policy if exists "Users can update own expenses" on public.expenses;

create policy "Users can read own expenses"
on public.expenses
for select
using (auth.uid() = user_id);

create policy "Users can insert own expenses"
on public.expenses
for insert
with check (auth.uid() = user_id);

create policy "Users can update own expenses"
on public.expenses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
