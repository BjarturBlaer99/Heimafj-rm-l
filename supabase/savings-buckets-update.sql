create type public.savings_bucket_type as enum ('serignarsparnadur', 'husnaedisparnadur', 'hlutabref', 'sjodir');

create table if not exists public.savings_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_type public.savings_bucket_type not null,
  label text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bucket_type)
);

create index if not exists savings_buckets_user_id_idx on public.savings_buckets(user_id);

create trigger savings_buckets_updated_at before update on public.savings_buckets for each row execute function public.set_updated_at();

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

select public.seed_savings_buckets(id) from auth.users;

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

alter table public.savings_buckets enable row level security;

create policy "savings_buckets_select_own" on public.savings_buckets for select using (auth.uid() = user_id);
create policy "savings_buckets_insert_own" on public.savings_buckets for insert with check (auth.uid() = user_id);
create policy "savings_buckets_update_own" on public.savings_buckets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_buckets_delete_own" on public.savings_buckets for delete using (auth.uid() = user_id);
