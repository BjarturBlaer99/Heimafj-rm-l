create extension if not exists "pgcrypto";

create type public.category_type as enum ('income', 'expense', 'both');
create type public.transaction_type as enum ('income', 'expense');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'ISK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.category_type not null default 'expense',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  type public.transaction_type not null,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, category_id)
);

create table public.bills (
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

create table public.bill_payments (
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

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  savings_goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories(user_id);
create index transactions_user_id_date_idx on public.transactions(user_id, date desc);
create index transactions_category_id_idx on public.transactions(category_id);
create index budgets_user_id_month_idx on public.budgets(user_id, month);
create index bills_user_id_idx on public.bills(user_id);
create index bills_user_id_active_idx on public.bills(user_id, is_active);
create index bill_payments_user_id_month_idx on public.bill_payments(user_id, month);
create index bill_payments_bill_id_idx on public.bill_payments(bill_id);
create index bill_payments_transaction_id_idx on public.bill_payments(transaction_id);
create index savings_goals_user_id_idx on public.savings_goals(user_id);
create index savings_contributions_user_id_date_idx on public.savings_contributions(user_id, date desc);
create index savings_contributions_goal_id_idx on public.savings_contributions(savings_goal_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger bills_updated_at before update on public.bills for each row execute function public.set_updated_at();
create trigger savings_goals_updated_at before update on public.savings_goals for each row execute function public.set_updated_at();

create or replace function public.seed_default_categories(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, is_default)
  values
    (target_user_id, 'Húsnæði', 'expense', true),
    (target_user_id, 'Matur', 'expense', true),
    (target_user_id, 'Samgöngur', 'expense', true),
    (target_user_id, 'Reikningar', 'expense', true),
    (target_user_id, 'Innkaup', 'expense', true),
    (target_user_id, 'Heilsa', 'expense', true),
    (target_user_id, 'Afþreying', 'expense', true),
    (target_user_id, 'Áskriftir', 'expense', true),
    (target_user_id, 'Laun', 'income', true),
    (target_user_id, 'Verktakavinna', 'income', true),
    (target_user_id, 'Sparnaður', 'both', true),
    (target_user_id, 'Annað', 'both', true)
  on conflict (user_id, name) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.apply_savings_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.savings_goals
    set current_amount = current_amount + new.amount
    where id = new.savings_goal_id and user_id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.savings_goals
    set current_amount = greatest(0, current_amount - old.amount)
    where id = old.savings_goal_id and user_id = old.user_id;
    return old;
  elsif tg_op = 'UPDATE' then
    update public.savings_goals
    set current_amount = greatest(0, current_amount - old.amount + new.amount)
    where id = new.savings_goal_id and user_id = new.user_id;
    return new;
  end if;
  return null;
end;
$$;

create trigger savings_contribution_insert after insert on public.savings_contributions for each row execute function public.apply_savings_contribution();
create trigger savings_contribution_update after update on public.savings_contributions for each row execute function public.apply_savings_contribution();
create trigger savings_contribution_delete after delete on public.savings_contributions for each row execute function public.apply_savings_contribution();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id and is_default = false);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create policy "bills_select_own" on public.bills for select using (auth.uid() = user_id);
create policy "bills_insert_own" on public.bills for insert with check (auth.uid() = user_id);
create policy "bills_update_own" on public.bills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bills_delete_own" on public.bills for delete using (auth.uid() = user_id);

create policy "bill_payments_select_own" on public.bill_payments for select using (auth.uid() = user_id);
create policy "bill_payments_insert_own" on public.bill_payments for insert with check (auth.uid() = user_id);
create policy "bill_payments_update_own" on public.bill_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bill_payments_delete_own" on public.bill_payments for delete using (auth.uid() = user_id);

create policy "savings_goals_select_own" on public.savings_goals for select using (auth.uid() = user_id);
create policy "savings_goals_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "savings_goals_update_own" on public.savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_goals_delete_own" on public.savings_goals for delete using (auth.uid() = user_id);

create policy "savings_contributions_select_own" on public.savings_contributions for select using (auth.uid() = user_id);
create policy "savings_contributions_insert_own" on public.savings_contributions for insert with check (auth.uid() = user_id);
create policy "savings_contributions_update_own" on public.savings_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_contributions_delete_own" on public.savings_contributions for delete using (auth.uid() = user_id);
