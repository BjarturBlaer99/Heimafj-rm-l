create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_day integer not null check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  month date not null,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, bill_id, month)
);

create index if not exists bills_user_id_idx on public.bills(user_id);
create index if not exists bills_user_id_active_idx on public.bills(user_id, is_active);
create index if not exists bill_payments_user_id_month_idx on public.bill_payments(user_id, month);
create index if not exists bill_payments_bill_id_idx on public.bill_payments(bill_id);
create index if not exists bill_payments_transaction_id_idx on public.bill_payments(transaction_id);

drop trigger if exists bills_updated_at on public.bills;
create trigger bills_updated_at before update on public.bills for each row execute function public.set_updated_at();

alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;

drop policy if exists "bills_select_own" on public.bills;
drop policy if exists "bills_insert_own" on public.bills;
drop policy if exists "bills_update_own" on public.bills;
drop policy if exists "bills_delete_own" on public.bills;
drop policy if exists "bill_payments_select_own" on public.bill_payments;
drop policy if exists "bill_payments_insert_own" on public.bill_payments;
drop policy if exists "bill_payments_update_own" on public.bill_payments;
drop policy if exists "bill_payments_delete_own" on public.bill_payments;

create policy "bills_select_own" on public.bills for select using (auth.uid() = user_id);
create policy "bills_insert_own" on public.bills for insert with check (auth.uid() = user_id);
create policy "bills_update_own" on public.bills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bills_delete_own" on public.bills for delete using (auth.uid() = user_id);

create policy "bill_payments_select_own" on public.bill_payments for select using (auth.uid() = user_id);
create policy "bill_payments_insert_own" on public.bill_payments for insert with check (auth.uid() = user_id);
create policy "bill_payments_update_own" on public.bill_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bill_payments_delete_own" on public.bill_payments for delete using (auth.uid() = user_id);

insert into public.categories (user_id, name, type, is_default)
select id, 'Reikningar', 'expense', true
from auth.users
on conflict (user_id, name) do nothing;
