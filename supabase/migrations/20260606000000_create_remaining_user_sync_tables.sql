create table if not exists public.user_money_book (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'given' check (kind in ('given', 'taken')),
  person text not null default '',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  interest numeric(14, 2) not null default 0 check (interest >= 0),
  entry_date date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'settled')),
  due_date date,
  settled_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_shared_groups (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Shared trip',
  purpose text,
  people jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  settlements jsonb not null default '[]'::jsonb,
  group_date date not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_report_history (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id text not null,
  type text not null default 'monthly',
  name text not null default 'Financial Report',
  template text not null default 'standard',
  generated_at timestamptz not null default timezone('utc', now()),
  currency text not null default 'INR',
  period text,
  prepared_for text,
  payload jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_statement_mappings (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  mapping_key text not null,
  category text not null default 'Other',
  payload jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_voice_memory (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  label text,
  merchant text,
  category text not null default 'Other',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  confidence text,
  learning_source text,
  category_reason text,
  last_learned_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.user_money_book enable row level security;
alter table public.user_shared_groups enable row level security;
alter table public.user_report_history enable row level security;
alter table public.user_statement_mappings enable row level security;
alter table public.user_voice_memory enable row level security;

create index if not exists user_money_book_user_id_idx on public.user_money_book (user_id);
create index if not exists user_money_book_deleted_at_idx on public.user_money_book (deleted_at);
create index if not exists user_money_book_entry_date_idx on public.user_money_book (entry_date);
create index if not exists user_money_book_status_idx on public.user_money_book (status);
create index if not exists user_money_book_position_idx on public.user_money_book (position);

create index if not exists user_shared_groups_user_id_idx on public.user_shared_groups (user_id);
create index if not exists user_shared_groups_deleted_at_idx on public.user_shared_groups (deleted_at);
create index if not exists user_shared_groups_group_date_idx on public.user_shared_groups (group_date);
create index if not exists user_shared_groups_position_idx on public.user_shared_groups (position);

create index if not exists user_report_history_user_id_idx on public.user_report_history (user_id);
create index if not exists user_report_history_deleted_at_idx on public.user_report_history (deleted_at);
create index if not exists user_report_history_generated_at_idx on public.user_report_history (generated_at);
create index if not exists user_report_history_position_idx on public.user_report_history (position);

create index if not exists user_statement_mappings_user_id_idx on public.user_statement_mappings (user_id);
create index if not exists user_statement_mappings_deleted_at_idx on public.user_statement_mappings (deleted_at);
create index if not exists user_statement_mappings_mapping_key_idx on public.user_statement_mappings (mapping_key);

create index if not exists user_voice_memory_user_id_idx on public.user_voice_memory (user_id);
create index if not exists user_voice_memory_deleted_at_idx on public.user_voice_memory (deleted_at);
create index if not exists user_voice_memory_memory_key_idx on public.user_voice_memory (memory_key);
create index if not exists user_voice_memory_category_idx on public.user_voice_memory (category);

create or replace function public.set_remaining_user_sync_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_money_book_updated_at on public.user_money_book;
create trigger set_user_money_book_updated_at
before update on public.user_money_book
for each row
execute function public.set_remaining_user_sync_updated_at();

drop trigger if exists set_user_shared_groups_updated_at on public.user_shared_groups;
create trigger set_user_shared_groups_updated_at
before update on public.user_shared_groups
for each row
execute function public.set_remaining_user_sync_updated_at();

drop trigger if exists set_user_report_history_updated_at on public.user_report_history;
create trigger set_user_report_history_updated_at
before update on public.user_report_history
for each row
execute function public.set_remaining_user_sync_updated_at();

drop trigger if exists set_user_statement_mappings_updated_at on public.user_statement_mappings;
create trigger set_user_statement_mappings_updated_at
before update on public.user_statement_mappings
for each row
execute function public.set_remaining_user_sync_updated_at();

drop trigger if exists set_user_voice_memory_updated_at on public.user_voice_memory;
create trigger set_user_voice_memory_updated_at
before update on public.user_voice_memory
for each row
execute function public.set_remaining_user_sync_updated_at();

drop policy if exists "Users can read own money book" on public.user_money_book;
drop policy if exists "Users can insert own money book" on public.user_money_book;
drop policy if exists "Users can update own money book" on public.user_money_book;

create policy "Users can read own money book"
on public.user_money_book
for select
using (auth.uid() = user_id);

create policy "Users can insert own money book"
on public.user_money_book
for insert
with check (auth.uid() = user_id);

create policy "Users can update own money book"
on public.user_money_book
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own shared groups" on public.user_shared_groups;
drop policy if exists "Users can insert own shared groups" on public.user_shared_groups;
drop policy if exists "Users can update own shared groups" on public.user_shared_groups;

create policy "Users can read own shared groups"
on public.user_shared_groups
for select
using (auth.uid() = user_id);

create policy "Users can insert own shared groups"
on public.user_shared_groups
for insert
with check (auth.uid() = user_id);

create policy "Users can update own shared groups"
on public.user_shared_groups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own report history" on public.user_report_history;
drop policy if exists "Users can insert own report history" on public.user_report_history;
drop policy if exists "Users can update own report history" on public.user_report_history;

create policy "Users can read own report history"
on public.user_report_history
for select
using (auth.uid() = user_id);

create policy "Users can insert own report history"
on public.user_report_history
for insert
with check (auth.uid() = user_id);

create policy "Users can update own report history"
on public.user_report_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own statement mappings" on public.user_statement_mappings;
drop policy if exists "Users can insert own statement mappings" on public.user_statement_mappings;
drop policy if exists "Users can update own statement mappings" on public.user_statement_mappings;

create policy "Users can read own statement mappings"
on public.user_statement_mappings
for select
using (auth.uid() = user_id);

create policy "Users can insert own statement mappings"
on public.user_statement_mappings
for insert
with check (auth.uid() = user_id);

create policy "Users can update own statement mappings"
on public.user_statement_mappings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own voice memory" on public.user_voice_memory;
drop policy if exists "Users can insert own voice memory" on public.user_voice_memory;
drop policy if exists "Users can update own voice memory" on public.user_voice_memory;

create policy "Users can read own voice memory"
on public.user_voice_memory
for select
using (auth.uid() = user_id);

create policy "Users can insert own voice memory"
on public.user_voice_memory
for insert
with check (auth.uid() = user_id);

create policy "Users can update own voice memory"
on public.user_voice_memory
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
