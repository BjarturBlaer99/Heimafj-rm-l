-- Owner-reference integrity. Requires PostgreSQL 15 or later.
-- Apply after the existing bill/savings integrity migrations. Safe to replay.
-- Never repair mismatched records automatically; review any preflight failure.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Include parents and children so validation and installation see one state.
lock table public.categories, public.transactions, public.budgets, public.bills,
  public.savings_goals, public.savings_contributions in share row exclusive mode;

do $$
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'Owner-reference integrity requires PostgreSQL 15 or later.';
  end if;
  if exists (
    select 1 from public.transactions c join public.categories p on p.id = c.category_id where c.user_id <> p.user_id
    union all
    select 1 from public.budgets c join public.categories p on p.id = c.category_id where c.user_id <> p.user_id
    union all
    select 1 from public.bills c join public.categories p on p.id = c.category_id where c.user_id <> p.user_id
    union all
    select 1 from public.savings_contributions c join public.savings_goals p on p.id = c.savings_goal_id where c.user_id <> p.user_id
  ) then
    raise exception 'Cross-owner category or savings-goal references exist. Review the affected records before applying this migration.';
  end if;
end $$;

create unique index if not exists categories_id_user_id_unique on public.categories(id, user_id);
create unique index if not exists savings_goals_id_user_id_unique on public.savings_goals(id, user_id);

-- Composite foreign keys protect direct API and privileged writes as well as
-- application actions. PostgreSQL also locks referenced keys against races.
-- Keep the existing constraint names so PostgREST relationship hints still work.
alter table public.transactions drop constraint if exists transactions_category_id_fkey;
alter table public.transactions add constraint transactions_category_id_fkey
  foreign key (category_id, user_id) references public.categories(id, user_id)
  on delete set null (category_id);

alter table public.budgets drop constraint if exists budgets_category_id_fkey;
alter table public.budgets add constraint budgets_category_id_fkey
  foreign key (category_id, user_id) references public.categories(id, user_id)
  on delete cascade;

alter table public.bills drop constraint if exists bills_category_id_fkey;
alter table public.bills add constraint bills_category_id_fkey
  foreign key (category_id, user_id) references public.categories(id, user_id)
  on delete set null (category_id);

alter table public.savings_contributions drop constraint if exists savings_contributions_savings_goal_id_fkey;
alter table public.savings_contributions add constraint savings_contributions_savings_goal_id_fkey
  foreign key (savings_goal_id, user_id) references public.savings_goals(id, user_id)
  on delete cascade;

commit;
