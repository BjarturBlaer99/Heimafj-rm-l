-- Atomic duplicate protection across different file-import batches.
-- Apply before deploying the web code that writes import_key. Existing rows
-- remain untouched; the application's preflight checks those rows as before.
begin;

alter table public.transactions add column if not exists import_key text;
alter table public.transactions drop constraint if exists transactions_import_key_format;
alter table public.transactions add constraint transactions_import_key_format
  check (import_key is null or import_key ~ '^[0-9a-f]{64}$');

create unique index if not exists transactions_user_import_key_unique
  on public.transactions(user_id, import_key) where import_key is not null;

-- Manual entries may legitimately share date, amount and description. Only
-- imports carry a key. Editing an imported transaction releases its old key;
-- a later import is compared with the current values by the server preflight.
create or replace function public.clear_changed_transaction_import_key()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.date, new.type, new.amount, new.note, new.user_id)
     is distinct from row(old.date, old.type, old.amount, old.note, old.user_id) then
    new.import_key := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_changed_transaction_import_key on public.transactions;
create trigger clear_changed_transaction_import_key
  before update on public.transactions for each row
  execute function public.clear_changed_transaction_import_key();

commit;
