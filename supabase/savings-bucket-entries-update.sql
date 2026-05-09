create table if not exists public.savings_bucket_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_type public.savings_bucket_type not null,
  label text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists savings_bucket_entries_user_id_date_idx on public.savings_bucket_entries(user_id, date desc);
create index if not exists savings_bucket_entries_user_id_bucket_idx on public.savings_bucket_entries(user_id, bucket_type);

alter table public.savings_bucket_entries enable row level security;

drop policy if exists "savings_bucket_entries_select_own" on public.savings_bucket_entries;
drop policy if exists "savings_bucket_entries_insert_own" on public.savings_bucket_entries;
drop policy if exists "savings_bucket_entries_update_own" on public.savings_bucket_entries;
drop policy if exists "savings_bucket_entries_delete_own" on public.savings_bucket_entries;

create policy "savings_bucket_entries_select_own" on public.savings_bucket_entries for select using (auth.uid() = user_id);
create policy "savings_bucket_entries_insert_own" on public.savings_bucket_entries for insert with check (auth.uid() = user_id);
create policy "savings_bucket_entries_update_own" on public.savings_bucket_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_bucket_entries_delete_own" on public.savings_bucket_entries for delete using (auth.uid() = user_id);
