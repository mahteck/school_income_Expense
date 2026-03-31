-- Coaching/School Financial Management System
-- Execute in Supabase SQL editor (use the "public" schema)

begin;

-- UUID helpers
create extension if not exists pgcrypto;

-- Head type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'head_type') then
    create type public.head_type as enum ('income', 'expense');
  end if;
end $$;

-- Heads table
create table if not exists public.heads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.head_type not null,
  created_at timestamptz not null default now()
);

-- Collections table
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  student_name text not null,
  class text not null,
  month text not null, -- expected format: YYYY-MM
  fee_head_id uuid not null references public.heads(id) on delete restrict,
  amount_received numeric not null,
  remaining_amount numeric not null default 0,
  remarks text,
  created_at timestamptz not null default now()
);

-- Expenses table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  expense_head_id uuid not null references public.heads(id) on delete restrict,
  amount numeric not null,
  description text,
  created_at timestamptz not null default now()
);

-- Basic indexes for dashboard filters
create index if not exists collections_month_idx on public.collections(month);
create index if not exists collections_date_idx on public.collections(date);
create index if not exists collections_fee_head_id_idx on public.collections(fee_head_id);

create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists expenses_expense_head_id_idx on public.expenses(expense_head_id);

-- Seed default heads (safe to run multiple times)
insert into public.heads (name, type)
select 'Tuition Fee', 'income'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Tuition Fee' and type = 'income'
);

insert into public.heads (name, type)
select 'Admission Fee', 'income'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Admission Fee' and type = 'income'
);

insert into public.heads (name, type)
select 'Exam Fee', 'income'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Exam Fee' and type = 'income'
);

insert into public.heads (name, type)
select 'Other Income', 'income'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Other Income' and type = 'income'
);

insert into public.heads (name, type)
select 'Salary', 'expense'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Salary' and type = 'expense'
);

insert into public.heads (name, type)
select 'Rent', 'expense'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Rent' and type = 'expense'
);

insert into public.heads (name, type)
select 'Utilities', 'expense'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Utilities' and type = 'expense'
);

insert into public.heads (name, type)
select 'Stationery', 'expense'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Stationery' and type = 'expense'
);

insert into public.heads (name, type)
select 'Maintenance', 'expense'::public.head_type
where not exists (
  select 1 from public.heads where name = 'Maintenance' and type = 'expense'
);

-- RLS
alter table public.heads enable row level security;
alter table public.collections enable row level security;
alter table public.expenses enable row level security;

-- Heads policies
drop policy if exists "heads_select_authenticated" on public.heads;
create policy "heads_select_authenticated"
on public.heads
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "heads_insert_authenticated" on public.heads;
create policy "heads_insert_authenticated"
on public.heads
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "heads_update_authenticated" on public.heads;
create policy "heads_update_authenticated"
on public.heads
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "heads_delete_authenticated" on public.heads;
create policy "heads_delete_authenticated"
on public.heads
for delete
to authenticated
using (auth.uid() is not null);

-- Collections policies
drop policy if exists "collections_select_authenticated" on public.collections;
create policy "collections_select_authenticated"
on public.collections
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "collections_insert_authenticated" on public.collections;
create policy "collections_insert_authenticated"
on public.collections
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "collections_update_authenticated" on public.collections;
create policy "collections_update_authenticated"
on public.collections
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "collections_delete_authenticated" on public.collections;
create policy "collections_delete_authenticated"
on public.collections
for delete
to authenticated
using (auth.uid() is not null);

-- Expenses policies
drop policy if exists "expenses_select_authenticated" on public.expenses;
create policy "expenses_select_authenticated"
on public.expenses
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "expenses_insert_authenticated" on public.expenses;
create policy "expenses_insert_authenticated"
on public.expenses
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "expenses_update_authenticated" on public.expenses;
create policy "expenses_update_authenticated"
on public.expenses
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "expenses_delete_authenticated" on public.expenses;
create policy "expenses_delete_authenticated"
on public.expenses
for delete
to authenticated
using (auth.uid() is not null);

commit;

