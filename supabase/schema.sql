create extension if not exists "pgcrypto";

create type public.category_type as enum ('income', 'expense', 'both');
create type public.transaction_type as enum ('income', 'expense');
create type public.savings_bucket_type as enum ('serignarsparnadur', 'husnaedisparnadur', 'hlutabref', 'sjodir');

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
  series_id uuid not null default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  month date not null constraint bills_month_first_day_check check (extract(day from month) = 1),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_day integer not null check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bills_user_series_month_key unique (user_id, series_id, month)
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

create table public.savings_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_type public.savings_bucket_type not null,
  label text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bucket_type)
);

create table public.savings_bucket_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_type public.savings_bucket_type not null,
  label text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
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
create index bills_user_id_month_idx on public.bills(user_id, month);
create index bills_user_id_series_idx on public.bills(user_id, series_id);
create index bills_user_id_month_active_idx on public.bills(user_id, month, is_active);
create index bill_payments_user_id_month_idx on public.bill_payments(user_id, month);
create index bill_payments_bill_id_idx on public.bill_payments(bill_id);
create index bill_payments_transaction_id_idx on public.bill_payments(transaction_id);
create index savings_buckets_user_id_idx on public.savings_buckets(user_id);
create index savings_bucket_entries_user_id_date_idx on public.savings_bucket_entries(user_id, date desc);
create index savings_bucket_entries_user_id_bucket_idx on public.savings_bucket_entries(user_id, bucket_type);
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
create trigger savings_buckets_updated_at before update on public.savings_buckets for each row execute function public.set_updated_at();
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

create or replace function public.seed_savings_buckets(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.savings_buckets (user_id, bucket_type, label, amount)
  values
    (target_user_id, 'serignarsparnadur', 'Séreignarsparnaður', 0),
    (target_user_id, 'husnaedisparnadur', 'Húsnæðisparnaður', 0),
    (target_user_id, 'hlutabref', 'Hlutabréf', 0),
    (target_user_id, 'sjodir', 'Sjóðir', 0)
  on conflict (user_id, bucket_type) do update
    set label = excluded.label;
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
  perform public.seed_savings_buckets(new.id);
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
alter table public.savings_buckets enable row level security;
alter table public.savings_bucket_entries enable row level security;
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

create policy "savings_buckets_select_own" on public.savings_buckets for select using (auth.uid() = user_id);
create policy "savings_buckets_insert_own" on public.savings_buckets for insert with check (auth.uid() = user_id);
create policy "savings_buckets_update_own" on public.savings_buckets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_buckets_delete_own" on public.savings_buckets for delete using (auth.uid() = user_id);

create policy "savings_bucket_entries_select_own" on public.savings_bucket_entries for select using (auth.uid() = user_id);
create policy "savings_bucket_entries_insert_own" on public.savings_bucket_entries for insert with check (auth.uid() = user_id);
create policy "savings_bucket_entries_update_own" on public.savings_bucket_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_bucket_entries_delete_own" on public.savings_bucket_entries for delete using (auth.uid() = user_id);

create policy "savings_goals_select_own" on public.savings_goals for select using (auth.uid() = user_id);
create policy "savings_goals_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "savings_goals_update_own" on public.savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_goals_delete_own" on public.savings_goals for delete using (auth.uid() = user_id);

create policy "savings_contributions_select_own" on public.savings_contributions for select using (auth.uid() = user_id);
create policy "savings_contributions_insert_own" on public.savings_contributions for insert with check (auth.uid() = user_id);
create policy "savings_contributions_update_own" on public.savings_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_contributions_delete_own" on public.savings_contributions for delete using (auth.uid() = user_id);

-- Bill-payment integrity: keep in sync with bill-payment-integrity-update.sql.
-- Apply before deploying existing-expense bill linking. This migration makes
-- cross-request linking and transaction editing safe under concurrent writes.
begin;
set local lock_timeout = '10s';

-- Keep the legacy-data audit and trigger installation in one write-free window.
-- Reads continue; competing application writes wait until this transaction ends.
lock table public.transactions, public.bills, public.bill_payments in share row exclusive mode;

-- Do not silently resolve legacy duplicates or discard a user's payment data.
do $$
begin
  if exists (select 1 from public.bill_payments where transaction_id is not null group by transaction_id having count(*) > 1) then
    raise exception 'A transaction is linked to multiple bill payments. Review and unlink duplicate payments before applying this migration.';
  end if;
  if exists (
    select 1 from public.bill_payments p
    join public.transactions t on t.id = p.transaction_id
    join public.bills b on b.id = p.bill_id
    where p.user_id <> t.user_id or t.type <> 'expense'
       or p.amount <> t.amount or p.paid_at <> t.date
       or p.user_id <> b.user_id or p.month <> b.month
  ) then
    raise exception 'A linked payment differs from its expense or bill. Review and unlink inconsistent payments before applying this migration.';
  end if;
end $$;

create unique index if not exists bill_payments_transaction_unique
  on public.bill_payments(transaction_id) where transaction_id is not null;

create or replace function public.validate_bill_payment_expense()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  linked_expense public.transactions%rowtype;
  linked_bill public.bills%rowtype;
begin
  if new.transaction_id is null then
    raise exception 'A new bill payment must link an existing expense.';
  end if;
  select * into linked_expense from public.transactions where id = new.transaction_id for update;
  if not found or linked_expense.user_id <> new.user_id or linked_expense.type <> 'expense' then
    raise exception 'The payment must link an expense owned by the same user.';
  end if;
  if new.amount <> linked_expense.amount or new.paid_at <> linked_expense.date then
    raise exception 'The expense changed. Reload it before linking the payment.';
  end if;
  select * into linked_bill from public.bills where id = new.bill_id for update;
  if not found or linked_bill.user_id <> new.user_id or linked_bill.month <> new.month then
    raise exception 'The payment must match the owner and month of its bill.';
  end if;
  return new;
end $$;

drop trigger if exists bill_payment_expense_integrity on public.bill_payments;
create trigger bill_payment_expense_integrity before insert or update on public.bill_payments
  for each row execute function public.validate_bill_payment_expense();

create or replace function public.protect_linked_bill_expense()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    -- auth.users has already been removed when its FK cascades run. Allow that
    -- account-erasure cascade regardless of child-table trigger ordering;
    -- normal expense deletion still requires unlinking the payment first.
    if not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
    if exists (select 1 from public.bill_payments where transaction_id = old.id) then
      raise exception 'Unlink the bill payment before deleting this expense.';
    end if;
    return old;
  end if;
  if (new.amount, new.date, new.type, new.user_id) is distinct from (old.amount, old.date, old.type, old.user_id)
     and exists (select 1 from public.bill_payments where transaction_id = old.id) then
    raise exception 'Unlink the bill payment before changing the amount, date, type or owner of this expense.';
  end if;
  return new;
end $$;

drop trigger if exists protect_linked_bill_expense on public.transactions;
create trigger protect_linked_bill_expense before update or delete on public.transactions
  for each row execute function public.protect_linked_bill_expense();

create or replace function public.protect_linked_bill_identity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (new.month, new.user_id) is distinct from (old.month, old.user_id)
     and exists (select 1 from public.bill_payments where bill_id = old.id) then
    raise exception 'Unlink the bill payment before changing the month or owner of this bill.';
  end if;
  return new;
end $$;

drop trigger if exists protect_linked_bill_identity on public.bills;
create trigger protect_linked_bill_identity before update on public.bills
  for each row execute function public.protect_linked_bill_identity();

-- Supabase's function defaults can explicitly grant these roles EXECUTE;
-- revoking PUBLIC alone does not remove those independent grants.
revoke all on function public.validate_bill_payment_expense() from public, anon, authenticated;
revoke all on function public.protect_linked_bill_expense() from public, anon, authenticated;
revoke all on function public.protect_linked_bill_identity() from public, anon, authenticated;

commit;

-- Apply before deploying atomic savings contributions.
begin;

create or replace function public.add_savings_bucket_contribution(
  p_request_id uuid,
  p_bucket_type public.savings_bucket_type,
  p_amount numeric,
  p_date date,
  p_note text default null,
  p_label text default null
)
returns table(entry_id uuid, balance numeric, already_recorded boolean)
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  entry_label text;
  entry_note text := nullif(btrim(p_note), '');
  recorded_id uuid;
  recorded_entry public.savings_bucket_entries%rowtype;
  resulting_balance numeric;
begin
  if owner_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_request_id is null or p_bucket_type is null or p_date is null
     or p_date < date '0001-01-01' or p_date > date '9999-12-31'
     or p_amount is null or not (p_amount > 0 and p_amount <= 9999999999.99)
     or p_amount <> round(p_amount, 2) then
    raise exception 'A request ID, bucket, date and positive amount with at most two decimals are required.' using errcode = '22023';
  end if;
  entry_label := coalesce(nullif(btrim(p_label), ''), case p_bucket_type
    when 'serignarsparnadur' then 'Séreignarsparnaður'
    when 'husnaedisparnadur' then 'Húsnæðisparnaður'
    when 'hlutabref' then 'Hlutabréf'
    when 'sjodir' then 'Sjóðir'
  end);
  if length(entry_label) > 80 or length(entry_note) > 500 then
    raise exception 'The label or note is too long.' using errcode = '22023';
  end if;

  -- The entry UUID is the client request UUID. A retried request waits for the
  -- first attempt to commit, then takes the existing-entry path without adding
  -- its amount twice. RLS prevents reading another user's colliding UUID.
  insert into public.savings_bucket_entries(id, user_id, bucket_type, label, amount, date, note)
  values (p_request_id, owner_id, p_bucket_type, entry_label, p_amount, p_date, entry_note)
  on conflict (id) do nothing
  returning id into recorded_id;

  if recorded_id is null then
    select * into recorded_entry from public.savings_bucket_entries
    where id = p_request_id and user_id = owner_id for key share;
    if not found then
      raise exception 'This request ID is unavailable. Start a new request.' using errcode = '22023';
    end if;
    if (recorded_entry.bucket_type, recorded_entry.amount, recorded_entry.date, recorded_entry.note, recorded_entry.label)
       is distinct from (p_bucket_type, p_amount, p_date, entry_note, entry_label) then
      raise exception 'This request was already recorded with different details.' using errcode = '22023';
    end if;
    select amount into resulting_balance from public.savings_buckets
    where user_id = owner_id and bucket_type = p_bucket_type;
    return query select p_request_id, resulting_balance, true;
    return;
  end if;

  -- The database increments the latest locked balance. No application read /
  -- overwrite can lose another contribution. A failure rolls the history entry
  -- and balance change back together, including overflow and RLS failures.
  insert into public.savings_buckets as bucket(user_id, bucket_type, label, amount)
  values (owner_id, p_bucket_type, entry_label, p_amount)
  on conflict (user_id, bucket_type) do update
    set amount = bucket.amount + excluded.amount, label = excluded.label
  returning amount into resulting_balance;

  return query select p_request_id, resulting_balance, false;
end $$;

revoke all on function public.add_savings_bucket_contribution(uuid, public.savings_bucket_type, numeric, date, text, text) from public, anon;
grant execute on function public.add_savings_bucket_contribution(uuid, public.savings_bucket_type, numeric, date, text, text) to authenticated;

-- These helpers accept a target user UUID and are used only by the privileged
-- signup trigger. Do not expose cross-owner seeding/label resets through RPC.
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;
revoke all on function public.seed_savings_buckets(uuid) from public, anon, authenticated;

commit;
