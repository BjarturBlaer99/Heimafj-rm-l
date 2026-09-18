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
