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
