begin;

create table if not exists public.bills (
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

alter table public.bills add column if not exists series_id uuid;
alter table public.bills add column if not exists month date;
alter table public.bills alter column series_id set default gen_random_uuid();

-- Convert each legacy recurring bill into one monthly bill. Paid historical
-- months receive their own copy so existing payment history stays visible.
do $$
declare
  legacy_bill public.bills%rowtype;
  legacy_payment record;
  monthly_bill_id uuid;
  linked_series_id uuid;
  selected_month date := date_trunc('month', current_date)::date;
begin
  for legacy_bill in
    select *
    from public.bills
    where month is null
    order by created_at, id
  loop
    linked_series_id := coalesce(legacy_bill.series_id, gen_random_uuid());

    update public.bills
    set series_id = linked_series_id,
        month = selected_month
    where id = legacy_bill.id;

    for legacy_payment in
      select id, month
      from public.bill_payments
      where bill_id = legacy_bill.id
        and month <> selected_month
      order by month
    loop
      insert into public.bills (
        user_id,
        series_id,
        category_id,
        month,
        name,
        amount,
        due_day,
        is_active,
        created_at,
        updated_at
      ) values (
        legacy_bill.user_id,
        linked_series_id,
        legacy_bill.category_id,
        legacy_payment.month,
        legacy_bill.name,
        legacy_bill.amount,
        legacy_bill.due_day,
        legacy_bill.is_active,
        legacy_bill.created_at,
        legacy_bill.updated_at
      )
      returning id into monthly_bill_id;

      update public.bill_payments
      set bill_id = monthly_bill_id
      where id = legacy_payment.id;
    end loop;
  end loop;
end
$$;

update public.bills
set series_id = gen_random_uuid()
where series_id is null;

update public.bills
set month = date_trunc('month', coalesce(created_at, now()))::date
where month is null;

alter table public.bills alter column series_id set not null;
alter table public.bills alter column month set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bills'::regclass
      and conname = 'bills_month_first_day_check'
  ) then
    alter table public.bills
      add constraint bills_month_first_day_check check (extract(day from month) = 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bills'::regclass
      and conname = 'bills_user_series_month_key'
  ) then
    alter table public.bills
      add constraint bills_user_series_month_key unique (user_id, series_id, month);
  end if;
end
$$;

create index if not exists bills_user_id_idx on public.bills(user_id);
create index if not exists bills_user_id_month_idx on public.bills(user_id, month);
create index if not exists bills_user_id_series_idx on public.bills(user_id, series_id);
create index if not exists bills_user_id_month_active_idx on public.bills(user_id, month, is_active);
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

commit;
